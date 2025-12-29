/**
 * Song creation utilities.
 */

import type { Song, SectionType } from "../types/song";

/** Section header patterns (case insensitive) */
export const SECTION_HEADER_PATTERNS = [
  /^(verse|chorus|bridge|intro|outro|pre-chorus|prechorus|turnaround|tag|coda|interlude|instrumental|hook|refrain|ending|vamp|solo|breakdown)\s*\d*\s*:?\s*$/i,
  /^\[.*\]$/, // Bracketed headers like [Verse 1]
  /^<.*>$/, // Angle bracket headers like <Chorus>
];

/**
 * Check if a lyrics string is a section header
 */
export function isSectionHeader(lyrics: string): boolean {
  const trimmed = lyrics.trim();
  if (!trimmed) return false;
  return SECTION_HEADER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Extract section type from a header string
 */
export function extractSectionType(header: string): SectionType {
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
export function cleanSectionLabel(header: string): string {
  return header
    .trim()
    .replace(/^\[|\]$/g, "") // Remove [ ]
    .replace(/^<|>$/g, "") // Remove < >
    .replace(/:$/, "") // Remove trailing colon
    .trim();
}

/**
 * Create a new empty song
 */
export function createEmptySong(): Song {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    version: 2,
    title: "Untitled Song",
    createdAt: now,
    updatedAt: now,
    transpositionOffset: 0,
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "section",
        label: "Verse 1",
        sectionType: "verse",
        children: [
          {
            id: crypto.randomUUID(),
            type: "chordLyricsLine",
            lyrics: "",
            chords: [],
          },
        ],
      },
    ],
  };
}
