import { describe, it, expect } from "vitest";
import {
  parseFromBracketNotation,
  toBracketNotation,
  createEmptySong,
  hasBracketChords,
  extractChords,
} from "../src/lib/chart-parser";

describe("parseFromBracketNotation", () => {
  describe("basic parsing", () => {
    it("parses a simple line with one chord", () => {
      const song = parseFromBracketNotation("[G]Amazing grace");

      expect(song.lines).toHaveLength(1);
      expect(song.lines[0].lyrics).toBe("Amazing grace");
      expect(song.lines[0].chords).toHaveLength(1);
      expect(song.lines[0].chords[0].chord).toBe("G");
      expect(song.lines[0].chords[0].charIndex).toBe(0);
    });

    it("parses multiple chords in a line", () => {
      const song = parseFromBracketNotation("[G]Amazing [D]grace how [C]sweet");

      expect(song.lines[0].lyrics).toBe("Amazing grace how sweet");
      expect(song.lines[0].chords).toHaveLength(3);
      expect(song.lines[0].chords[0].chord).toBe("G");
      expect(song.lines[0].chords[0].charIndex).toBe(0);
      expect(song.lines[0].chords[1].chord).toBe("D");
      expect(song.lines[0].chords[1].charIndex).toBe(8); // After "Amazing "
      expect(song.lines[0].chords[2].chord).toBe("C");
      expect(song.lines[0].chords[2].charIndex).toBe(18); // After "Amazing grace how "
    });

    it("parses multiple lines", () => {
      const text = `[G]Amazing grace
[C]How sweet the [G]sound`;

      const song = parseFromBracketNotation(text);

      expect(song.lines).toHaveLength(2);
      expect(song.lines[0].lyrics).toBe("Amazing grace");
      expect(song.lines[1].lyrics).toBe("How sweet the sound");
    });

    it("handles lines without chords", () => {
      const text = `[G]Verse one
Bridge without chords
[C]Verse two`;

      const song = parseFromBracketNotation(text);

      expect(song.lines).toHaveLength(3);
      expect(song.lines[0].chords).toHaveLength(1);
      expect(song.lines[1].chords).toHaveLength(0);
      expect(song.lines[1].lyrics).toBe("Bridge without chords");
      expect(song.lines[2].chords).toHaveLength(1);
    });
  });

  describe("complex chords", () => {
    it("parses minor chords", () => {
      const song = parseFromBracketNotation("[Am]Hello [Em]world");

      expect(song.lines[0].chords[0].chord).toBe("Am");
      expect(song.lines[0].chords[1].chord).toBe("Em");
    });

    it("parses seventh chords", () => {
      const song = parseFromBracketNotation("[G7]Hello [Cmaj7]world");

      expect(song.lines[0].chords[0].chord).toBe("G7");
      expect(song.lines[0].chords[1].chord).toBe("Cmaj7");
    });

    it("parses slash chords", () => {
      const song = parseFromBracketNotation("[C/G]Hello [Am/E]world");

      expect(song.lines[0].chords[0].chord).toBe("C/G");
      expect(song.lines[0].chords[1].chord).toBe("Am/E");
    });

    it("parses chords with accidentals", () => {
      const song = parseFromBracketNotation("[F#m]Hello [Bb]world [Ab7]test");

      expect(song.lines[0].chords[0].chord).toBe("F#m");
      expect(song.lines[0].chords[1].chord).toBe("Bb");
      expect(song.lines[0].chords[2].chord).toBe("Ab7");
    });
  });

  describe("edge cases", () => {
    it("handles empty input", () => {
      const song = parseFromBracketNotation("");

      expect(song.lines).toHaveLength(1);
      expect(song.lines[0].lyrics).toBe("");
      expect(song.lines[0].chords).toHaveLength(0);
    });

    it("handles unclosed brackets", () => {
      const song = parseFromBracketNotation("[G Amazing grace");

      // Should treat unclosed bracket as literal
      expect(song.lines[0].lyrics).toBe("[G Amazing grace");
    });

    it("handles invalid chord in brackets", () => {
      const song = parseFromBracketNotation("[XYZ]Hello [G]world");

      // XYZ is not a valid chord, so it stays as literal
      expect(song.lines[0].lyrics).toBe("[XYZ]Hello world");
      expect(song.lines[0].chords).toHaveLength(1);
      expect(song.lines[0].chords[0].chord).toBe("G");
    });

    it("handles chord at end of line", () => {
      const song = parseFromBracketNotation("Hello [G]");

      expect(song.lines[0].lyrics).toBe("Hello ");
      expect(song.lines[0].chords).toHaveLength(1);
      expect(song.lines[0].chords[0].charIndex).toBe(6);
    });

    it("handles consecutive chords", () => {
      const song = parseFromBracketNotation("[G][Am][D]Hello");

      expect(song.lines[0].lyrics).toBe("Hello");
      expect(song.lines[0].chords).toHaveLength(3);
      expect(song.lines[0].chords[0].charIndex).toBe(0);
      expect(song.lines[0].chords[1].charIndex).toBe(0);
      expect(song.lines[0].chords[2].charIndex).toBe(0);
    });
  });

  describe("options", () => {
    it("uses provided title", () => {
      const song = parseFromBracketNotation("[G]Hello", {
        title: "Test Song",
      });

      expect(song.title).toBe("Test Song");
    });

    it("uses provided id", () => {
      const song = parseFromBracketNotation("[G]Hello", {
        id: "custom-id-123",
      });

      expect(song.id).toBe("custom-id-123");
    });
  });
});

