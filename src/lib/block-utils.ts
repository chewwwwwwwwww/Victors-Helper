/**
 * Utility functions for manipulating the block tree structure.
 * All functions are pure and return new data structures (immutable).
 */

import type {
  Block,
  SectionBlock,
  ContentBlock,
  UUID,
  Chord,
  ChordLyricsBlock,
  BarNotationBlock,
  FreeTextBlock,
  BlockType,
  SectionType,
  BarNotation,
} from "../types/song";

// =============================================================================
// BLOCK FINDING UTILITIES
// =============================================================================

/** Result of finding a block, includes parent info */
export interface BlockSearchResult {
  block: Block;
  parent: SectionBlock | null;
  indexInParent: number;
}

/**
 * Find a block by ID in the block tree
 */
export function findBlock(blocks: Block[], id: UUID): Block | null {
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.type === "section") {
      const found = findBlock(block.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find a block with its parent context
 */
export function findBlockWithParent(
  blocks: Block[],
  id: UUID,
  parent: SectionBlock | null = null,
): BlockSearchResult | null {
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.id === id) {
      return { block, parent, indexInParent: i };
    }
    if (block.type === "section") {
      const found = findBlockWithParent(block.children, id, block);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find the parent section of a block
 */
export function findParentSection(
  blocks: Block[],
  childId: UUID,
): SectionBlock | null {
  for (const block of blocks) {
    if (block.type === "section") {
      if (block.children.some((c) => c.id === childId)) {
        return block;
      }
    }
  }
  return null;
}

/**
 * Get all block IDs in the tree (flattened)
 */
export function getAllBlockIds(blocks: Block[]): UUID[] {
  const ids: UUID[] = [];
  for (const block of blocks) {
    ids.push(block.id);
    if (block.type === "section") {
      ids.push(...getAllBlockIds(block.children));
    }
  }
  return ids;
}

/**
 * Get all section blocks (non-recursive - only top-level sections)
 */
export function getSectionBlocks(blocks: Block[]): SectionBlock[] {
  return blocks.filter((b): b is SectionBlock => b.type === "section");
}

// =============================================================================
// BLOCK MANIPULATION UTILITIES
// =============================================================================

/**
 * Remove a block from the tree by ID
 * Returns new blocks array with the block removed
 */
export function removeBlock(blocks: Block[], id: UUID): Block[] {
  return blocks
    .filter((block) => block.id !== id)
    .map((block) => {
      if (block.type === "section") {
        return {
          ...block,
          children: block.children.filter((c) => c.id !== id),
        };
      }
      return block;
    });
}

/**
 * Insert a block at a specific position
 *
 * @param blocks - The current blocks array
 * @param newBlock - The block to insert
 * @param afterBlockId - Insert after this block ID (null = insert at beginning)
 * @param parentId - Parent section ID (null = insert at root level)
 */
export function insertBlock(
  blocks: Block[],
  newBlock: Block,
  afterBlockId: UUID | null,
  parentId: UUID | null,
): Block[] {
  // Insert at root level
  if (parentId === null) {
    if (afterBlockId === null) {
      // Insert at the beginning
      return [newBlock, ...blocks];
    }

    // Find position and insert after
    const idx = blocks.findIndex((b) => b.id === afterBlockId);
    if (idx === -1) {
      // Not found at root, might be inside a section - insert at end
      return [...blocks, newBlock];
    }

    const result = [...blocks];
    result.splice(idx + 1, 0, newBlock);
    return result;
  }

  // Insert inside a section
  return blocks.map((block) => {
    if (block.id === parentId && block.type === "section") {
      const children = [...block.children];

      if (afterBlockId === null) {
        // Insert at the beginning of section
        return { ...block, children: [newBlock as ContentBlock, ...children] };
      }

      const idx = children.findIndex((c) => c.id === afterBlockId);
      if (idx === -1) {
        // Not found, insert at end of section
        return { ...block, children: [...children, newBlock as ContentBlock] };
      }

      children.splice(idx + 1, 0, newBlock as ContentBlock);
      return { ...block, children };
    }
    return block;
  });
}

/**
 * Insert a block BEFORE a specific block
 *
 * @param blocks - The current blocks array
 * @param newBlock - The block to insert
 * @param beforeBlockId - Insert before this block ID
 * @param parentId - Parent section ID (null = insert at root level)
 */
export function insertBlockBefore(
  blocks: Block[],
  newBlock: Block,
  beforeBlockId: UUID,
  parentId: UUID | null,
): Block[] {
  // Insert at root level
  if (parentId === null) {
    const idx = blocks.findIndex((b) => b.id === beforeBlockId);
    if (idx === -1) {
      // Not found at root, insert at beginning as fallback
      return [newBlock, ...blocks];
    }

    const result = [...blocks];
    result.splice(idx, 0, newBlock);
    return result;
  }

  // Insert inside a section
  return blocks.map((block) => {
    if (block.id === parentId && block.type === "section") {
      const children = [...block.children];
      const idx = children.findIndex((c) => c.id === beforeBlockId);

      if (idx === -1) {
        // Not found, insert at beginning of section
        return { ...block, children: [newBlock as ContentBlock, ...children] };
      }

      children.splice(idx, 0, newBlock as ContentBlock);
      return { ...block, children };
    }
    return block;
  });
}

/**
 * Move a block to a new position (after a specific block)
 */
export function moveBlock(
  blocks: Block[],
  blockId: UUID,
  afterBlockId: UUID | null,
  newParentId: UUID | null,
): Block[] {
  // First, find and remove the block
  const searchResult = findBlockWithParent(blocks, blockId);
  if (!searchResult) return blocks;

  const { block } = searchResult;

  // Remove from current position
  let newBlocks = removeBlock(blocks, blockId);

  // Insert at new position
  newBlocks = insertBlock(newBlocks, block, afterBlockId, newParentId);

  return newBlocks;
}

/**
 * Move a block to a new position (before a specific block)
 */
export function moveBlockBefore(
  blocks: Block[],
  blockId: UUID,
  beforeBlockId: UUID,
  newParentId: UUID | null,
): Block[] {
  // First, find and remove the block
  const searchResult = findBlockWithParent(blocks, blockId);
  if (!searchResult) return blocks;

  const { block } = searchResult;

  // Remove from current position
  let newBlocks = removeBlock(blocks, blockId);

  // Insert before the target
  newBlocks = insertBlockBefore(newBlocks, block, beforeBlockId, newParentId);

  return newBlocks;
}

/**
 * Update a block in place
 */
export function updateBlock(
  blocks: Block[],
  blockId: UUID,
  updates: Partial<Block>,
): Block[] {
  return blocks.map((block) => {
    if (block.id === blockId) {
      return { ...block, ...updates } as Block;
    }
    if (block.type === "section") {
      return {
        ...block,
        children: block.children.map((child) =>
          child.id === blockId
            ? ({ ...child, ...updates } as ContentBlock)
            : child,
        ),
      };
    }
    return block;
  });
}

// =============================================================================
// BLOCK CLONING UTILITIES
// =============================================================================

/**
 * Deep clone a block with new IDs
 */
export function cloneBlock<T extends Block>(block: T): T {
  const newId = crypto.randomUUID();

  if (block.type === "section") {
    return {
      ...block,
      id: newId,
      children: block.children.map((c) => cloneBlock(c) as ContentBlock),
    } as T;
  }

  if (block.type === "chordLyricsLine") {
    return {
      ...block,
      id: newId,
      chords: block.chords.map((c) => ({
        ...c,
        id: crypto.randomUUID(),
      })),
    } as T;
  }

  // barNotationLine, freeText - simple clone
  return { ...block, id: newId } as T;
}

/**
 * Clone multiple blocks
 */
export function cloneBlocks(blocks: Block[]): Block[] {
  return blocks.map((b) => cloneBlock(b));
}

// =============================================================================
// BLOCK CREATION UTILITIES
// =============================================================================

/**
 * Create a new empty section block
 */
export function createSectionBlock(
  label: string = "New Section",
  sectionType: SectionType = "custom",
): SectionBlock {
  return {
    id: crypto.randomUUID(),
    type: "section",
    label,
    sectionType,
    children: [],
  };
}

/**
 * Create a new chord/lyrics block
 */
export function createChordLyricsBlock(
  lyrics?: string,
  chords?: Chord[],
): ChordLyricsBlock {
  // Default placeholder lyrics and chords if none provided
  const defaultLyrics = "Add your lyrics here...";
  const defaultChords: Chord[] = [
    { id: crypto.randomUUID(), chord: "C", charIndex: 0 },
    { id: crypto.randomUUID(), chord: "G", charIndex: 10 },
    { id: crypto.randomUUID(), chord: "Am", charIndex: 20 },
  ];

  return {
    id: crypto.randomUUID(),
    type: "chordLyricsLine",
    lyrics: lyrics ?? defaultLyrics,
    chords: chords ?? defaultChords,
  };
}

/**
 * Create a new bar notation block
 */
export function createBarNotationBlock(
  barNotation?: Partial<BarNotation>,
): BarNotationBlock {
  return {
    id: crypto.randomUUID(),
    type: "barNotationLine",
    barNotation: {
      bars: barNotation?.bars ?? [""],
      repeatStart: barNotation?.repeatStart ?? false,
      repeatEnd: barNotation?.repeatEnd ?? false,
    },
  };
}

/**
 * Create a new free text block
 */
export function createFreeTextBlock(text: string = ""): FreeTextBlock {
  return {
    id: crypto.randomUUID(),
    type: "freeText",
    text,
  };
}

/**
 * Create a default block based on type
 */
export function createDefaultBlock(blockType: BlockType): Block {
  switch (blockType) {
    case "section":
      return createSectionBlock();
    case "chordLyricsLine":
      return createChordLyricsBlock();
    case "barNotationLine":
      return createBarNotationBlock();
    case "freeText":
      return createFreeTextBlock();
  }
}

// =============================================================================
// CHORD UTILITIES (for ChordLyricsBlock)
// =============================================================================

/**
 * Insert a chord into a chord/lyrics block
 */
export function insertChordInBlock(
  blocks: Block[],
  blockId: UUID,
  chord: Chord,
): Block[] {
  return updateBlock(blocks, blockId, {
    chords: (() => {
      const block = findBlock(blocks, blockId);
      if (!block || block.type !== "chordLyricsLine") return [];
      const newChords = [...block.chords, chord].sort(
        (a, b) => a.charIndex - b.charIndex,
      );
      return newChords;
    })(),
  } as Partial<ChordLyricsBlock>);
}

/**
 * Update a chord in a chord/lyrics block
 */
export function updateChordInBlock(
  blocks: Block[],
  blockId: UUID,
  chordId: UUID,
  updates: Partial<Chord>,
): Block[] {
  return blocks.map((block) => {
    if (block.id === blockId && block.type === "chordLyricsLine") {
      return {
        ...block,
        chords: block.chords.map((c) =>
          c.id === chordId ? { ...c, ...updates } : c,
        ),
      };
    }
    if (block.type === "section") {
      return {
        ...block,
        children: block.children.map((child) => {
          if (child.id === blockId && child.type === "chordLyricsLine") {
            return {
              ...child,
              chords: child.chords.map((c) =>
                c.id === chordId ? { ...c, ...updates } : c,
              ),
            };
          }
          return child;
        }),
      };
    }
    return block;
  });
}

/**
 * Delete a chord from a chord/lyrics block
 */
export function deleteChordFromBlock(
  blocks: Block[],
  blockId: UUID,
  chordId: UUID,
): Block[] {
  return blocks.map((block) => {
    if (block.id === blockId && block.type === "chordLyricsLine") {
      return {
        ...block,
        chords: block.chords.filter((c) => c.id !== chordId),
      };
    }
    if (block.type === "section") {
      return {
        ...block,
        children: block.children.map((child) => {
          if (child.id === blockId && child.type === "chordLyricsLine") {
            return {
              ...child,
              chords: child.chords.filter((c) => c.id !== chordId),
            };
          }
          return child;
        }),
      };
    }
    return block;
  });
}

// =============================================================================
// FLATTENING UTILITIES (for rendering/layout)
// =============================================================================

/** A flattened block with depth info for rendering */
export interface FlattenedBlock {
  block: Block;
  depth: number;
  parentId: UUID | null;
  indexInParent: number;
}

/**
 * Flatten blocks for linear rendering (preserves depth info)
 */
export function flattenBlocks(
  blocks: Block[],
  depth: number = 0,
  parentId: UUID | null = null,
): FlattenedBlock[] {
  const result: FlattenedBlock[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    result.push({ block, depth, parentId, indexInParent: i });

    if (block.type === "section") {
      result.push(...flattenBlocks(block.children, depth + 1, block.id));
    }
  }

  return result;
}

/**
 * Count total blocks in tree (including nested)
 */
export function countBlocks(blocks: Block[]): number {
  let count = 0;
  for (const block of blocks) {
    count += 1;
    if (block.type === "section") {
      count += countBlocks(block.children);
    }
  }
  return count;
}
