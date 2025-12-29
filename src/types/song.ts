/** Unique identifier for songs, lines, chords, and blocks */
export type UUID = string;

// =============================================================================
// BLOCK TYPES
// =============================================================================

/** Block type discriminator */
export type BlockType =
  | "section"
  | "chordLyricsLine"
  | "barNotationLine"
  | "freeText";

/** Standard section types for styling/categorization */
export type SectionType =
  | "intro"
  | "verse"
  | "chorus"
  | "bridge"
  | "pre-chorus"
  | "outro"
  | "interlude"
  | "instrumental"
  | "tag"
  | "coda"
  | "custom";

/** Base block interface - all blocks have an id and type */
export interface BaseBlock {
  id: UUID;
  type: BlockType;
}

/** A section block containing child blocks */
export interface SectionBlock extends BaseBlock {
  type: "section";
  /** Section label displayed as header (e.g., "Verse 1", "Chorus", "Bridge") */
  label: string;
  /** Standard section type for styling/categorization */
  sectionType?: SectionType;
  /** Child blocks within this section */
  children: ContentBlock[];
}

/** A chord & lyrics line block */
export interface ChordLyricsBlock extends BaseBlock {
  type: "chordLyricsLine";
  /** The lyric text */
  lyrics: string;
  /** Chords anchored to this line, sorted by charIndex */
  chords: Chord[];
}

/** A bar notation block for instrumental sections */
export interface BarNotationBlock extends BaseBlock {
  type: "barNotationLine";
  /** Bar notation data */
  barNotation: BarNotation;
}

/** A free text block without chord/lyric constraints */
export interface FreeTextBlock extends BaseBlock {
  type: "freeText";
  /** Plain text content */
  text: string;
}

/** Union of content blocks (can exist inside sections or at root) */
export type ContentBlock = ChordLyricsBlock | BarNotationBlock | FreeTextBlock;

/** Union of all block types */
export type Block = SectionBlock | ContentBlock;

// =============================================================================
// CHORD TYPES
// =============================================================================

/** A chord positioned above lyrics at a specific character index */
export interface Chord {
  id: UUID;
  /** The chord symbol as stored (e.g., "Ab", "F#m7", "Cmaj7/E") */
  chord: string;
  /** 0-based character index in the lyrics string where chord anchors */
  charIndex: number;
}

/** Bar notation for instrumental sections (e.g., ||:C |C |C :||) */
export interface BarNotation {
  /** Array of chord symbols, one per bar */
  bars: string[];
  /** Whether to show repeat start sign ||: */
  repeatStart: boolean;
  /** Whether to show repeat end sign :|| */
  repeatEnd: boolean;
}

// =============================================================================
// SONG TYPE (Block-based)
// =============================================================================

/** A complete song document */
export interface Song {
  id: UUID;
  /** Schema version - always 2 */
  version: 2;

  // Metadata
  title?: string;
  songwriters?: string[];
  album?: string;
  recordedBy?: string;
  key?: string;
  tempo?: number;
  timeSignature?: string;
  ccliSongNumber?: string;
  publisher?: string;
  copyright?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  /** Current transposition offset in semitones from original */
  transpositionOffset: number;

  /** Top-level blocks (sections and orphan content blocks) */
  blocks: Block[];

  /** Column layout for two-column view */
  columnAssignments?: Record<UUID, "left" | "right">;
  sectionOrder?: {
    left?: UUID[];
    right?: UUID[];
  };
}

/** Reference to a specific chord in a song */
export interface ChordReference {
  lineId: UUID;
  chordId: UUID;
}

/** Saved song metadata for list display */
export interface SongMetadata {
  id: UUID;
  title?: string;
  songwriters?: string[];
  key?: string;
  tempo?: number;
  timeSignature?: string;
  createdAt: string;
  updatedAt: string;
  blockCount: number;
}

/** Editable metadata fields (subset of Song that can be updated via MetadataPanel) */
export interface EditableSongMetadata {
  title?: string;
  songwriters?: string[];
  album?: string;
  recordedBy?: string;
  key?: string;
  tempo?: number;
  timeSignature?: string;
  ccliSongNumber?: string;
  publisher?: string;
  copyright?: string;
}