describe("toBracketNotation", () => {
  it("converts song back to bracket notation", () => {
    const original = "[G]Amazing [D]grace";
    const song = parseFromBracketNotation(original);
    const result = toBracketNotation(song);

    expect(result).toBe(original);
  });

  it("handles multiple lines", () => {
    const original = `[G]Line one
[C]Line two`;
    const song = parseFromBracketNotation(original);
    const result = toBracketNotation(song);

    expect(result).toBe(original);
  });

  it("handles lines without chords", () => {
    const original = `[G]First line
Plain line
[C]Last line`;
    const song = parseFromBracketNotation(original);
    const result = toBracketNotation(song);

    expect(result).toBe(original);
  });

  it("roundtrips complex chords", () => {
    const original = "[F#m7/C#]Hello [Bbmaj7]world";
    const song = parseFromBracketNotation(original);
    const result = toBracketNotation(song);

    expect(result).toBe(original);
  });
});

describe("createEmptySong", () => {
  it("creates a song with default title", () => {
    const song = createEmptySong();

    expect(song.title).toBe("Untitled Song");
    expect(song.lines).toHaveLength(1);
    expect(song.lines[0].lyrics).toBe("");
    expect(song.lines[0].chords).toHaveLength(0);
    expect(song.transpositionOffset).toBe(0);
  });

  it("creates a song with custom title", () => {
    const song = createEmptySong("My Song");

    expect(song.title).toBe("My Song");
  });

  it("generates valid ids and timestamps", () => {
    const song = createEmptySong();

    expect(song.id).toBeTruthy();
    expect(song.createdAt).toBeTruthy();
    expect(song.updatedAt).toBeTruthy();
    expect(song.lines[0].id).toBeTruthy();
  });
});

describe("hasBracketChords", () => {
  it("returns true for text with valid chords", () => {
    expect(hasBracketChords("[G]Hello")).toBe(true);
    expect(hasBracketChords("Hello [Am] world")).toBe(true);
    expect(hasBracketChords("[F#m7]test")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(hasBracketChords("Hello world")).toBe(false);
    expect(hasBracketChords("")).toBe(false);
  });

  it("returns false for invalid chord patterns", () => {
    expect(hasBracketChords("[xyz]text")).toBe(false);
    expect(hasBracketChords("[123]text")).toBe(false);
  });
});

describe("extractChords", () => {
  it("extracts unique valid chords", () => {
    const chords = extractChords("[G]Hello [Am]world [G]again");

    expect(chords).toContain("G");
    expect(chords).toContain("Am");
    expect(chords).toHaveLength(2); // G appears twice but should be unique
  });

  it("filters out invalid chords", () => {
    const chords = extractChords("[G]Hello [invalid]world [Am]test");

    expect(chords).toContain("G");
    expect(chords).toContain("Am");
    expect(chords).not.toContain("invalid");
    expect(chords).toHaveLength(2);
  });

  it("returns empty array for no chords", () => {
    const chords = extractChords("Hello world");

    expect(chords).toHaveLength(0);
  });
});
