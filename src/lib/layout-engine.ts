import type { FontMetrics } from "../types/rendering";

/** Default font metrics for layout */
export const DEFAULT_FONT_METRICS: FontMetrics = {
  charWidth: 9.6,
  lineHeight: 24,
  fontSize: 16,
  chordRowHeight: 28,
};

/**
 * Find which character index a pixel X position corresponds to.
 */
export function pixelXToCharIndex(
  pixelX: number,
  charWidth: number,
  maxLength: number,
): number {
  const rawIndex = Math.round(pixelX / charWidth);
  return Math.max(0, Math.min(rawIndex, maxLength));
}
