/**
 * Migration utilities for converting V1 (line-based) songs to V2 (block-based) format.
 */

import type {
  Song,
  SongV2,
  Block,
  SectionBlock,
  ChordLyricsBlock,
  BarNotationBlock,
  SectionType,
  Line,
} from "../types/song";

/** Section header patterns (case insensitive) */
const SECTION_HEADER_PATTERNS = [
  /^(verse|chorus|bridge|intro|outro|pre-chorus|prechorus|turnaround|tag|coda|interlude|instrumental|hook|refrain|ending|vamp|solo|breakdown)\s*\d*\s*:?\s*$/i,
  /^\[.*\]$/, // Bracketed headers like [Verse 1]
  /^<.*>$/, // Angle bracket headers like <Chorus>
];

/**
 * Check if a lyrics string is a section header
 */
function isSectionHeader(lyrics: string): boolean {
  const trimmed = lyrics.trim();
  if (!trimmed) return false;
  return SECTION_HEADER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Extract section type from a header string
 */
function extractSectionType(header: string): SectionType {
  const lower = header.toLowerCase();

  if (lower.includes("intro")) return "intro";
  if (lower.includes("verse")) return "verse";
  if (lower.includes("chorus")) return "chorus";
  if (lower.includes("bridge")) return "bridge";
  if (lower.includes("pre-chorus") || lower.includes("prechorus"))
    return "pre-chorus";
  if (lower.includes("outro") || lower.includes("ending")) return "outro";
  if (lower.includes("interlude")) return "interlude";
  if (
    lower.includes("instrumental") ||
    lower.includes("solo") ||
    lower.includes("breakdown")
  )
    return "instrumental";
  if (lower.includes("tag") || lower.includes("turnaround")) return "tag";
  if (lower.includes("coda")) return "coda";

  return "custom";
}

/**
 * Clean up a section header label (remove brackets, colons, etc.)
 */
function cleanSectionLabel(header: string): string {
  return header
    .trim()
    .replace(/^\[|\]$/g, "") // Remove [ ]
    .replace(/^<|>$/g, "") // Remove < >
    .replace(/:$/, "") // Remove trailing colon
    .trim();
}

/**
 * Check if a line is empty (no content)
 */
function isEmptyLine(line: Line): boolean {
  return (
    !line.lyrics.trim() && line.chords.length === 0 && !line.barNotation?.bars
  );
}

/**
 * Convert a V1 Line to a content block
 */
function lineToContentBlock(line: Line): ChordLyricsBlock | BarNotationBlock {
  // If line has bar notation, create a bar notation block
  if (line.barNotation && line.barNotation.bars.length > 0) {
    return {
      id: line.id,
      type: "barNotationLine",
      barNotation: line.barNotation,
    };
  }

  // Otherwise, create a chord/lyrics block
  return {
    id: line.id,
    type: "chordLyricsLine",
    lyrics: line.lyrics,
    chords: [...line.chords],
  };
}

/**
 * Migrate a V1 song to V2 format
 * Groups consecutive lines into sections based on empty lines and section headers
 */
export function migrateV1ToV2(song: Song): SongV2 {
  const blocks: Block[] = [];
  let currentSection: SectionBlock | null = null;

  for (let i = 0; i < song.lines.length; i++) {
    const line = song.lines[i];
    const isEmpty = isEmptyLine(line);
    const isHeader = isSectionHeader(line.lyrics);

    // Empty lines are section separators
    if (isEmpty) {
      // Save current section if it has content
      if (currentSection && currentSection.children.length > 0) {
        blocks.push(currentSection);
        currentSection = null;
      }
      continue; // Skip empty lines
    }

    // Section headers start new sections
    if (isHeader) {
      // Save current section if it has content
      if (currentSection && currentSection.children.length > 0) {
        blocks.push(currentSection);
      }

      // Create new section with header as label
      currentSection = {
        id: crypto.randomUUID(),
        type: "section",
        label: cleanSectionLabel(line.lyrics),
        sectionType: extractSectionType(line.lyrics),
        children: [],
      };
      continue;
    }

    // Convert line to content block
    const contentBlock = lineToContentBlock(line);

    // Add to current section or as orphan block
    if (currentSection) {
      currentSection.children.push(contentBlock);
    } else {
      // No current section - add as orphan block at root level
      blocks.push(contentBlock);
    }
  }

  // Don't forget the last section
  if (currentSection && currentSection.children.length > 0) {
    blocks.push(currentSection);
  }

  // Build the V2 song
  const songV2: SongV2 = {
    id: song.id,
    version: 2,

    // Copy metadata
    title: song.title,
    songwriters: song.songwriters,
    album: song.album,
    recordedBy: song.recordedBy,
    key: song.key,
    tempo: song.tempo,
    timeSignature: song.timeSignature,
    ccliSongNumber: song.ccliSongNumber,
    publisher: song.publisher,
    copyright: song.copyright,

    // Timestamps
    createdAt: song.createdAt,
    updatedAt: new Date().toISOString(),

    // Transposition
    transpositionOffset: song.transpositionOffset,

    // New block structure
    blocks,

    // Migrate column assignments if they exist
    // Note: Old section IDs were like "section-0", "section-1" etc.
    // We need to map them to new block IDs based on position
    columnAssignments: undefined, // Will be rebuilt as user assigns columns
    sectionOrder: undefined, // Will be rebuilt as user reorders
  };

  return songV2;
}

/**
 * Create a new empty V2 song
 */
export function createEmptySongV2(): SongV2 {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    version: 2,
    title: "Untitled Song",
    createdAt: now,
    updatedAt: now,
    transpositionOffset: 0,
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "section",
        label: "Verse 1",
        sectionType: "verse",
        children: [
          {
            id: crypto.randomUUID(),
            type: "chordLyricsLine",
            lyrics: "",
            chords: [],
          },
        ],
      },
    ],
  };
}

