/** The 12 chromatic note names */
export type NaturalNote = "C" | "D" | "E" | "F" | "G" | "A" | "B";

/** Accidental types */
export type Accidental = "#" | "b" | "";

/** Full note name with possible accidental */
export type NoteName =
  | "C"
  | "C#"
  | "Db"
  | "D"
  | "D#"
  | "Eb"
  | "E"
  | "F"
  | "F#"
  | "Gb"
  | "G"
  | "G#"
  | "Ab"
  | "A"
  | "A#"
  | "Bb"
  | "B";

/** Chord quality types */
export type ChordQuality =
  | "major"
  | "minor"
  | "diminished"
  | "augmented"
  | "sus2"
  | "sus4"
  | "power"
  | "dominant7"
  | "major7"
  | "minor7"
  | "diminished7"
  | "halfDiminished7"
  | "augmented7";

/** Parsed chord structure */
export interface ParsedChord {
  /** Root note (C, F#, Bb, etc.) */
  root: NoteName;
  /** Base quality of the chord */
  quality: ChordQuality;
  /** The suffix after the root (e.g., "m7", "maj7", "sus4") */
  suffix: string;
  /** Bass note for slash chords (e.g., the G in C/G) */
  bass?: NoteName;
  /** Original input string preserved exactly */
  originalSymbol: string;
  /** Whether parsing was successful */
  isValid: boolean;
}

/** Accidental preference for transposition output */
export type AccidentalPreference = "sharps" | "flats" | "auto";

/** Result of a transposition operation */
export interface TransposedChord {
  /** The new chord symbol */
  symbol: string;
  /** The original chord symbol */
  original: string;
  /** Semitones transposed */
  semitones: number;
}
