import type { NoteName, AccidentalPreference, TransposedChord } from "../types";
import {
  NOTE_TO_SEMITONE,
  CHROMATIC_SHARPS,
  CHROMATIC_FLATS,
  SHARP_KEYS,
  FLAT_KEYS,
} from "./constants";
import { parseChord } from "./chord-parser";

/**
 * Transpose a single note by a number of semitones.
 */
export function transposeNote(
  note: NoteName,
  semitones: number,
  preference: AccidentalPreference = "auto",
): NoteName {
  const currentSemitone = NOTE_TO_SEMITONE[note];
  const newSemitone = (((currentSemitone + semitones) % 12) + 12) % 12;

  // Determine which chromatic scale to use
  const useFlats = shouldUseFlats(note, preference);
  const scale = useFlats ? CHROMATIC_FLATS : CHROMATIC_SHARPS;

  return scale[newSemitone];
}

/**
 * Transpose a chord symbol by a number of semitones.
 * Preserves the original suffix format and accidental style.
 */
export function transposeChord(
  symbol: string,
  semitones: number,
  preference: AccidentalPreference = "auto",
): TransposedChord {
  // Handle no transposition
  if (semitones === 0) {
    return { symbol, original: symbol, semitones: 0 };
  }

  const parsed = parseChord(symbol);

  // If invalid or N.C., return as-is
  if (!parsed.isValid || parsed.suffix === "N.C.") {
    return { symbol, original: symbol, semitones };
  }

  // Determine accidental preference based on original chord
  const effectivePreference =
    preference === "auto"
      ? parsed.root.includes("b")
        ? "flats"
        : "sharps"
      : preference;

  // Transpose root
  const newRoot = transposeNote(parsed.root, semitones, effectivePreference);

  // Transpose bass if present
  let newBass = "";
  if (parsed.bass) {
    const transposedBass = transposeNote(
      parsed.bass,
      semitones,
      effectivePreference,
    );
    newBass = "/" + transposedBass;
  }

  const newSymbol = newRoot + parsed.suffix + newBass;

  return {
    symbol: newSymbol,
    original: symbol,
    semitones,
  };
}

/**
 * Transpose all chords in a song by semitones.
 * Returns a map of original -> transposed chord symbols.
 */
export function transposeChordMap(
  chords: string[],
  semitones: number,
  preference: AccidentalPreference = "auto",
): Map<string, string> {
  const result = new Map<string, string>();

  for (const chord of chords) {
    if (!result.has(chord)) {
      const transposed = transposeChord(chord, semitones, preference);
      result.set(chord, transposed.symbol);
    }
  }

  return result;
}

/**
 * Get the transposed chord symbol for display.
 * This is a convenience function for rendering.
 */
export function getTransposedSymbol(
  chord: string,
  semitones: number,
  preference: AccidentalPreference = "auto",
): string {
  if (semitones === 0) return chord;
  return transposeChord(chord, semitones, preference).symbol;
}

/**
 * Calculate the interval between two notes in semitones.
 */
export function getInterval(from: NoteName, to: NoteName): number {
  const fromSemitone = NOTE_TO_SEMITONE[from];
  const toSemitone = NOTE_TO_SEMITONE[to];
  return (((toSemitone - fromSemitone) % 12) + 12) % 12;
}

/**
 * Determine if we should use flats based on note and preference.
 */
function shouldUseFlats(
  note: NoteName,
  preference: AccidentalPreference,
): boolean {
  if (preference === "flats") return true;
  if (preference === "sharps") return false;

  // Auto: prefer the same accidental type as the input
  return note.includes("b");
}

/**
 * Get the key signature preference (sharps or flats) for a given key.
 */
export function getKeyPreference(key: NoteName): AccidentalPreference {
  if (SHARP_KEYS.includes(key)) return "sharps";
  if (FLAT_KEYS.includes(key)) return "flats";
  return "sharps"; // Default
}

/**
 * Format transposition offset for display (e.g., "+2", "-3", "0")
 */
export function formatTransposeOffset(semitones: number): string {
  if (semitones === 0) return "0";
  return semitones > 0 ? `+${semitones}` : `${semitones}`;
}

/**
 * Get the new key after transposition
 */
export function getTransposedKey(
  originalKey: NoteName,
  semitones: number,
  preference: AccidentalPreference = "auto",
): NoteName {
  return transposeNote(originalKey, semitones, preference);
}
