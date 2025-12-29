import { describe, it, expect } from "vitest";
import {
  getWordAtIndex,
  findWordNewPosition,
  updateChordsOnLyricEdit,
  updateChordsLyricsOnly,
} from "../src/lib/chord-attachment";
import type { Chord } from "../src/types";

describe("getWordAtIndex", () => {
  it("should find word at the beginning", () => {
    const result = getWordAtIndex("Hello world", 0);
    expect(result).toEqual({
      word: "Hello",
      start: 0,
      end: 5,
      wordIndex: 0,
    });
  });

  it("should find word in the middle", () => {
    const result = getWordAtIndex("Hello world", 6);
    expect(result).toEqual({
      word: "world",
      start: 6,
      end: 11,
      wordIndex: 0,
    });
  });

  it("should return null for index beyond lyrics", () => {
    const result = getWordAtIndex("Hello", 10);
    expect(result).toBeNull();
  });

  it("should handle repeated words", () => {
    const result = getWordAtIndex("the quick the fox", 10);
    expect(result).toEqual({
      word: "the",
      start: 10,
      end: 13,
      wordIndex: 1, // Second occurrence
    });
  });

  it("should return null for whitespace position", () => {
    const result = getWordAtIndex("Hello world", 5);
    expect(result).toBeNull();
  });
});

describe("findWordNewPosition", () => {
  it("should find first occurrence of word", () => {
    const result = findWordNewPosition("Hello world", "world", 0);
    expect(result).toBe(6);
  });

  it("should find second occurrence", () => {
    const result = findWordNewPosition("the quick the fox", "the", 1);
    expect(result).toBe(10);
  });

  it("should return -1 if word not found at target occurrence", () => {
    const result = findWordNewPosition("Hello world", "foo", 0);
    expect(result).toBe(-1);
  });

  it("should return -1 if occurrence not found", () => {
    const result = findWordNewPosition("the quick fox", "the", 1);
    expect(result).toBe(-1);
  });
});

describe("updateChordsOnLyricEdit - Option B (attached)", () => {
  it("should keep chord attached when word moves", () => {
    const chords: Chord[] = [{ id: "1", chord: "G", charIndex: 6 }]; // On "world"
    const result = updateChordsOnLyricEdit("Hello world", "Hi world", chords);
    expect(result[0].charIndex).toBe(3); // "world" moved to position 3
  });

  it("should handle word insertion before chord", () => {
    const chords: Chord[] = [{ id: "1", chord: "G", charIndex: 0 }]; // On "Hello"
    const result = updateChordsOnLyricEdit(
      "Hello world",
      "Say Hello world",
      chords,
    );
    expect(result[0].charIndex).toBe(4); // "Hello" moved to position 4
  });

  it("should clamp chord when word is deleted", () => {
    const chords: Chord[] = [{ id: "1", chord: "G", charIndex: 6 }]; // On "world"
    const result = updateChordsOnLyricEdit("Hello world", "Hello", chords);
    expect(result[0].charIndex).toBe(4); // Clamped to end
  });

  it("should preserve offset within word", () => {
    const chords: Chord[] = [{ id: "1", chord: "G", charIndex: 8 }]; // On "rld" in "world"
    const result = updateChordsOnLyricEdit("Hello world", "Hi world", chords);
    // "world" moved from 6 to 3, chord was at offset 2 within "world"
    expect(result[0].charIndex).toBe(5); // 3 + 2 = 5
  });

  it("should handle multiple chords", () => {
    const chords: Chord[] = [
      { id: "1", chord: "G", charIndex: 0 },
      { id: "2", chord: "C", charIndex: 6 },
    ];
    const result = updateChordsOnLyricEdit("Hello world", "Hi world", chords);
    // First chord was on "Hello" which is now gone, should try to find it
    // Second chord was on "world" which moved to position 3
    expect(result[1].charIndex).toBe(3);
  });
});

describe("updateChordsLyricsOnly - Option C (detached)", () => {
  it("should keep chords at same position if within bounds", () => {
    const chords: Chord[] = [{ id: "1", chord: "G", charIndex: 6 }];
    const result = updateChordsLyricsOnly(
      "Hello world",
      "Hi there world",
      chords,
    );
    expect(result[0].charIndex).toBe(6);
  });

  it("should clamp chord to new length if beyond", () => {
    const chords: Chord[] = [{ id: "1", chord: "G", charIndex: 10 }];
    const result = updateChordsLyricsOnly("Hello world", "Hi", chords);
    expect(result[0].charIndex).toBe(1); // Clamped to "Hi".length - 1
  });

  it("should handle empty lyrics", () => {
    const chords: Chord[] = [{ id: "1", chord: "G", charIndex: 5 }];
    const result = updateChordsLyricsOnly("Hello", "", chords);
    expect(result[0].charIndex).toBe(0);
  });
});
