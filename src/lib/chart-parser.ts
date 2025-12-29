import type { Song, Line, Chord, UUID, BarNotation } from "../types";
import { v4 as uuidv4 } from "uuid";
import { isValidChord } from "./chord-parser";

/**
 * Section info from AI parser
 */
interface ImportSection {
  header: string;
  isBarNotation: boolean;
  content: string;
}

/**
 * Parse bar notation string into BarNotation structure.
 *
 * Handles patterns like:
 * - "||:C |C |C |C :||" (with repeats)
 * - "C |G |Am |F" (without repeats)
 * - "|C |C |C |C |" (with bar lines)
 */
export function parseBarNotation(content: string): BarNotation | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  // Check for repeat markers
  const repeatStart = trimmed.startsWith("||:") || trimmed.startsWith("|:");
  const repeatEnd = trimmed.endsWith(":||") || trimmed.endsWith(":|");

  // Remove repeat markers and leading/trailing bars
  let barContent = trimmed
    .replace(/^\|\|?:?/, "") // Remove leading ||: or |: or | or ||
    .replace(/:?\|\|?$/, "") // Remove trailing :|| or :| or | or ||
    .trim();

  // Split by bar lines and extract chords
  const bars = barContent
    .split("|")
    .map((bar) => bar.trim())
    .filter((bar) => bar.length > 0)
    .map((bar) => {
      // First, try to extract chord from bracket notation [C] -> C
      const bracketMatch = bar.match(/\[([A-G][#b]?[^\]]*)\]/i);
      if (bracketMatch) {
        return bracketMatch[1];
      }
      // Then try to extract chord directly (may have multiple chords per bar, take first)
      const chordMatch = bar.match(
        /^([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|\d)*(?:\/[A-G][#b]?)?)/i,
      );
      return chordMatch ? chordMatch[1] : bar;
    });

  // Only return if we found valid bars
  if (bars.length === 0) return null;

  // Validate that at least some bars look like chords
  const validChordCount = bars.filter(isValidChord).length;
  if (validChordCount < bars.length / 2) {
    // Less than half are valid chords, probably not bar notation
    return null;
  }

  return {
    bars,
    repeatStart,
    repeatEnd,
  };
}

/**
 * Check if a line content appears to be bar notation.
 */
export function isBarNotationLine(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;

  // Patterns that indicate bar notation:
  // 1. Contains multiple | characters
  // 2. Starts with || or |
  // 3. Has repeat markers :||
  const barLinePattern = /\|.*\|/;
  const repeatPattern = /\|\|:|:\|\|/;

  return barLinePattern.test(trimmed) || repeatPattern.test(trimmed);
}

/**
 * Parse bracket notation text into a Song structure.
 *
 * Format: [Chord]lyrics where [Chord] appears immediately before the syllable
 *
 * Example:
 *   "[G]Amazing [D]grace how [C]sweet the [G]sound"
 *   becomes lyrics "Amazing grace how sweet the sound"
 *   with chords G at 0, D at 8, C at 19, G at 30
 */
export function parseFromBracketNotation(
  text: string,
  options: { title?: string; id?: UUID; sections?: ImportSection[] } = {},
): Song {
  const parsedLines: Line[] = [];

  // If we have sections from AI parser, use them for bar notation detection
  if (options.sections && options.sections.length > 0) {
    for (const section of options.sections) {
      // Add section header as a line
      if (section.header) {
        parsedLines.push({
          id: uuidv4(),
          lyrics: section.header,
          chords: [],
        });
      }

      // Parse content based on whether it's bar notation
      if (section.isBarNotation) {
        // Parse bar notation
        const barNotation = parseBarNotation(section.content);
        parsedLines.push({
          id: uuidv4(),
          lyrics: "",
          chords: [],
          barNotation: barNotation || undefined,
        });
      } else {
        // Parse bracket notation lines
        const contentLines = section.content.split(/\r?\n/);
        for (const line of contentLines) {
          const parsedLine = parseBracketLine(line);
          parsedLines.push(parsedLine);
        }
      }

      // Add empty line after section
      parsedLines.push({
        id: uuidv4(),
        lyrics: "",
        chords: [],
      });
    }
  } else {
    // Fallback: parse text directly with auto-detection
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      // Check if line looks like bar notation
      if (isBarNotationLine(line)) {
        const barNotation = parseBarNotation(line);
        if (barNotation) {
          parsedLines.push({
            id: uuidv4(),
            lyrics: "",
            chords: [],
            barNotation,
          });
          continue;
        }
      }

      // Normal bracket notation parsing
      const parsedLine = parseBracketLine(line);
      parsedLines.push(parsedLine);
    }
  }

  const now = new Date().toISOString();

  return {
    id: options.id || uuidv4(),
    title: options.title,
    createdAt: now,
    updatedAt: now,
    lines: parsedLines,
    transpositionOffset: 0,
  };
}

/**
 * Parse a single line with bracket notation.
 */
function parseBracketLine(line: string): Line {
  const chords: Chord[] = [];
  let lyrics = "";
  let i = 0;

  while (i < line.length) {
    if (line[i] === "[") {
      // Find closing bracket
      const closeIndex = line.indexOf("]", i);
      if (closeIndex === -1) {
        // No closing bracket, treat as literal
        lyrics += line[i];
        i++;
        continue;
      }

      const chordSymbol = line.slice(i + 1, closeIndex);

      // Only treat as chord if it's a valid chord symbol
      if (chordSymbol && isValidChord(chordSymbol)) {
        chords.push({
          id: uuidv4(),
          chord: chordSymbol,
          charIndex: lyrics.length,
        });
        i = closeIndex + 1;
      } else {
        // Not a valid chord, include brackets in lyrics
        lyrics += line[i];
        i++;
      }
    } else {
      lyrics += line[i];
      i++;
    }
  }

  return {
    id: uuidv4(),
    lyrics,
    chords,
  };
}

/**
 * Convert a BarNotation to string format.
 */
export function barNotationToString(barNotation: BarNotation): string {
  const { bars, repeatStart, repeatEnd } = barNotation;
  const barContent = bars.join(" |");
  const prefix = repeatStart ? "||:" : "|";
  const suffix = repeatEnd ? ":||" : "|";
  return `${prefix}${barContent} ${suffix}`;
}

/**
 * Convert a Song back to bracket notation.
 */
export function toBracketNotation(song: Song): string {
  const lines: string[] = [];

  for (const line of song.lines) {
    // Handle bar notation lines
    if (line.barNotation) {
      lines.push(barNotationToString(line.barNotation));
    } else {
      lines.push(lineToBracketNotation(line));
    }
  }

  return lines.join("\n");
}

/**
 * Convert a single line to bracket notation.
 */
function lineToBracketNotation(line: Line): string {
  if (line.chords.length === 0) {
    return line.lyrics;
  }

  // Sort chords by charIndex descending to insert from end
  const sortedChords = [...line.chords].sort(
    (a, b) => b.charIndex - a.charIndex,
  );

  let result = line.lyrics;

  for (const chord of sortedChords) {
    const insertPos = Math.min(chord.charIndex, result.length);
    result =
      result.slice(0, insertPos) + `[${chord.chord}]` + result.slice(insertPos);
  }

  return result;
}

/**
 * Create an empty song with default values.
 */
export function createEmptySong(title?: string): Song {
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    title: title || "Untitled Song",
    createdAt: now,
    updatedAt: now,
    lines: [
      {
        id: uuidv4(),
        lyrics: "",
        chords: [],
      },
    ],
    transpositionOffset: 0,
  };
}

/**
 * Create a sample song for testing/demo purposes.
 */
export function createSampleSong(): Song {
  const bracketText = `Verse 1
[G]Amazing [G7]grace how [C]sweet the [G]sound
That [G]saved a [Em]wretch like [D]me
[G]I once was [G7]lost but [C]now am [G]found
Was [Em]blind but [D]now I [G]see

Verse 2
[G]'Twas [G7]grace that [C]taught my [G]heart to fear
And [G]grace my [Em]fears re[D]lieved
[G]How [G7]precious [C]did that [G]grace appear
The [Em]hour I [D]first be[G]lieved

Chorus
[C]My chains are [G]gone, I've been set [D]free
[C]My God my [G]Savior has [D]ransomed [G]me
[C]And like a [G]flood His [D]mercy [Em]reigns
Un[C]ending [D]love, a[G]mazing grace

Verse 3
[G]The Lord has [G7]promised [C]good to [G]me
His [G]word my [Em]hope se[D]cures
[G]He will my [G7]shield and [C]portion [G]be
As [Em]long as [D]life en[G]dures

Verse 4
[G]Through many [G7]dangers [C]toils and [G]snares
I [G]have al[Em]ready [D]come
[G]'Tis [G7]grace hath [C]brought me [G]safe thus far
And [Em]grace will [D]lead me [G]home

Bridge
[Em]The [C]earth shall [G]soon dis[D]solve like snow
The [Em]sun for[C]bear to [G]shine
But [C]God who [G]called me [D]here be[Em]low
Will [C]be for[D]ever [G]mine

Chorus
[C]My chains are [G]gone, I've been set [D]free
[C]My God my [G]Savior has [D]ransomed [G]me
[C]And like a [G]flood His [D]mercy [Em]reigns
Un[C]ending [D]love, a[G]mazing grace

Ending
[G]When we've been [G7]there ten [C]thousand [G]years
Bright [G]shining [Em]as the [D]sun
[G]We've no less [G7]days to [C]sing God's [G]praise
Than [Em]when we [D]first be[G]gun`;

  return parseFromBracketNotation(bracketText, { title: "Amazing Grace" });
}

/**
 * Detect if text contains bracket notation chords.
 */
export function hasBracketChords(text: string): boolean {
  const bracketPattern = /\[[A-G][#b]?[^[\]]*\]/;
  return bracketPattern.test(text);
}

/**
 * Extract all unique chord symbols from bracket notation text.
 */
export function extractChords(text: string): string[] {
  const matches = text.match(/\[([^\]]+)\]/g) || [];
  const chords = matches.map((m) => m.slice(1, -1));
  return [...new Set(chords)].filter(isValidChord);
}
