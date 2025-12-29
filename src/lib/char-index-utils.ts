import type { Chord, Line } from "../types";
import { v4 as uuidv4 } from "uuid";

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
 * Insert a new chord at a specific character index.
 */
export function insertChord(
  line: Line,
  chordSymbol: string,
  charIndex: number,
): Line {
  const newChord: Chord = {
    id: uuidv4(),
    chord: chordSymbol,
    charIndex: clampCharIndex(charIndex, line.lyrics.length),
  };

  return {
    ...line,
    chords: [...line.chords, newChord].sort(
      (a, b) => a.charIndex - b.charIndex,
    ),
  };
}

/**
 * Move a chord to a new character index.
 */
export function moveChord(
  line: Line,
  chordId: string,
  newCharIndex: number,
): Line {
  return {
    ...line,
    chords: line.chords
      .map((chord) =>
        chord.id === chordId
          ? {
              ...chord,
              charIndex: clampCharIndex(newCharIndex, line.lyrics.length),
            }
          : chord,
      )
      .sort((a, b) => a.charIndex - b.charIndex),
  };
}

/**
 * Update a chord's symbol.
 */
export function updateChord(
  line: Line,
  chordId: string,
  newSymbol: string,
): Line {
  return {
    ...line,
    chords: line.chords.map((chord) =>
      chord.id === chordId ? { ...chord, chord: newSymbol } : chord,
    ),
  };
}

/**
 * Delete a chord from a line.
 */
export function deleteChord(line: Line, chordId: string): Line {
  return {
    ...line,
    chords: line.chords.filter((chord) => chord.id !== chordId),
  };
}

/**
 * Update lyrics and adjust chord positions accordingly.
 */
export function updateLyrics(line: Line, newLyrics: string): Line {
  
  const newLength = newLyrics.length;

  // Simple approach: clamp all chords to new length
  const adjustedChords = line.chords.map((chord) => ({
    ...chord,
    charIndex: clampCharIndex(chord.charIndex, newLength),
  }));

  return {
    ...line,
    lyrics: newLyrics,
    chords: adjustedChords,
  };
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
 * Find a chord by its ID in a line.
 */
export function findChordInLine(
  line: Line,
  chordId: string,
): Chord | undefined {
  return line.chords.find((chord) => chord.id === chordId);
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