/**
 * Convert a V2 song back to V1 format (for backward compatibility/export)
 */
export function convertV2ToV1(songV2: SongV2): Song {
  const lines: Line[] = [];

  function processBlock(block: Block) {
    if (block.type === "section") {
      // Add section header as a line
      lines.push({
        id: crypto.randomUUID(),
        lyrics: `[${block.label}]`,
        chords: [],
      });

      // Add children
      for (const child of block.children) {
        processBlock(child);
      }

      // Add empty line after section
      lines.push({
        id: crypto.randomUUID(),
        lyrics: "",
        chords: [],
      });
    } else if (block.type === "chordLyricsLine") {
      lines.push({
        id: block.id,
        lyrics: block.lyrics,
        chords: [...block.chords],
      });
    } else if (block.type === "barNotationLine") {
      lines.push({
        id: block.id,
        lyrics: "",
        chords: [],
        barNotation: block.barNotation,
      });
    } else if (block.type === "freeText") {
      // Convert free text to a lyrics line
      lines.push({
        id: block.id,
        lyrics: block.text,
        chords: [],
      });
    }
  }

  for (const block of songV2.blocks) {
    processBlock(block);
  }

  // Remove trailing empty lines
  while (lines.length > 0 && !lines[lines.length - 1].lyrics.trim()) {
    lines.pop();
  }

  return {
    id: songV2.id,
    title: songV2.title,
    songwriters: songV2.songwriters,
    album: songV2.album,
    recordedBy: songV2.recordedBy,
    key: songV2.key,
    tempo: songV2.tempo,
    timeSignature: songV2.timeSignature,
    ccliSongNumber: songV2.ccliSongNumber,
    publisher: songV2.publisher,
    copyright: songV2.copyright,
    createdAt: songV2.createdAt,
    updatedAt: songV2.updatedAt,
    transpositionOffset: songV2.transpositionOffset,
    lines,
    columnAssignments: songV2.columnAssignments,
    sectionOrder: songV2.sectionOrder,
  };
}
