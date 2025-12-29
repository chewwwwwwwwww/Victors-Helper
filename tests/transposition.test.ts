import { describe, it, expect } from "vitest";
import {
  transposeNote,
  transposeChord,
  transposeChordMap,
  getTransposedSymbol,
  getInterval,
  formatTransposeOffset,
  getTransposedKey,
} from "../src/lib/transposition";
import { NoteName } from "../src/types";

describe("transposeNote", () => {
  describe("basic transpositions", () => {
    it("transposes C up 2 semitones to D", () => {
      expect(transposeNote("C" as NoteName, 2)).toBe("D");
    });

    it("transposes C up 7 semitones to G", () => {
      expect(transposeNote("C" as NoteName, 7)).toBe("G");
    });

    it("transposes C up 12 semitones to C", () => {
      expect(transposeNote("C" as NoteName, 12)).toBe("C");
    });

    it("transposes C down 2 semitones to Bb", () => {
      expect(transposeNote("C" as NoteName, -2, "flats")).toBe("Bb");
    });

    it("transposes G up 5 semitones to C", () => {
      expect(transposeNote("G" as NoteName, 5)).toBe("C");
    });
  });

  describe("accidental preference", () => {
    it("uses sharps when preference is sharps", () => {
      expect(transposeNote("C" as NoteName, 1, "sharps")).toBe("C#");
    });

    it("uses flats when preference is flats", () => {
      expect(transposeNote("C" as NoteName, 1, "flats")).toBe("Db");
    });

    it("uses same accidental type as input when auto", () => {
      expect(transposeNote("Bb" as NoteName, 2, "auto")).toBe("C");
      expect(transposeNote("F#" as NoteName, 2, "auto")).toBe("G#");
    });
  });

  describe("wrapping around octave", () => {
    it("wraps from B to C", () => {
      expect(transposeNote("B" as NoteName, 1)).toBe("C");
    });

    it("wraps from C to B", () => {
      expect(transposeNote("C" as NoteName, -1, "sharps")).toBe("B");
    });

    it("handles large positive offsets", () => {
      expect(transposeNote("C" as NoteName, 25)).toBe("C#");
    });

    it("handles large negative offsets", () => {
      expect(transposeNote("C" as NoteName, -25, "flats")).toBe("B");
    });
  });
});

describe("transposeChord", () => {
  describe("simple chords", () => {
    it("transposes C to D (+2)", () => {
      const result = transposeChord("C", 2);
      expect(result.symbol).toBe("D");
      expect(result.original).toBe("C");
      expect(result.semitones).toBe(2);
    });

    it("transposes G to A (+2)", () => {
      const result = transposeChord("G", 2);
      expect(result.symbol).toBe("A");
    });

    it("returns same chord when offset is 0", () => {
      const result = transposeChord("Am7", 0);
      expect(result.symbol).toBe("Am7");
    });
  });

  describe("preserving suffixes", () => {
    it("preserves m suffix", () => {
      const result = transposeChord("Am", 2);
      expect(result.symbol).toBe("Bm");
    });

    it("preserves m7 suffix", () => {
      const result = transposeChord("Am7", 3);
      expect(result.symbol).toBe("Cm7");
    });

    it("preserves maj7 suffix", () => {
      const result = transposeChord("Cmaj7", 5);
      expect(result.symbol).toBe("Fmaj7");
    });

    it("preserves sus4 suffix", () => {
      const result = transposeChord("Dsus4", 2);
      expect(result.symbol).toBe("Esus4");
    });

    it("preserves dim7 suffix", () => {
      const result = transposeChord("Bdim7", -2);
      expect(result.symbol).toBe("Adim7");
    });
  });

  describe("slash chords", () => {
    it("transposes both root and bass", () => {
      const result = transposeChord("C/G", 2);
      expect(result.symbol).toBe("D/A");
    });

    it("transposes Am/E up 3 semitones", () => {
      const result = transposeChord("Am/E", 3);
      expect(result.symbol).toBe("Cm/G");
    });

    it("transposes F#m7/C# correctly", () => {
      const result = transposeChord("F#m7/C#", 2);
      expect(result.symbol).toBe("G#m7/D#");
    });
  });

  describe("accidental handling", () => {
    it("preserves flat style in transposition", () => {
      const result = transposeChord("Bb", 2, "auto");
      expect(result.symbol).toBe("C");
    });

    it("preserves sharp style in transposition", () => {
      const result = transposeChord("F#", 2);
      expect(result.symbol).toBe("G#");
    });
  });

  describe("N.C. handling", () => {
    it("returns N.C. unchanged", () => {
      const result = transposeChord("N.C.", 5);
      expect(result.symbol).toBe("N.C.");
    });
  });
});

describe("transposeChordMap", () => {
  it("creates a map of original to transposed chords", () => {
    const chords = ["C", "Am", "F", "G"];
    const result = transposeChordMap(chords, 2);

    expect(result.get("C")).toBe("D");
    expect(result.get("Am")).toBe("Bm");
    expect(result.get("F")).toBe("G");
    expect(result.get("G")).toBe("A");
  });

  it("handles duplicates efficiently", () => {
    const chords = ["C", "C", "C", "G", "G"];
    const result = transposeChordMap(chords, 2);

    expect(result.size).toBe(2);
    expect(result.get("C")).toBe("D");
    expect(result.get("G")).toBe("A");
  });
});

describe("getTransposedSymbol", () => {
  it("returns transposed symbol directly", () => {
    expect(getTransposedSymbol("C", 2)).toBe("D");
    expect(getTransposedSymbol("Am7", 3)).toBe("Cm7");
  });

  it("returns original when offset is 0", () => {
    expect(getTransposedSymbol("F#m", 0)).toBe("F#m");
  });
});

describe("getInterval", () => {
  it("calculates interval between C and G", () => {
    expect(getInterval("C" as NoteName, "G" as NoteName)).toBe(7);
  });

  it("calculates interval between C and E", () => {
    expect(getInterval("C" as NoteName, "E" as NoteName)).toBe(4);
  });

  it("calculates interval wrapping around", () => {
    expect(getInterval("G" as NoteName, "C" as NoteName)).toBe(5);
  });

  it("returns 0 for same note", () => {
    expect(getInterval("A" as NoteName, "A" as NoteName)).toBe(0);
  });
});

describe("formatTransposeOffset", () => {
  it("formats positive offsets with +", () => {
    expect(formatTransposeOffset(3)).toBe("+3");
    expect(formatTransposeOffset(12)).toBe("+12");
  });

  it("formats negative offsets with -", () => {
    expect(formatTransposeOffset(-2)).toBe("-2");
    expect(formatTransposeOffset(-5)).toBe("-5");
  });

  it("formats zero as 0", () => {
    expect(formatTransposeOffset(0)).toBe("0");
  });
});

describe("getTransposedKey", () => {
  it("transposes key correctly", () => {
    expect(getTransposedKey("C" as NoteName, 5)).toBe("F");
    expect(getTransposedKey("G" as NoteName, 2)).toBe("A");
    expect(getTransposedKey("A" as NoteName, -3)).toBe("F#");
  });
});
