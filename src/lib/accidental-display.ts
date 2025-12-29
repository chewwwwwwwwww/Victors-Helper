/**
 * Convert ASCII accidentals to Unicode music symbols for display.
 *
 * b -> ♭ (flat)
 * # -> ♯ (sharp)
 *
 * Only converts accidentals in note positions (after A-G or in slash chords).
 */
export function formatChordDisplay(chord: string): string {
  // Handle N.C.
  if (chord.toUpperCase() === "NC" || chord.toUpperCase() === "N.C.") {
    return "N.C.";
  }

  let result = chord;

  // Replace accidentals after root note (position 1 if present)
  result = result.replace(/^([A-G])b/, "$1♭");
  result = result.replace(/^([A-G])#/, "$1♯");

  // Replace accidentals after slash (bass note)
  result = result.replace(/\/([A-G])b/g, "/$1♭");
  result = result.replace(/\/([A-G])#/g, "/$1♯");

  return result;
}

/**
 * Convert Unicode accidentals back to ASCII for storage.
 *
 * ♭ -> b
 * ♯ -> #
 */
export function normalizeChordAccidentals(chord: string): string {
  return chord.replace(/♭/g, "b").replace(/♯/g, "#");
}

/**
 * Check if a chord contains flat accidentals
 */
export function hasFlats(chord: string): boolean {
  return chord.includes("b") || chord.includes("♭");
}

/**
 * Check if a chord contains sharp accidentals
 */
export function hasSharps(chord: string): boolean {
  return chord.includes("#") || chord.includes("♯");
}

/**
 * Get the accidental type preference from a chord
 */
export function getChordAccidentalType(
  chord: string,
): "flats" | "sharps" | "none" {
  if (hasFlats(chord)) return "flats";
  if (hasSharps(chord)) return "sharps";
  return "none";
}
