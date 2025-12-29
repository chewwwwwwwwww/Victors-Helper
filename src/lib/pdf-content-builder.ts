import type { ExportOptions, AnySong, Line } from "../types";
import { transposeChord } from "./transposition";

/** Check if a line is a section header */
function isSectionHeader(lyrics: string): boolean {
  const trimmed = lyrics.trim();
  if (!trimmed) return false;
  const patterns = [
    /^(verse|chorus|bridge|intro|outro|pre-chorus|prechorus|turnaround|tag|coda|interlude|instrumental|hook|refrain|ending|vamp|solo|breakdown)\s*\d*\s*:?\s*$/i,
    /^\[.*\]$/,
    /^<.*>$/,
  ];
  return patterns.some((p) => p.test(trimmed));
}

/** Create a styled element */
function createElement(
  tag: string,
  styles: Record<string, string>,
  text?: string,
): HTMLElement {
  const el = document.createElement(tag);
  Object.assign(el.style, styles);
  if (text !== undefined) {
    el.textContent = text;
  }
  return el;
}

/** Group lines into sections */
function groupIntoSections(lines: Line[]): Line[][] {
  const sections: Line[][] = [];
  let current: Line[] = [];

  for (const line of lines) {
    const isEmpty =
      !line.lyrics.trim() && line.chords.length === 0 && !line.barNotation;
    const isHeader = isSectionHeader(line.lyrics);

    if (isEmpty) {
      if (current.length > 0) {
        sections.push(current);
        current = [];
      }
      continue;
    }

    if (isHeader && current.length > 0) {
      sections.push(current);
      current = [];
    }

    current.push(line);
  }

  if (current.length > 0) {
    sections.push(current);
  }

  return sections;
}

/** Build a chord line with proper spacing */
function buildChordLine(line: Line, transpositionOffset: number): string {
  if (line.chords.length === 0) return "";

  const sortedChords = [...line.chords].sort(
    (a, b) => a.charIndex - b.charIndex,
  );

  let result = "";
  let lastEnd = 0;

  for (const chord of sortedChords) {
    const pos = chord.charIndex;
    const symbol =
      transpositionOffset !== 0
        ? transposeChord(chord.chord, transpositionOffset).symbol
        : chord.chord;

    if (pos > lastEnd) {
      result += " ".repeat(pos - lastEnd);
    }

    result += symbol;
    lastEnd = pos + symbol.length;
  }

  return result;
}

/** Render a section */
function renderSection(
  sectionLines: Line[],
  song: AnySong,
  options: ExportOptions,
): HTMLElement {
  const section = createElement("div", {
    marginBottom: "16px",
    breakInside: "avoid",
  });

  for (const line of sectionLines) {
    // Handle bar notation - skip when chords are hidden
    if (line.barNotation) {
      if (!options.includeChords) {
        continue; // Skip bar notation lines when chords are off
      }
      const { bars, repeatStart, repeatEnd } = line.barNotation;
      const transposedBars = bars.map((chord) =>
        chord && song.transpositionOffset !== 0
          ? transposeChord(chord, song.transpositionOffset).symbol
          : chord,
      );
      const barStr = `${repeatStart ? "||:" : ""}${transposedBars.join(" |")} ${repeatEnd ? ":||" : ""}`;
      const barDiv = createElement(
        "div",
        {
          fontSize: "14px",
          fontWeight: "bold",
          color: "#2563eb",
          margin: "4px 0",
        },
        barStr,
      );
      section.appendChild(barDiv);
      continue;
    }

    // Section header
    if (isSectionHeader(line.lyrics)) {
      const headerDiv = createElement(
        "div",
        {
          fontSize: "14px",
          fontWeight: "bold",
          textTransform: "uppercase",
          margin: "12px 0 4px 0",
          color: "#1f2937",
        },
        line.lyrics,
      );
      section.appendChild(headerDiv);
      continue;
    }

    // Only show chord line when chords are enabled - collapse spacing when hidden
    const hasChords = line.chords.length > 0;
    const showChords = hasChords && options.includeChords;

    if (showChords) {
      const chordText = buildChordLine(line, song.transpositionOffset);
      const chordDiv = createElement(
        "div",
        {
          fontSize: "14px",
          fontWeight: "bold",
          color: "#2563eb",
          whiteSpace: "pre",
          height: "18px",
        },
        chordText || "\u00A0",
      );
      section.appendChild(chordDiv);
    }

    // Lyrics line
    const lyricsDiv = createElement(
      "div",
      {
        fontSize: "13px",
        whiteSpace: "pre-wrap",
        color: "#1f2937",
        lineHeight: "1.3",
      },
      line.lyrics || "\u00A0",
    );
    section.appendChild(lyricsDiv);
  }

  return section;
}

