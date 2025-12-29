/** Unique identifier for songs, lines, chords, and blocks */
export type UUID = string;

// =============================================================================
// BLOCK TYPES (V2 Data Model)
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
// CHORD AND LINE TYPES (shared between V1 and V2)
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

/** A single line of lyrics with associated chords */
export interface Line {
  id: UUID;
  /** The lyric text (may be empty for instrumental sections) */
  lyrics: string;
  /** Chords anchored to this line, sorted by charIndex */
  chords: Chord[];
  /** Optional bar notation for instrumental sections */
  barNotation?: BarNotation;
}

/** A complete song document */
export interface Song {
  id: UUID;
  /** Song title */
  title?: string;
  /** Songwriters/composers (e.g., ["Beci Wakerley", "David Wakerley"]) */
  songwriters?: string[];
  /** Album name with optional year (e.g., "Tell The World (2007)") */
  album?: string;
  /** Artist who recorded/performed (e.g., "Hillsong Kids") */
  recordedBy?: string;
  /** Song key (e.g., "C", "Am", "F#m") */
  key?: string;
  /** Tempo in BPM (e.g., 182) */
  tempo?: number;
  /** Time signature (e.g., "4/4", "3/4", "6/8") */
  timeSignature?: string;
  /** CCLI Song Number for licensing */
  ccliSongNumber?: string;
  /** Music publisher */
  publisher?: string;
  /** Copyright notice */
  copyright?: string;
  /** Manual column assignments for sections (sectionId -> column) */
  columnAssignments?: Record<string, "left" | "right">;
  /** Section order within each column (array of section IDs) */
  sectionOrder?: {
    left?: string[];
    right?: string[];
  };
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last modification */
  updatedAt: string;
  /** The lines of the song in order */
  lines: Line[];
  /** Current transposition offset in semitones from original */
  transpositionOffset: number;

  // Legacy field - kept for backward compatibility
  /** @deprecated Use songwriters instead */
  artist?: string;
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
  lineCount: number;
  /** @deprecated Use songwriters instead */
  artist?: string;
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

// =============================================================================
// V2 SONG FORMAT (Block-based)
// =============================================================================

/** Schema version for migration detection */
export type SongVersion = 1 | 2;

/** V2 Song document with explicit block structure */
export interface SongV2 {
  id: UUID;
  /** Schema version - always 2 for V2 songs */
  version: 2;

  // Metadata (same as V1)
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

  // Legacy fields - kept for backward compatibility during migration
  /** @deprecated V1 field - use blocks instead */
  lines?: Line[];
  /** @deprecated Use songwriters instead */
  artist?: string;
}

/** Union type for any song version */
export type AnySong = Song | SongV2;

/** Type guard to check if a song is V2 format */
export function isSongV2(song: AnySong): song is SongV2 {
  return "version" in song && song.version === 2;
}

/** Type guard to check if a song needs migration */
export function needsMigration(song: AnySong): song is Song {
  return !("version" in song) || (song as SongV2).version !== 2;
}
