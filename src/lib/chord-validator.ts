import { parseChord, isValidNote } from "./chord-parser";
import { NOTE_REGEX } from "./constants";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

/**
 * Validate a chord symbol with detailed error messages.
 */
export function validateChord(symbol: string): ValidationResult {
  const trimmed = symbol.trim();

  // Empty check
  if (!trimmed) {
    return { isValid: false, error: "Chord cannot be empty" };
  }

  // N.C. is always valid
  if (trimmed.toUpperCase() === "NC" || trimmed.toUpperCase() === "N.C.") {
    return { isValid: true };
  }

  // Check for valid root note
  const noteMatch = trimmed.match(NOTE_REGEX);
  if (!noteMatch) {
    return {
      isValid: false,
      error: "Invalid root note. Must start with A-G.",
      suggestion: "Try: C, D, E, F, G, A, or B",
    };
  }

  const root = noteMatch[0];
  if (!isValidNote(root)) {
    return {
      isValid: false,
      error: `Invalid note: ${root}`,
      suggestion: "Use # for sharp, b for flat",
    };
  }

  // Check for double accidentals
  if (/[A-G][#b]{2}/.test(trimmed)) {
    return {
      isValid: false,
      error: "Double accidentals are not supported",
      suggestion: "Use a single # or b",
    };
  }

  // Check for invalid characters
  const validChars = /^[A-Ga-g#b♯♭mMiInNoOdDsSpPaAuUgG0-9+\-Δø°/]+$/;
  if (!validChars.test(trimmed)) {
    const invalidChar = trimmed.match(
      /[^A-Ga-g#b♯♭mMiInNoOdDsSpPaAuUgG0-9+\-Δø°/]/,
    );
    return {
      isValid: false,
      error: `Invalid character: ${invalidChar?.[0]}`,
      suggestion: "Remove special characters",
    };
  }

  // Parse and validate
  const parsed = parseChord(trimmed);
  if (!parsed.isValid) {
    return {
      isValid: false,
      error: "Could not parse chord",
      suggestion: "Check chord format",
    };
  }

  // Validate slash chord bass note
  if (parsed.bass && !isValidNote(parsed.bass)) {
    return {
      isValid: false,
      error: `Invalid bass note: ${parsed.bass}`,
      suggestion: "Bass note must be A-G with optional # or b",
    };
  }

  return { isValid: true };
}

/**
 * Quick validation check (no error details)
 */
export function isValidChordSymbol(symbol: string): boolean {
  return validateChord(symbol).isValid;
}

/**
 * Common chord suggestions for autocomplete
 */
export const COMMON_SUFFIXES = [
  "", // major
  "m",
  "7",
  "m7",
  "maj7",
  "sus4",
  "sus2",
  "add9",
  "9",
  "dim",
  "aug",
  "6",
  "m6",
  "7sus4",
  "m7b5",
  "dim7",
];

/**
 * Generate chord suggestions based on partial input
 */
export function getChordSuggestions(partial: string): string[] {
  const trimmed = partial.trim();
  if (!trimmed) return [];

  // Extract root if present
  const noteMatch = trimmed.match(NOTE_REGEX);
  if (!noteMatch) return [];

  const root = noteMatch[0];
  const existingSuffix = trimmed.slice(root.length).toLowerCase();

  // Filter suffixes that start with existing input
  const matchingSuffixes = COMMON_SUFFIXES.filter((suffix) =>
    suffix.toLowerCase().startsWith(existingSuffix),
  );

  return matchingSuffixes.map((suffix) => root + suffix);
}
