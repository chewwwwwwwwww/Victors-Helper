import { describe, it, expect } from "vitest";
import {
  clampCharIndex,
  adjustChordsForEdit,
  pixelToCharIndex,
  charIndexToPixel,
  chordsOverlap,
} from "../src/lib/char-index-utils";
import { Chord } from "../src/types";

describe("clampCharIndex", () => {
  it("clamps negative values to 0", () => {
    expect(clampCharIndex(-5, 10)).toBe(0);
    expect(clampCharIndex(-1, 10)).toBe(0);
  });

  it("clamps values beyond length to length", () => {
    expect(clampCharIndex(15, 10)).toBe(10);
    expect(clampCharIndex(100, 10)).toBe(10);
  });

  it("returns value if within range", () => {
    expect(clampCharIndex(5, 10)).toBe(5);
    expect(clampCharIndex(0, 10)).toBe(0);
    expect(clampCharIndex(10, 10)).toBe(10);
  });
});

describe("adjustChordsForEdit", () => {
  const createChord = (id: string, charIndex: number): Chord => ({
    id,
    chord: "G",
    charIndex,
  });

  describe("character insertion", () => {
    it("shifts chords after insertion point", () => {
      const chords = [
        createChord("1", 0),
        createChord("2", 5),
        createChord("3", 10),
      ];

      const result = adjustChordsForEdit(chords, 5, 3, 20); // Insert 3 chars at position 5

      expect(result[0].charIndex).toBe(0); // Before insertion, unchanged
      expect(result[1].charIndex).toBe(8); // At insertion point, shifted
      expect(result[2].charIndex).toBe(13); // After insertion, shifted
    });

    it("does not shift chords before insertion point", () => {
      const chords = [createChord("1", 0), createChord("2", 3)];

      const result = adjustChordsForEdit(chords, 10, 5, 20);

      expect(result[0].charIndex).toBe(0);
      expect(result[1].charIndex).toBe(3);
    });
  });

  describe("character deletion", () => {
    it("shifts chords after deleted region", () => {
      const chords = [
        createChord("1", 0),
        createChord("2", 10),
        createChord("3", 15),
      ];

      const result = adjustChordsForEdit(chords, 5, -3, 12); // Delete 3 chars at position 5

      expect(result[0].charIndex).toBe(0); // Before deletion, unchanged
      expect(result[1].charIndex).toBe(7); // After deletion, shifted back
      expect(result[2].charIndex).toBe(12); // Clamped to new length
    });

    it("moves chords within deleted region to deletion point", () => {
      const chords = [createChord("1", 5), createChord("2", 7)];

      const result = adjustChordsForEdit(chords, 3, -5, 10); // Delete 5 chars at position 3

      expect(result[0].charIndex).toBe(3); // Was in deleted region
      expect(result[1].charIndex).toBe(3); // Was in deleted region
    });

    it("clamps to new length after deletion", () => {
      const chords = [createChord("1", 15)];

      const result = adjustChordsForEdit(chords, 0, -10, 5); // Delete 10 chars from start

      expect(result[0].charIndex).toBe(5); // Clamped to new length
    });
  });

  describe("no change", () => {
    it("returns unchanged chords when no characters added", () => {
      const chords = [createChord("1", 5), createChord("2", 10)];

      const result = adjustChordsForEdit(chords, 5, 0, 15);

      expect(result[0].charIndex).toBe(5);
      expect(result[1].charIndex).toBe(10);
    });
  });
});

describe("pixelToCharIndex", () => {
  it("converts pixel position to character index", () => {
    const charWidth = 10;

    expect(pixelToCharIndex(0, charWidth, 100)).toBe(0);
    expect(pixelToCharIndex(10, charWidth, 100)).toBe(1);
    expect(pixelToCharIndex(25, charWidth, 100)).toBe(3); // Rounds to nearest
    expect(pixelToCharIndex(100, charWidth, 100)).toBe(10);
  });

  it("clamps to max index", () => {
    expect(pixelToCharIndex(500, 10, 20)).toBe(20);
  });

  it("clamps negative pixels to 0", () => {
    expect(pixelToCharIndex(-50, 10, 20)).toBe(0);
  });

  it("handles non-integer char widths", () => {
    expect(pixelToCharIndex(24, 9.6, 100)).toBe(3); // 24 / 9.6 = 2.5, rounds to 3
  });
});

describe("charIndexToPixel", () => {
  it("converts character index to pixel position", () => {
    expect(charIndexToPixel(0, 10)).toBe(0);
    expect(charIndexToPixel(1, 10)).toBe(10);
    expect(charIndexToPixel(5, 10)).toBe(50);
  });

  it("handles non-integer char widths", () => {
    expect(charIndexToPixel(5, 9.6)).toBe(48);
  });
});

describe("chordsOverlap", () => {
  it("returns true when chords overlap", () => {
    // Chord1 at index 0, 3 chars wide (indices 0, 1, 2)
    // Chord2 at index 2 - overlaps with chord1
    expect(chordsOverlap(0, 30, 2, 10)).toBe(true);
  });

  it("returns false when chords do not overlap", () => {
    // Chord1 at index 0, 3 chars wide (indices 0, 1, 2)
    // Chord2 at index 5 - no overlap
    expect(chordsOverlap(0, 30, 5, 10)).toBe(false);
  });

  it("returns false when chords are adjacent", () => {
    // Chord1 at index 0, 3 chars wide (ends at index 3)
    // Chord2 at index 3 - adjacent, not overlapping
    expect(chordsOverlap(0, 30, 3, 10)).toBe(false);
  });

  it("handles single character chords", () => {
    // Single char chord at index 5
    // Another chord at index 5 - overlaps
    expect(chordsOverlap(5, 10, 5, 10)).toBe(true);

    // Single char at 5, another at 6 - no overlap
    expect(chordsOverlap(5, 10, 6, 10)).toBe(false);
  });
});
