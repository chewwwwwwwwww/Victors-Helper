import type {
  Song,
  Block,
  SectionBlock,
  ChordLyricsBlock,
  BarNotationBlock,
  Chord,
  BarNotation,
  UUID,
  SectionType,
} from "../types";
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
 * Section header patterns (case insensitive)
 */
const SECTION_HEADER_PATTERNS = [
  /^(verse|chorus|bridge|intro|outro|pre-chorus|prechorus|turnaround|tag|coda|interlude|instrumental|hook|refrain|ending|vamp|solo|breakdown)\s*\d*\s*:?\s*$/i,
  /^\[.*\]$/, // Bracketed headers like [Verse 1]
  /^<.*>$/, // Angle bracket headers like <Chorus>
];

/**
 * Check if a string is a section header
 */
function isSectionHeader(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return SECTION_HEADER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Extract section type from a header string
 */
function extractSectionType(header: string): SectionType {
  const lower = header.toLowerCase();

  if (lower.includes("intro")) return "intro";
  if (lower.includes("verse")) return "verse";
  if (lower.includes("chorus")) return "chorus";
  if (lower.includes("bridge")) return "bridge";
  if (lower.includes("pre-chorus") || lower.includes("prechorus"))
    return "pre-chorus";
  if (lower.includes("outro") || lower.includes("ending")) return "outro";
  if (lower.includes("interlude")) return "interlude";
  if (
    lower.includes("instrumental") ||
    lower.includes("solo") ||
    lower.includes("breakdown")
  )
    return "instrumental";
  if (lower.includes("tag") || lower.includes("turnaround")) return "tag";
  if (lower.includes("coda")) return "coda";

  return "custom";
}

/**
 * Clean up a section header label (remove brackets, colons, etc.)
 */
function cleanSectionLabel(header: string): string {
  return header
    .trim()
    .replace(/^\[|\]$/g, "") // Remove [ ]
    .replace(/^<|>$/g, "") // Remove < >
    .replace(/:$/, "") // Remove trailing colon
    .trim();
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
 * Parse a single line with bracket notation into a ChordLyricsBlock.
 */
function parseBracketLine(line: string): ChordLyricsBlock {
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
    type: "chordLyricsLine",
    lyrics,
    chords,
  };
}

/**
 * Parse bracket notation text into a block-based Song structure.
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
  const blocks: Block[] = [];
  let currentSection: SectionBlock | null = null;

  // Helper to push current section to blocks
  const flushSection = () => {
    if (currentSection && currentSection.children.length > 0) {
      blocks.push(currentSection);
      currentSection = null;
    }
  };

  // If we have sections from AI parser, use them
  if (options.sections && options.sections.length > 0) {
    for (const section of options.sections) {
      // Start a new section
      currentSection = {
        id: uuidv4(),
        type: "section",
        label: cleanSectionLabel(section.header) || "Section",
        sectionType: extractSectionType(section.header),
        children: [],
      };

      // Parse content based on whether it's bar notation
      if (section.isBarNotation) {
        const barNotation = parseBarNotation(section.content);
        if (barNotation) {
          currentSection.children.push({
            id: uuidv4(),
            type: "barNotationLine",
            barNotation,
          });
        }
      } else {
        // Parse bracket notation lines
        const contentLines = section.content.split(/\r?\n/);
        for (const line of contentLines) {
          const trimmed = line.trim();
          if (trimmed) {
            currentSection.children.push(parseBracketLine(line));
          }
        }
      }

      flushSection();
    }
  } else {
    // Fallback: parse text directly with auto-detection
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines (they act as section separators)
      if (!trimmed) {
        flushSection();
        continue;
      }

      // Check if this is a section header
      if (isSectionHeader(trimmed)) {
        flushSection();
        currentSection = {
          id: uuidv4(),
          type: "section",
          label: cleanSectionLabel(trimmed),
          sectionType: extractSectionType(trimmed),
          children: [],
        };
        continue;
      }

      // Check if line looks like bar notation
      if (isBarNotationLine(line)) {
        const barNotation = parseBarNotation(line);
        if (barNotation) {
          const barBlock: BarNotationBlock = {
            id: uuidv4(),
            type: "barNotationLine",
            barNotation,
          };
          if (currentSection) {
            currentSection.children.push(barBlock);
          } else {
            blocks.push(barBlock);
          }
          continue;
        }
      }

      // Normal bracket notation parsing
      const chordLyricsBlock = parseBracketLine(line);
      if (currentSection) {
        currentSection.children.push(chordLyricsBlock);
      } else {
        blocks.push(chordLyricsBlock);
      }
    }

    flushSection();
  }

  const now = new Date().toISOString();

  return {
    id: options.id || uuidv4(),
    version: 2,
    title: options.title,
    createdAt: now,
    updatedAt: now,
    blocks,
    transpositionOffset: 0,
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
 * Convert a block-based Song to bracket notation.
 */
export function toBracketNotation(song: Song): string {
  const lines: string[] = [];

  function processBlock(block: Block) {
    if (block.type === "section") {
      // Add section header
      lines.push(`[${block.label}]`);
      // Process children
      for (const child of block.children) {
        processBlock(child);
      }
      // Add empty line after section
      lines.push("");
    } else if (block.type === "chordLyricsLine") {
      lines.push(chordLyricsBlockToBracketNotation(block));
    } else if (block.type === "barNotationLine") {
      lines.push(barNotationToString(block.barNotation));
    } else if (block.type === "freeText") {
      lines.push(block.text);
    }
  }

  for (const block of song.blocks) {
    processBlock(block);
  }

  return lines.join("\n");
}

/**
 * Convert a ChordLyricsBlock to bracket notation.
 */
function chordLyricsBlockToBracketNotation(block: ChordLyricsBlock): string {
  if (block.chords.length === 0) {
    return block.lyrics;
  }

  // Sort chords by charIndex descending to insert from end
  const sortedChords = [...block.chords].sort(
    (a, b) => b.charIndex - a.charIndex,
  );

  let result = block.lyrics;

  for (const chord of sortedChords) {
    const insertPos = Math.min(chord.charIndex, result.length);
    result =
      result.slice(0, insertPos) + `[${chord.chord}]` + result.slice(insertPos);
  }

  return result;
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
