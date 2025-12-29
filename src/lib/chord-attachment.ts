import type { Chord } from "../types";

interface WordInfo {
  word: string;
  start: number;
  end: number;
  wordIndex: number; // Which occurrence of this word (0-based)
}

/**
 * Get information about the word at a given character index
 */
export function getWordAtIndex(
  lyrics: string,
  charIndex: number,
): WordInfo | null {
  if (charIndex < 0 || charIndex >= lyrics.length) {
    return null;
  }

  // Find word boundaries
  const words = lyrics.split(/(\s+)/);
  let currentPos = 0;
  const wordOccurrences = new Map<string, number>();

  for (const segment of words) {
    const segmentEnd = currentPos + segment.length;

    // Skip whitespace segments
    if (/^\s+$/.test(segment)) {
      currentPos = segmentEnd;
      continue;
    }

    if (charIndex >= currentPos && charIndex < segmentEnd) {
      const word = segment;
      const occurrence = wordOccurrences.get(word) || 0;
      wordOccurrences.set(word, occurrence + 1);

      return {
        word,
        start: currentPos,
        end: segmentEnd,
        wordIndex: occurrence,
      };
    }

    // Track word occurrences
    const occurrence = wordOccurrences.get(segment) || 0;
    wordOccurrences.set(segment, occurrence + 1);

    currentPos = segmentEnd;
  }

  return null;
}

/**
 * Find the new position of a word in modified lyrics
 */
export function findWordNewPosition(
  newLyrics: string,
  word: string,
  targetOccurrence: number,
): number {
  const words = newLyrics.split(/(\s+)/);
  let currentPos = 0;
  let occurrenceCount = 0;

  for (const segment of words) {
    const segmentEnd = currentPos + segment.length;

    // Skip whitespace segments
    if (/^\s+$/.test(segment)) {
      currentPos = segmentEnd;
      continue;
    }

    if (segment === word) {
      if (occurrenceCount === targetOccurrence) {
        return currentPos;
      }
      occurrenceCount++;
    }

    currentPos = segmentEnd;
  }

  return -1; // Word not found at target occurrence
}

/**
 * Update chord positions when lyrics are edited.
 * Option B: Chords "stick" to the word they were above.
 */
export function updateChordsOnLyricEdit(
  oldLyrics: string,
  newLyrics: string,
  chords: Chord[],
): Chord[] {
  return chords.map((chord) => {
    // Find the word at the chord's original position
    const wordInfo = getWordAtIndex(oldLyrics, chord.charIndex);

    if (!wordInfo) {
      // Chord was in whitespace or beyond lyrics - clamp to end
      return {
        ...chord,
        charIndex: Math.min(chord.charIndex, Math.max(0, newLyrics.length - 1)),
      };
    }

    // Find where that word moved in new lyrics
    const newWordStart = findWordNewPosition(
      newLyrics,
      wordInfo.word,
      wordInfo.wordIndex,
    );

    if (newWordStart === -1) {
      // Word was deleted - try to find the word at any position
      const anyPosition = findWordNewPosition(newLyrics, wordInfo.word, 0);
      if (anyPosition !== -1) {
        // Found the word elsewhere, attach to it
        const offset = chord.charIndex - wordInfo.start;
        return {
          ...chord,
          charIndex: Math.min(anyPosition + offset, newLyrics.length - 1),
        };
      }

      // Word completely removed - clamp to nearest valid position
      return {
        ...chord,
        charIndex: Math.min(chord.charIndex, Math.max(0, newLyrics.length - 1)),
      };
    }

    // Preserve offset within word
    const offsetInWord = chord.charIndex - wordInfo.start;
    const newCharIndex = newWordStart + offsetInWord;

    return {
      ...chord,
      charIndex: Math.min(newCharIndex, Math.max(0, newLyrics.length - 1)),
    };
  });
}

/**
 * Update chord positions when lyrics are edited.
 * Option C: Chords stay at fixed character positions (simple shift).
 */
export function updateChordsLyricsOnly(
  _oldLyrics: string,
  newLyrics: string,
  chords: Chord[],
): Chord[] {
  // Simple approach: keep chords at their current positions, clamped to new length
  return chords.map((chord) => ({
    ...chord,
    charIndex: Math.min(chord.charIndex, Math.max(0, newLyrics.length - 1)),
  }));
}
