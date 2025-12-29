import { useMemo } from "react";
import type { Song } from "../types";
import type { ExportOptions } from "../types/ui";
import type { RenderedLine } from "../types/rendering";
import { computeLayout, DEFAULT_FONT_METRICS } from "../lib/layout-engine";
import { BarNotationDisplay } from "./BarNotationEditor";

/** Section header patterns (case insensitive) */
const SECTION_HEADER_PATTERNS = [
  /^(verse|chorus|bridge|intro|outro|pre-chorus|prechorus|turnaround|tag|coda|interlude|instrumental|hook|refrain|ending|vamp|solo|breakdown)\s*\d*\s*:?\s*$/i,
  /^\[.*\]$/, // Bracketed headers like [Verse 1]
  /^<.*>$/, // Angle bracket headers like <Chorus>
];

function isSectionHeader(lyrics: string): boolean {
  const trimmed = lyrics.trim();
  if (!trimmed) return false;
  return SECTION_HEADER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isEmptyLine(line: RenderedLine): boolean {
  return !line.lyrics.trim() && !line.hasChords && !line.barNotation;
}

interface Section {
  id: string;
  lines: RenderedLine[];
}

function groupLinesIntoSections(lines: RenderedLine[]): Section[] {
  const sections: Section[] = [];
  let currentSection: RenderedLine[] = [];
  let sectionIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isEmpty = isEmptyLine(line);
    const isHeader = isSectionHeader(line.lyrics);

    if (isEmpty) {
      if (currentSection.length > 0) {
        sections.push({
          id: `section-${sectionIndex++}`,
          lines: currentSection,
        });
        currentSection = [];
      }
      continue;
    }

    if (isHeader && currentSection.length > 0) {
      sections.push({
        id: `section-${sectionIndex++}`,
        lines: currentSection,
      });
      currentSection = [];
    }

    currentSection.push(line);
  }

  if (currentSection.length > 0) {
    sections.push({
      id: `section-${sectionIndex++}`,
      lines: currentSection,
    });
  }

  return sections;
}

interface PDFLineProps {
  line: RenderedLine;
  showChords: boolean;
}

function PDFLine({ line, showChords }: PDFLineProps) {
  const isHeader = isSectionHeader(line.lyrics);

  // Bar notation line
  if (line.barNotation) {
    return (
      <div className="pdf-bar-notation my-1">
        <BarNotationDisplay barNotation={line.barNotation} />
      </div>
    );
  }

  // Section header
  if (isHeader) {
    return (
      <div className="pdf-section-header text-sm font-bold uppercase mt-3 mb-1">
        {line.lyrics}
      </div>
    );
  }

  // Regular lyric line with chords
  return (
    <div className="pdf-line leading-tight">
      {showChords && line.hasChords && (
        <div className="pdf-chord-row text-sm font-bold whitespace-pre relative">
          {line.chords.map((chord) => (
            <span
              key={chord.chordRef.chordId}
              style={{ left: `${chord.x}px`, position: "absolute" }}
            >
              {chord.symbol}
            </span>
          ))}
        </div>
      )}
      <div className="pdf-lyric-row text-sm">{line.lyrics || "\u00A0"}</div>
    </div>
  );
}

interface PDFLayoutProps {
  song: Song;
  options: ExportOptions;
  logoUrl?: string;
}

