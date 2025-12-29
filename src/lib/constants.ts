import type { NoteName } from "../types";

/** Chromatic scale using sharps */
export const CHROMATIC_SHARPS: NoteName[] = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

/** Chromatic scale using flats */
export const CHROMATIC_FLATS: NoteName[] = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

/** Map note names to semitone values (0-11) */
export const NOTE_TO_SEMITONE: Record<NoteName, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

/** Keys that prefer sharps */
export const SHARP_KEYS: NoteName[] = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#",
];

/** Keys that prefer flats */
export const FLAT_KEYS: NoteName[] = ["F", "Bb", "Eb", "Ab", "Db", "Gb"];

/** Common chord quality patterns for parsing */
export const QUALITY_PATTERNS: { pattern: RegExp; quality: string }[] = [
  // Major 7 variants (must come before minor patterns)
  { pattern: /^maj7/, quality: "maj7" },
  { pattern: /^M7/, quality: "maj7" },
  { pattern: /^Δ7?/, quality: "maj7" },
  { pattern: /^maj9/, quality: "maj9" },
  { pattern: /^maj13/, quality: "maj13" },

  // Minor patterns
  { pattern: /^min/, quality: "min" },
  { pattern: /^m(?!aj)/, quality: "m" },
  { pattern: /^-(?!\d)/, quality: "m" },

  // Diminished
  { pattern: /^dim/, quality: "dim" },
  { pattern: /^o(?![\d])/, quality: "dim" },
  { pattern: /^°/, quality: "dim" },

  // Augmented
  { pattern: /^aug/, quality: "aug" },
  { pattern: /^\+(?!\d)/, quality: "aug" },

  // Suspended
  { pattern: /^sus4/, quality: "sus4" },
  { pattern: /^sus2/, quality: "sus2" },
  { pattern: /^sus(?![24])/, quality: "sus4" },

  // Power chord
  { pattern: /^5/, quality: "5" },

  // Dominant 7
  { pattern: /^7/, quality: "7" },

  // Extensions
  { pattern: /^9/, quality: "9" },
  { pattern: /^11/, quality: "11" },
  { pattern: /^13/, quality: "13" },

  // Add chords
  { pattern: /^add/, quality: "add" },
  { pattern: /^2(?!nd)/, quality: "add2" },
  { pattern: /^6/, quality: "6" },
];

/** Valid note name regex */
export const NOTE_REGEX = /^([A-G])([#b])?/;

/** Slash chord regex */
export const SLASH_CHORD_REGEX = /\/([A-G][#b]?)$/;
