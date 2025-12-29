import type { Chord } from "../types";

/**
 * Clamp a character index to valid range for a lyrics string.
 */
export function clampCharIndex(
  charIndex: number,
  lyricsLength: number,
): number {
  return Math.max(0, Math.min(charIndex, lyricsLength));
}

/**
 * Adjust chord indices when lyrics are edited.
 * Returns a new array of chords with adjusted indices.
 */
export function adjustChordsForEdit(
  chords: Chord[],
  editPosition: number,
  charsAdded: number, // negative for deletion
  newLyricsLength: number,
): Chord[] {
  return chords.map((chord) => {
    let newIndex = chord.charIndex;

    if (charsAdded > 0) {
      // Characters inserted
      if (chord.charIndex >= editPosition) {
        newIndex = chord.charIndex + charsAdded;
      }
    } else if (charsAdded < 0) {
      // Characters deleted
      const charsRemoved = Math.abs(charsAdded);
      const deleteEnd = editPosition + charsRemoved;

      if (chord.charIndex >= deleteEnd) {
        // Chord is after deleted region
        newIndex = chord.charIndex - charsRemoved;
      } else if (chord.charIndex >= editPosition) {
        // Chord is within deleted region - move to edit position
        newIndex = editPosition;
      }
    }

    // Clamp to valid range
    newIndex = clampCharIndex(newIndex, newLyricsLength);

    return {
      ...chord,
      charIndex: newIndex,
    };
  });
}

/**
 * Convert pixel position to character index.
 */
export function pixelToCharIndex(
  pixelX: number,
  charWidth: number,
  maxIndex: number,
): number {
  const rawIndex = Math.round(pixelX / charWidth);
  return clampCharIndex(rawIndex, maxIndex);
}

/**
 * Convert character index to pixel position.
 */
export function charIndexToPixel(charIndex: number, charWidth: number): number {
  return charIndex * charWidth;
}

/**
 * Get chords sorted by character index.
 */
export function getSortedChords(chords: Chord[]): Chord[] {
  return [...chords].sort((a, b) => a.charIndex - b.charIndex);
}

/**
 * Check if two chords would overlap at their character positions.
 */
export function chordsOverlap(
  chord1Index: number,
  chord1Width: number,
  chord2Index: number,
  charWidth: number,
): boolean {
  const chord1End = chord1Index + Math.ceil(chord1Width / charWidth);
  return chord2Index < chord1End;
}
