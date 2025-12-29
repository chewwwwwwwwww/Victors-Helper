import { describe, it, expect } from "vitest";
import {
  parseChord,
  isValidChord,
  isValidNote,
  normalizeChord,
} from "../src/lib/chord-parser";

describe("parseChord", () => {
  describe("basic major chords", () => {
    it("parses C", () => {
      const result = parseChord("C");
      expect(result.root).toBe("C");
      expect(result.quality).toBe("major");
      expect(result.suffix).toBe("");
      expect(result.isValid).toBe(true);
    });

    it("parses G", () => {
      const result = parseChord("G");
      expect(result.root).toBe("G");
      expect(result.quality).toBe("major");
      expect(result.isValid).toBe(true);
    });
  });

  describe("accidentals", () => {
    it("parses F#", () => {
      const result = parseChord("F#");
      expect(result.root).toBe("F#");
      expect(result.quality).toBe("major");
      expect(result.isValid).toBe(true);
    });

    it("parses Bb", () => {
      const result = parseChord("Bb");
      expect(result.root).toBe("Bb");
      expect(result.quality).toBe("major");
      expect(result.isValid).toBe(true);
    });

    it("parses Ab", () => {
      const result = parseChord("Ab");
      expect(result.root).toBe("Ab");
      expect(result.isValid).toBe(true);
    });
  });

  describe("minor chords", () => {
    it("parses Am", () => {
      const result = parseChord("Am");
      expect(result.root).toBe("A");
      expect(result.quality).toBe("minor");
      expect(result.suffix).toBe("m");
      expect(result.isValid).toBe(true);
    });

    it("parses F#m", () => {
      const result = parseChord("F#m");
      expect(result.root).toBe("F#");
      expect(result.quality).toBe("minor");
      expect(result.isValid).toBe(true);
    });

    it("parses Bbm", () => {
      const result = parseChord("Bbm");
      expect(result.root).toBe("Bb");
      expect(result.quality).toBe("minor");
      expect(result.isValid).toBe(true);
    });
  });

  describe("seventh chords", () => {
    it("parses G7", () => {
      const result = parseChord("G7");
      expect(result.root).toBe("G");
      expect(result.quality).toBe("dominant7");
      expect(result.suffix).toBe("7");
      expect(result.isValid).toBe(true);
    });

    it("parses Am7", () => {
      const result = parseChord("Am7");
      expect(result.root).toBe("A");
      expect(result.quality).toBe("minor7");
      expect(result.isValid).toBe(true);
    });

    it("parses Cmaj7", () => {
      const result = parseChord("Cmaj7");
      expect(result.root).toBe("C");
      expect(result.quality).toBe("major7");
      expect(result.isValid).toBe(true);
    });

    it("parses Dm7b5 (half-diminished)", () => {
      const result = parseChord("Dm7b5");
      expect(result.root).toBe("D");
      expect(result.quality).toBe("halfDiminished7");
      expect(result.isValid).toBe(true);
    });
  });

  describe("slash chords", () => {
    it("parses C/G", () => {
      const result = parseChord("C/G");
      expect(result.root).toBe("C");
      expect(result.bass).toBe("G");
      expect(result.isValid).toBe(true);
    });

    it("parses Am/E", () => {
      const result = parseChord("Am/E");
      expect(result.root).toBe("A");
      expect(result.quality).toBe("minor");
      expect(result.bass).toBe("E");
      expect(result.isValid).toBe(true);
    });

    it("parses F#m7/C#", () => {
      const result = parseChord("F#m7/C#");
      expect(result.root).toBe("F#");
      expect(result.quality).toBe("minor7");
      expect(result.bass).toBe("C#");
      expect(result.isValid).toBe(true);
    });

    it("parses Bb/D", () => {
      const result = parseChord("Bb/D");
      expect(result.root).toBe("Bb");
      expect(result.bass).toBe("D");
      expect(result.isValid).toBe(true);
    });
  });

  describe("suspended chords", () => {
    it("parses Dsus4", () => {
      const result = parseChord("Dsus4");
      expect(result.root).toBe("D");
      expect(result.quality).toBe("sus4");
      expect(result.isValid).toBe(true);
    });

    it("parses Dsus2", () => {
      const result = parseChord("Dsus2");
      expect(result.root).toBe("D");
      expect(result.quality).toBe("sus2");
      expect(result.isValid).toBe(true);
    });

    it("parses Asus", () => {
      const result = parseChord("Asus");
      expect(result.root).toBe("A");
      expect(result.quality).toBe("sus4");
      expect(result.isValid).toBe(true);
    });
  });

  describe("diminished and augmented", () => {
    it("parses Cdim", () => {
      const result = parseChord("Cdim");
      expect(result.root).toBe("C");
      expect(result.quality).toBe("diminished");
      expect(result.isValid).toBe(true);
    });

    it("parses Bdim7", () => {
      const result = parseChord("Bdim7");
      expect(result.root).toBe("B");
      expect(result.quality).toBe("diminished7");
      expect(result.isValid).toBe(true);
    });

    it("parses Caug", () => {
      const result = parseChord("Caug");
      expect(result.root).toBe("C");
      expect(result.quality).toBe("augmented");
      expect(result.isValid).toBe(true);
    });

    it("parses C+", () => {
      const result = parseChord("C+");
      expect(result.root).toBe("C");
      expect(result.quality).toBe("augmented");
      expect(result.isValid).toBe(true);
    });
  });

  describe("power chords", () => {
    it("parses G5", () => {
      const result = parseChord("G5");
      expect(result.root).toBe("G");
      expect(result.quality).toBe("power");
      expect(result.isValid).toBe(true);
    });
  });

  describe("no chord", () => {
    it("parses N.C.", () => {
      const result = parseChord("N.C.");
      expect(result.suffix).toBe("N.C.");
      expect(result.isValid).toBe(true);
    });

    it("parses NC", () => {
      const result = parseChord("NC");
      expect(result.suffix).toBe("N.C.");
      expect(result.isValid).toBe(true);
    });
  });

  describe("invalid chords", () => {
    it("returns invalid for empty string", () => {
      const result = parseChord("");
      expect(result.isValid).toBe(false);
    });

    it("returns invalid for non-chord text", () => {
      const result = parseChord("Hello");
      expect(result.isValid).toBe(false);
    });

    it("returns invalid for number only", () => {
      const result = parseChord("7");
      expect(result.isValid).toBe(false);
    });
  });
});

