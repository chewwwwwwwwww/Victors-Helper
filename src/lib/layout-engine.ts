import type { Song, Line, ChordReference } from "../types";
import type {
  FontMetrics,
  RenderLayout,
  RenderedLine,
  RenderedChord,
} from "../types/rendering";
import { getTransposedSymbol } from "./transposition";
import { formatChordDisplay } from "./accidental-display";
import type { AccidentalPreference } from "../types/chord-theory";

/** Default font metrics for layout */
export const DEFAULT_FONT_METRICS: FontMetrics = {
  charWidth: 9.6,
  lineHeight: 24,
  fontSize: 16,
  chordRowHeight: 28,
};

/** Minimum spacing between chords in characters */
const MIN_CHORD_SPACING_CHARS = 1;

/**
 * Compute the complete render layout for a song.
 */
export function computeLayout(
  song: Song,
  fontMetrics: FontMetrics = DEFAULT_FONT_METRICS,
  selectedChords: ChordReference[] = [],
  draggedChord: ChordReference | null = null,
  accidentalPreference: AccidentalPreference = "auto",
  chordsVisible: boolean = true,
): RenderLayout {
  const lines: RenderedLine[] = [];
  let currentY = 0;

  for (const line of song.lines) {
    const hasChords = line.chords.length > 0;
    // Only add chord row height when chords are visible
    const lineHeight =
      hasChords && chordsVisible
        ? fontMetrics.chordRowHeight + fontMetrics.lineHeight
        : fontMetrics.lineHeight;

    const renderedLine = computeLineLayout(
      line,
      song.transpositionOffset,
      fontMetrics,
      selectedChords,
      draggedChord,
      currentY,
      accidentalPreference,
    );

    lines.push({
      ...renderedLine,
      height: lineHeight,
      y: currentY,
      hasChords,
    });

    currentY += lineHeight;
  }

  return {
    lines,
    totalHeight: currentY,
    containerWidth: 0, // Will be set by container
  };
}

/**
 * Compute layout for a single line.
 */
function computeLineLayout(
  line: Line,
  transpositionOffset: number,
  fontMetrics: FontMetrics,
  selectedChords: ChordReference[],
  draggedChord: ChordReference | null,
  y: number,
  accidentalPreference: AccidentalPreference,
): RenderedLine {
  // Transpose and format chords
  const rawChords = line.chords.map((chord) => {
    const transposed = getTransposedSymbol(
      chord.chord,
      transpositionOffset,
      accidentalPreference,
    );
    const formatted = formatChordDisplay(transposed);

    return {
      id: chord.id,
      symbol: formatted,
      anchorIndex: chord.charIndex,
      x: chord.charIndex * fontMetrics.charWidth,
      width: formatted.length * fontMetrics.charWidth,
      isSelected: selectedChords.some(
        (ref) => ref.lineId === line.id && ref.chordId === chord.id,
      ),
      isDragging:
        draggedChord?.lineId === line.id && draggedChord?.chordId === chord.id,
    };
  });

  // Sort by position
  rawChords.sort((a, b) => a.x - b.x);

  // Resolve collisions
  const resolvedChords = resolveCollisions(rawChords, fontMetrics);

  // Build final rendered chords
  const renderedChords: RenderedChord[] = resolvedChords.map((chord) => ({
    symbol: chord.symbol,
    x: chord.x,
    width: chord.width,
    anchorIndex: chord.anchorIndex,
    chordRef: { lineId: line.id, chordId: chord.id },
    isSelected: chord.isSelected,
    isDragging: chord.isDragging,
    wasNudged: chord.wasNudged || false,
  }));

  return {
    lineId: line.id,
    lyrics: line.lyrics,
    chords: renderedChords,
    height: 0, // Set by caller
    y,
    hasChords: line.chords.length > 0,
    barNotation: line.barNotation,
  };
}

interface ChordPosition {
  id: string;
  symbol: string;
  anchorIndex: number;
  x: number;
  width: number;
  isSelected: boolean;
  isDragging: boolean;
  wasNudged?: boolean;
}

/**
 * Resolve chord collisions by nudging overlapping chords.
 */
function resolveCollisions(
  chords: ChordPosition[],
  fontMetrics: FontMetrics,
): ChordPosition[] {
  if (chords.length <= 1) return chords;

  const result: ChordPosition[] = [];
  const minSpacing = MIN_CHORD_SPACING_CHARS * fontMetrics.charWidth;

  for (let i = 0; i < chords.length; i++) {
    const chord = { ...chords[i] };

    if (i > 0) {
      const prev = result[i - 1];
      const minX = prev.x + prev.width + minSpacing;

      if (chord.x < minX) {
        chord.x = minX;
        chord.wasNudged = true;
      }
    }

    result.push(chord);
  }

  return result;
}

/**
 * Measure the width of a chord symbol in pixels.
 */
export function measureChordWidth(symbol: string, charWidth: number): number {
  // Account for unicode symbols (♭, ♯) as single characters
  const formatted = formatChordDisplay(symbol);
  return formatted.length * charWidth;
}

/**
 * Get the Y position of the chord row for a line.
 */
export function getChordRowY(lineY: number): number {
  return lineY;
}

/**
 * Get the Y position of the lyrics for a line.
 */
export function getLyricsY(lineY: number, chordRowHeight: number): number {
  return lineY + chordRowHeight;
}

/**
 * Find which character index a pixel X position corresponds to.
 */
export function pixelXToCharIndex(
  pixelX: number,
  charWidth: number,
  maxLength: number,
): number {
  const rawIndex = Math.round(pixelX / charWidth);
  return Math.max(0, Math.min(rawIndex, maxLength));
}

/**
 * Find which line a pixel Y position corresponds to.
 */
export function pixelYToLineIndex(
  pixelY: number,
  layout: RenderLayout,
): number {
  for (let i = 0; i < layout.lines.length; i++) {
    const line = layout.lines[i];
    if (pixelY >= line.y && pixelY < line.y + line.height) {
      return i;
    }
  }
  return layout.lines.length - 1;
}

/**
 * Check if a point is within the chord row of a line.
 */
export function isInChordRow(
  pixelY: number,
  lineY: number,
  chordRowHeight: number,
): boolean {
  return pixelY >= lineY && pixelY < lineY + chordRowHeight;
}

/**
 * Check if a point is within the lyrics row of a line.
 */
export function isInLyricsRow(
  pixelY: number,
  lineY: number,
  chordRowHeight: number,
  lineHeight: number,
): boolean {
  const lyricsY = lineY + chordRowHeight;
  return pixelY >= lyricsY && pixelY < lyricsY + lineHeight;
}