/** Paper sizes in mm */
export const PAPER_SIZES = {
  letter: { width: 215.9, height: 279.4 },
  a4: { width: 210, height: 297 },
};

/** Convert mm to pixels at 96 DPI */
export const MM_TO_PIXELS = 96 / 25.4;

/** Get page dimensions based on options */
export function getPageDimensions(options: ExportOptions): {
  width: number;
  height: number;
  marginPx: number;
} {
  const paper = PAPER_SIZES[options.paperSize];
  const [width, height] =
    options.orientation === "portrait"
      ? [paper.width, paper.height]
      : [paper.height, paper.width];

  return {
    width,
    height,
    marginPx: options.margin * MM_TO_PIXELS,
  };
}

/**
 * Build PDF content as a full-page container.
 * The container is sized to the full page, with margin as internal padding.
 * Uses flexbox to push the footer to the bottom.
 */
export function buildPDFContent(
  song: AnySong,
  options: ExportOptions,
  logoUrl?: string,
): HTMLElement {
  const { width, height, marginPx } = getPageDimensions(options);
  const pageWidthPx = width * MM_TO_PIXELS;
  const pageHeightPx = height * MM_TO_PIXELS;

  // Main container - represents the FULL PAGE
  // Uses flexbox column layout to push footer to bottom
  const container = createElement("div", {
    width: `${pageWidthPx}px`,
    height: `${pageHeightPx}px`,
    padding: `${marginPx}px`,
    boxSizing: "border-box",
    fontFamily: "'Courier New', Courier, monospace",
    color: "#1f2937",
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
  });

  // Header section with metadata and logo
  const header = createElement("div", {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
    flexShrink: "0",
  });

  // Left side - metadata
  const metadataDiv = createElement("div", { flex: "1" });

  // Title
  if (options.includeTitle && song.title) {
    const title = createElement(
      "h1",
      {
        fontSize: "24px",
        fontWeight: "bold",
        fontStyle: "italic",
        margin: "0 0 8px 0",
        color: "#1f2937",
      },
      song.title,
    );
    metadataDiv.appendChild(title);
  }

  // Metadata section
  if (options.includeMetadata) {
    if (song.songwriters && song.songwriters.length > 0) {
      const writers = createElement(
        "p",
        { fontSize: "11px", color: "#4b5563", margin: "2px 0" },
        song.songwriters.join(" | "),
      );
      metadataDiv.appendChild(writers);
    }
    if (song.album) {
      const album = createElement(
        "p",
        { fontSize: "11px", color: "#4b5563", margin: "2px 0" },
        `Album: ${song.album}`,
      );
      metadataDiv.appendChild(album);
    }
    if (song.recordedBy) {
      const recorded = createElement(
        "p",
        { fontSize: "11px", color: "#4b5563", margin: "2px 0" },
        `Recorded by: ${song.recordedBy}`,
      );
      metadataDiv.appendChild(recorded);
    }
    const infoParts: string[] = [];
    if (song.key) {
      const displayKey =
        song.transpositionOffset !== 0
          ? transposeChord(song.key, song.transpositionOffset).symbol
          : song.key;
      infoParts.push(`Key - ${displayKey}`);
    }
    if (song.tempo) infoParts.push(`Tempo - ${song.tempo}`);
    if (song.timeSignature) infoParts.push(`Time - ${song.timeSignature}`);
    if (infoParts.length > 0) {
      const info = createElement(
        "p",
        {
          fontSize: "11px",
          fontWeight: "600",
          color: "#1f2937",
          margin: "6px 0 0 0",
        },
        infoParts.join(" | "),
      );
      metadataDiv.appendChild(info);
    }
  }

  header.appendChild(metadataDiv);

  // Right side - logo
  const logoDiv = createElement("div", {
    flexShrink: "0",
    marginLeft: "16px",
  });
  const logoImg = document.createElement("img");
  logoImg.src = logoUrl || "/logo.png";
  logoImg.alt = "Logo";
  logoImg.style.height = "48px";
  logoImg.style.width = "auto";
  logoImg.crossOrigin = "anonymous";
  logoDiv.appendChild(logoImg);

  header.appendChild(logoDiv);
  container.appendChild(header);

  // Content - sections with chords and lyrics
  // This section grows to fill available space (flex: 1)
  const columnCount = options.columnCount || 2;

  const contentGrid = createElement(
    "div",
    columnCount === 2
      ? {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          flex: "1",
          alignContent: "start",
          overflow: "hidden",
        }
      : {
          flex: "1",
          overflow: "hidden",
        },
  );

  // Group lines into sections (use empty array for V2 songs which have blocks instead)
  const sections = groupIntoSections(song.lines || []);

  // Split into columns if needed
  const midpoint = Math.ceil(sections.length / 2);
  const leftSections =
    columnCount === 2 ? sections.slice(0, midpoint) : sections;
  const rightSections = columnCount === 2 ? sections.slice(midpoint) : [];

  // Render left column
  const leftCol = createElement("div", {});
  for (const section of leftSections) {
    leftCol.appendChild(renderSection(section, song, options));
  }
  contentGrid.appendChild(leftCol);

  // Render right column
  if (columnCount === 2) {
    const rightCol = createElement("div", {});
    for (const section of rightSections) {
      rightCol.appendChild(renderSection(section, song, options));
    }
    contentGrid.appendChild(rightCol);
  }

  container.appendChild(contentGrid);

  // Footer - positioned at bottom via flexbox (marginTop: auto)
  if (
    options.includeFooter &&
    (song.ccliSongNumber || song.publisher || song.copyright)
  ) {
    const footer = createElement("div", {
      textAlign: "center",
      fontSize: "9px",
      color: "#6b7280",
      borderTop: "1px solid #e5e7eb",
      paddingTop: "8px",
      marginTop: "auto", // Push to bottom
      flexShrink: "0",
    });

    if (song.ccliSongNumber) {
      const ccli = createElement("p", { margin: "2px 0" });
      const ccliStrong = document.createElement("strong");
      ccliStrong.textContent = "CCLI Song Number: ";
      ccli.appendChild(ccliStrong);
      ccli.appendChild(document.createTextNode(song.ccliSongNumber));
      footer.appendChild(ccli);
    }

    if (song.publisher) {
      const pub = createElement("p", { margin: "2px 0" });
      const pubStrong = document.createElement("strong");
      pubStrong.textContent = "Publisher: ";
      pub.appendChild(pubStrong);
      const writers =
        song.songwriters && song.songwriters.length > 0
          ? `, Writers: ${song.songwriters.join(", ")}`
          : "";
      pub.appendChild(document.createTextNode(song.publisher + writers));
      footer.appendChild(pub);
    }

    if (song.recordedBy) {
      const artists = createElement("p", { margin: "2px 0" });
      const artistsStrong = document.createElement("strong");
      artistsStrong.textContent = "Artists: ";
      artists.appendChild(artistsStrong);
      const album = song.album ? `, Album: ${song.album}` : "";
      artists.appendChild(document.createTextNode(song.recordedBy + album));
      footer.appendChild(artists);
    }

    container.appendChild(footer);
  }

  return container;
}
