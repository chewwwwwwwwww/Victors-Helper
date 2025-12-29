import type { Block } from "./song";

/** Clipboard state for copy/paste operations */
export interface ClipboardState {
  /** The copied block(s) - deep cloned from original */
  blocks: Block[];
  /** Source song ID (for potential cross-song paste) */
  sourceSongId: string;
  /** ISO timestamp of when the copy was made */
  copiedAt: string;
}
