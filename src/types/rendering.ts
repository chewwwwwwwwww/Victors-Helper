import type { ChordReference, BarNotation } from "./song";

/** Font metrics for monospace rendering */
export interface FontMetrics {
  /** Width of a single character in pixels */
  charWidth: number;
  /** Line height in pixels */
  lineHeight: number;
  /** Font size in pixels */
  fontSize: number;
  /** Height of chord row above lyrics */
  chordRowHeight: number;
}

/** A chord positioned for rendering */
export interface RenderedChord {
  /** Display symbol (with unicode accidentals if formatted) */
  symbol: string;
  /** Horizontal pixel position from line start */
  x: number;
  /** Width of rendered chord in pixels */
  width: number;
  /** Original character anchor index */
  anchorIndex: number;
  /** Reference back to data model */
  chordRef: ChordReference;
  /** Currently selected? */
  isSelected: boolean;
  /** Currently being dragged? */
  isDragging: boolean;
  /** Was nudged due to collision resolution? */
  wasNudged: boolean;
}

/** A rendered line with positioned chords */
export interface RenderedLine {
  /** Line ID for reference */
  lineId: string;
  /** Lyrics text */
  lyrics: string;
  /** Positioned chords for this line */
  chords: RenderedChord[];
  /** Total height of this line (chord row + lyric row) */
  height: number;
  /** Y position from document top */
  y: number;
  /** Whether this line has any chords */
  hasChords: boolean;
  /** Optional bar notation (for instrumental sections) */
  barNotation?: BarNotation;
}

/** Complete render layout for the document */
export interface RenderLayout {
  lines: RenderedLine[];
  totalHeight: number;
  containerWidth: number;
}

/** Drag state for chord repositioning */
export interface DragState {
  isDragging: boolean;
  chordRef: ChordReference | null;
  startX: number;
  currentX: number;
  startCharIndex: number;
  currentCharIndex: number;
  lineId: string;
}