describe("isValidChord", () => {
  it("returns true for valid chords", () => {
    expect(isValidChord("C")).toBe(true);
    expect(isValidChord("Am7")).toBe(true);
    expect(isValidChord("F#m/C#")).toBe(true);
    expect(isValidChord("Bbmaj7")).toBe(true);
  });

  it("returns false for invalid chords", () => {
    expect(isValidChord("")).toBe(false);
    expect(isValidChord("XYZ")).toBe(false);
    expect(isValidChord("123")).toBe(false);
  });
});

describe("isValidNote", () => {
  it("returns true for valid notes", () => {
    expect(isValidNote("C")).toBe(true);
    expect(isValidNote("F#")).toBe(true);
    expect(isValidNote("Bb")).toBe(true);
    expect(isValidNote("G#")).toBe(true);
  });

  it("returns false for invalid notes", () => {
    expect(isValidNote("H")).toBe(false);
    expect(isValidNote("X")).toBe(false);
    expect(isValidNote("C##")).toBe(false);
  });
});

describe("normalizeChord", () => {
  it("normalizes chords consistently", () => {
    expect(normalizeChord("  C  ")).toBe("C");
    expect(normalizeChord("Am7")).toBe("Am7");
    expect(normalizeChord("F#m/C#")).toBe("F#m/C#");
  });
});