export function PDFLayout({ song, options, logoUrl }: PDFLayoutProps) {
  // Compute layout - pass includeChords to collapse spacing when hidden
  const layout = useMemo(() => {
    return computeLayout(
      song,
      DEFAULT_FONT_METRICS,
      [],
      null,
      "auto",
      options.includeChords,
    );
  }, [song, options.includeChords]);

  // Group lines into sections
  const sections = useMemo(() => {
    return groupLinesIntoSections(layout.lines);
  }, [layout.lines]);

  // Split sections into columns if needed
  const { leftSections, rightSections } = useMemo(() => {
    if (options.columnCount === 1) {
      return { leftSections: sections, rightSections: [] };
    }

    // Auto-balance columns by splitting roughly in half
    const midpoint = Math.ceil(sections.length / 2);
    return {
      leftSections: sections.slice(0, midpoint),
      rightSections: sections.slice(midpoint),
    };
  }, [sections, options.columnCount]);

  return (
    <div
      className="pdf-layout bg-white text-gray-900"
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        padding: `${options.margin}mm`,
        backgroundColor: "#ffffff",
        color: "#1f2937",
      }}
    >
      {/* Header: Metadata + Logo */}
      <div className="pdf-header flex justify-between items-start mb-4">
        {/* Metadata (left) */}
        {options.includeMetadata && (
          <div className="pdf-metadata flex-1">
            {options.includeTitle && song.title && (
              <h1 className="text-xl font-bold italic mb-1">{song.title}</h1>
            )}
            {song.songwriters && song.songwriters.length > 0 && (
              <p className="text-xs text-gray-600">
                {song.songwriters.join(" | ")}
              </p>
            )}
            {song.album && (
              <p className="text-xs text-gray-600">Album: {song.album}</p>
            )}
            {song.recordedBy && (
              <p className="text-xs text-gray-600">
                Recorded by: {song.recordedBy}
              </p>
            )}
            {(song.key || song.tempo || song.timeSignature) && (
              <p className="text-xs font-semibold mt-1">
                {song.key && `Key - ${song.key}`}
                {song.key && song.tempo && " | "}
                {song.tempo && `Tempo - ${song.tempo}`}
                {(song.key || song.tempo) && song.timeSignature && " | "}
                {song.timeSignature && `Time - ${song.timeSignature}`}
              </p>
            )}
          </div>
        )}

        {/* Title only (if not showing full metadata) */}
        {!options.includeMetadata && options.includeTitle && song.title && (
          <h1 className="text-xl font-bold italic mb-1 flex-1">{song.title}</h1>
        )}

        {/* Logo (right) */}
        <div className="pdf-logo shrink-0 ml-4">
          <img
            src={logoUrl || "/logo.png"}
            alt="Logo"
            className="h-10 w-auto object-contain"
            crossOrigin="anonymous"
          />
        </div>
      </div>

      {/* Content: Columns */}
      <div
        className="pdf-content"
        style={{
          display: options.columnCount === 2 ? "grid" : "block",
          gridTemplateColumns: options.columnCount === 2 ? "1fr 1fr" : "1fr",
          gap: "2rem",
        }}
      >
        {/* Left Column */}
        <div className="pdf-column-left">
          {leftSections.map((section) => (
            <div key={section.id} className="pdf-section mb-4">
              {section.lines.map((line) => (
                <PDFLine
                  key={line.lineId}
                  line={line}
                  showChords={options.includeChords}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Right Column */}
        {options.columnCount === 2 && rightSections.length > 0 && (
          <div className="pdf-column-right">
            {rightSections.map((section) => (
              <div key={section.id} className="pdf-section mb-4">
                {section.lines.map((line) => (
                  <PDFLine
                    key={line.lineId}
                    line={line}
                    showChords={options.includeChords}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer: CCLI info */}
      {options.includeFooter &&
        (song.ccliSongNumber || song.publisher || song.copyright) && (
          <div className="pdf-footer text-center text-xs text-gray-500 border-t border-gray-200 pt-2 mt-4">
            {song.ccliSongNumber && (
              <p>
                <strong>CCLI Song Number:</strong> {song.ccliSongNumber}
              </p>
            )}
            {song.publisher && (
              <p>
                <strong>Publisher:</strong> {song.publisher}
                {song.songwriters &&
                  song.songwriters.length > 0 &&
                  `, Writers: ${song.songwriters.join(", ")}`}
              </p>
            )}
            {song.recordedBy && (
              <p>
                <strong>Artists:</strong> {song.recordedBy}
                {song.album && `, Album: ${song.album}`}
              </p>
            )}
          </div>
        )}
    </div>
  );
}
