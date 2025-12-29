import type { NoteName, ParsedChord, ChordQuality } from "../types";
import { NOTE_REGEX, SLASH_CHORD_REGEX, NOTE_TO_SEMITONE } from "./constants";

/**
 * Parse a chord symbol string into its components.
 *
 * Examples:
 *   "C" -> { root: "C", quality: "major", suffix: "", ... }
 *   "Am7" -> { root: "A", quality: "minor7", suffix: "m7", ... }
 *   "F#maj7/C#" -> { root: "F#", quality: "major7", suffix: "maj7", bass: "C#", ... }
 */
export function parseChord(symbol: string): ParsedChord {
  const trimmed = symbol.trim();

  if (!trimmed) {
    return createInvalidChord(symbol);
  }

  // Handle N.C. (no chord)
  if (trimmed.toUpperCase() === "NC" || trimmed.toUpperCase() === "N.C.") {
    return {
      root: "C" as NoteName, // Placeholder
      quality: "major",
      suffix: "N.C.",
      originalSymbol: symbol,
      isValid: true,
    };
  }

  // Extract bass note if slash chord
  let workingSymbol = trimmed;
  let bass: NoteName | undefined;

  const slashMatch = workingSymbol.match(SLASH_CHORD_REGEX);
  if (slashMatch) {
    const bassNote = slashMatch[1] as NoteName;
    if (isValidNote(bassNote)) {
      bass = bassNote;
      workingSymbol = workingSymbol.slice(0, -slashMatch[0].length);
    }
  }

  // Extract root note
  const noteMatch = workingSymbol.match(NOTE_REGEX);
  if (!noteMatch) {
    return createInvalidChord(symbol);
  }

  const rootLetter = noteMatch[1];
  const accidental = noteMatch[2] || "";
  const root = (rootLetter + accidental) as NoteName;

  if (!isValidNote(root)) {
    return createInvalidChord(symbol);
  }

  // Get the suffix (everything after the root)
  const suffix = workingSymbol.slice(noteMatch[0].length);

  // Determine quality from suffix
  const quality = determineQuality(suffix);

  return {
    root,
    quality,
    suffix,
    bass,
    originalSymbol: symbol,
    isValid: true,
  };
}

/**
 * Check if a string is a valid note name
 */
export function isValidNote(note: string): note is NoteName {
  return note in NOTE_TO_SEMITONE;
}

/**
 * Determine chord quality from suffix
 */
function determineQuality(suffix: string): ChordQuality {
  const s = suffix.toLowerCase();

  // Check for minor variants first
  if (s.startsWith("m") && !s.startsWith("maj")) {
    if (s.includes("7") && s.includes("b5")) return "halfDiminished7";
    if (s.includes("7")) return "minor7";
    return "minor";
  }

  if (s.startsWith("-")) {
    if (s.includes("7")) return "minor7";
    return "minor";
  }

  // Diminished
  if (s.startsWith("dim") || s.startsWith("o") || s.startsWith("°")) {
    if (s.includes("7")) return "diminished7";
    return "diminished";
  }

  // Half-diminished (ø)
  if (s.startsWith("ø") || s.includes("m7b5")) {
    return "halfDiminished7";
  }

  // Augmented
  if (s.startsWith("aug") || s.startsWith("+")) {
    if (s.includes("7")) return "augmented7";
    return "augmented";
  }

  // Suspended
  if (s.startsWith("sus2")) return "sus2";
  if (s.startsWith("sus4") || s.startsWith("sus")) return "sus4";

  // Power chord
  if (s === "5") return "power";

  // Major 7
  if (s.startsWith("maj7") || s.startsWith("M7") || s.startsWith("Δ")) {
    return "major7";
  }

  // Dominant 7 (just a 7, 9, 11, 13 without maj prefix)
  if (/^7|^9|^11|^13/.test(s)) {
    return "dominant7";
  }

  // Default to major
  return "major";
}

/**
 * Create an invalid chord result
 */
function createInvalidChord(symbol: string): ParsedChord {
  return {
    root: "C" as NoteName,
    quality: "major",
    suffix: "",
    originalSymbol: symbol,
    isValid: false,
  };
}

/**
 * Validate if a chord symbol string is parseable
 */
export function isValidChord(symbol: string): boolean {
  const parsed = parseChord(symbol);
  return parsed.isValid;
}

/**
 * Normalize a chord to a standard format (for comparison/storage)
 */
export function normalizeChord(symbol: string): string {
  const parsed = parseChord(symbol);
  if (!parsed.isValid) return symbol;

  let result = parsed.root + parsed.suffix;
  if (parsed.bass) {
    result += "/" + parsed.bass;
  }
  return result;
}
