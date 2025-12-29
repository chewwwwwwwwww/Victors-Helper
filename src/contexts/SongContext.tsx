import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import type { ReactNode } from "react";
import type {
  Song,
  ChordReference,
  BarNotation,
  EditableSongMetadata,
  Block,
  BlockType,
  UUID,
  Chord,
  ContentBlock,
  ChordLyricsBlock,
} from "../types";
import type { ClipboardState } from "../types/clipboard";
import type { AccidentalPreference } from "../types/chord-theory";
import {
  insertBlock as insertBlockInTree,
  insertBlockBefore as insertBlockBeforeInTree,
  removeBlock as removeBlockFromTree,
  moveBlock as moveBlockInTree,
  moveBlockBefore as moveBlockBeforeInTree,
  updateBlock as updateBlockInTree,
  cloneBlock,
  createDefaultBlock,
  findBlock,
} from "../lib/block-utils";
import { createEmptySong } from "../lib/migration";
import type { LyricEditMode } from "../components/LyricEditor";
import {
  updateChordsOnLyricEdit,
  updateChordsLyricsOnly,
} from "../lib/chord-attachment";

interface SongContextValue {
  // Current document
  song: Song | null;
  isLoading: boolean;
  isDirty: boolean;

  // Load/create
  loadSong: (song: Song) => void;
  createNewSong: (title?: string) => void;

  // Chord operations
  insertChord: (blockId: UUID, chordSymbol: string, charIndex: number) => void;
  updateChord: (blockId: UUID, chordId: UUID, newSymbol: string) => void;
  moveChord: (ref: ChordReference, newCharIndex: number) => void;
  deleteChord: (blockId: UUID, chordId: UUID) => void;

  // Block operations
  insertBlock: (
    blockType: BlockType,
    afterBlockId: UUID | null,
    parentSectionId: UUID | null,
  ) => void;
  insertBlockBefore: (
    blockType: BlockType,
    beforeBlockId: UUID,
    parentSectionId: UUID | null,
  ) => void;
  insertBlockInstance: (
    block: Block,
    afterBlockId: UUID | null,
    parentSectionId: UUID | null,
  ) => void;
  moveBlock: (
    blockId: UUID,
    afterBlockId: UUID | null,
    newParentId: UUID | null,
  ) => void;
  moveBlockBefore: (
    blockId: UUID,
    beforeBlockId: UUID,
    newParentId: UUID | null,
  ) => void;
  deleteBlock: (blockId: UUID) => void;
  updateBlock: (blockId: UUID, updates: Partial<Block>) => void;
  duplicateBlock: (blockId: UUID) => void;
  updateBlockLyrics: (
    blockId: UUID,
    lyrics: string,
    mode: LyricEditMode,
  ) => void;

  // Clipboard operations
  clipboard: ClipboardState | null;
  copyBlock: (blockId: UUID) => void;
  pasteBlock: (afterBlockId: UUID | null, parentSectionId: UUID | null) => void;
  clearClipboard: () => void;

  // Song metadata
  setTitle: (title: string) => void;
  updateMetadata: (updates: Partial<EditableSongMetadata>) => void;
  transpose: (semitones: number) => void;

  // Bar notation
  setBarNotation: (blockId: UUID, barNotation: BarNotation | null) => void;

  // Column layout
  setSectionColumn: (
    sectionId: string,
    column: "left" | "right" | null,
  ) => void;
  setSectionOrder: (column: "left" | "right", newOrder: string[]) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Mark clean (after save)
  markClean: () => void;

  // Preferences
  accidentalPreference: AccidentalPreference;
  setAccidentalPreference: (pref: AccidentalPreference) => void;
}

const SongContext = createContext<SongContextValue | null>(null);

const MAX_HISTORY = 50;

interface SongProviderProps {
  children: ReactNode;
}

export function SongProvider({ children }: SongProviderProps) {
  const [song, setSong] = useState<Song | null>(null);
  const [isLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [accidentalPreference, setAccidentalPreference] =
    useState<AccidentalPreference>("auto");

  // History for undo/redo
  const pastRef = useRef<Song[]>([]);
  const futureRef = useRef<Song[]>([]);

  // Push current state to history
  const pushHistory = useCallback(() => {
    if (song) {
      pastRef.current = [...pastRef.current.slice(-MAX_HISTORY + 1), song];
      futureRef.current = [];
    }
  }, [song]);

  // Update song with history tracking
  const updateSong = useCallback(
    (updater: (s: Song) => Song) => {
      setSong((prev) => {
        if (!prev) return prev;
        pushHistory();
        const updated = updater(prev);
        setIsDirty(true);
        return {
          ...updated,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [pushHistory],
  );

  // Load a song
  const loadSong = useCallback((newSong: Song) => {
    pastRef.current = [];
    futureRef.current = [];
    setSong(newSong);
    setIsDirty(false);
  }, []);

  // Create new song
  const createNewSongFn = useCallback(
    (title?: string) => {
      const newSong = createEmptySong();
      if (title) {
        newSong.title = title;
      }
      loadSong(newSong);
    },
    [loadSong],
  );

  // Helper to update chords in blocks
  const updateChordInBlocks = useCallback(
    (
      blocks: Block[],
      blockId: UUID,
      chordId: UUID,
      updater: (chord: Chord) => Chord,
    ): Block[] => {
      return blocks.map((block) => {
        if (block.type === "chordLyricsLine" && block.id === blockId) {
          return {
            ...block,
            chords: block.chords.map((chord) =>
              chord.id === chordId ? updater(chord) : chord,
            ),
          };
        }
        if (block.type === "section") {
          return {
            ...block,
            children: updateChordInBlocks(
              block.children,
              blockId,
              chordId,
              updater,
            ) as ContentBlock[],
          };
        }
        return block;
      });
    },
    [],
  );

  // Helper to add chord to a block
  const addChordToBlocks = useCallback(
    (blocks: Block[], blockId: UUID, chord: Chord): Block[] => {
      return blocks.map((block) => {
        if (block.type === "chordLyricsLine" && block.id === blockId) {
          // Insert chord in sorted order by charIndex
          const newChords = [...block.chords, chord].sort(
            (a, b) => a.charIndex - b.charIndex,
          );
          return {
            ...block,
            chords: newChords,
          };
        }
        if (block.type === "section") {
          return {
            ...block,
            children: addChordToBlocks(
              block.children,
              blockId,
              chord,
            ) as ContentBlock[],
          };
        }
        return block;
      });
    },
    [],
  );

  // Insert chord
  const insertChord = useCallback(
    (blockId: UUID, chordSymbol: string, charIndex: number) => {
      const newChord: Chord = {
        id: crypto.randomUUID(),
        chord: chordSymbol,
        charIndex,
      };
      updateSong((s) => ({
        ...s,
        blocks: addChordToBlocks(s.blocks, blockId, newChord),
      }));
    },
    [updateSong, addChordToBlocks],
  );

  // Update chord symbol
  const updateChord = useCallback(
    (blockId: UUID, chordId: UUID, newSymbol: string) => {
      updateSong((s) => ({
        ...s,
        blocks: updateChordInBlocks(s.blocks, blockId, chordId, (chord) => ({
          ...chord,
          chord: newSymbol,
        })),
      }));
    },
    [updateSong, updateChordInBlocks],
  );

  // Move chord
  const moveChord = useCallback(
    (ref: ChordReference, newCharIndex: number) => {
      updateSong((s) => ({
        ...s,
        blocks: updateChordInBlocks(
          s.blocks,
          ref.lineId as UUID,
          ref.chordId as UUID,
          (chord) => ({
            ...chord,
            charIndex: newCharIndex,
          }),
        ),
      }));
    },
    [updateSong, updateChordInBlocks],
  );

  // Helper to delete chord from blocks
  const deleteChordFromBlocks = useCallback(
    (blocks: Block[], blockId: UUID, chordId: UUID): Block[] => {
      return blocks.map((block) => {
        if (block.type === "chordLyricsLine" && block.id === blockId) {
          return {
            ...block,
            chords: block.chords.filter((chord) => chord.id !== chordId),
          };
        }
        if (block.type === "section") {
          return {
            ...block,
            children: deleteChordFromBlocks(
              block.children,
              blockId,
              chordId,
            ) as ContentBlock[],
          };
        }
        return block;
      });
    },
    [],
  );

  // Delete chord
  const deleteChord = useCallback(
    (blockId: UUID, chordId: UUID) => {
      updateSong((s) => ({
        ...s,
        blocks: deleteChordFromBlocks(s.blocks, blockId, chordId),
      }));
    },
    [updateSong, deleteChordFromBlocks],
  );

  // Helper to update lyrics in a block with chord adjustment
  const updateBlockLyricsInTree = useCallback(
    (
      blocks: Block[],
      blockId: UUID,
      newLyrics: string,
      mode: LyricEditMode,
    ): Block[] => {
      return blocks.map((block) => {
        if (block.type === "chordLyricsLine" && block.id === blockId) {
          const chordLyricsBlock = block as ChordLyricsBlock;
          const oldLyrics = chordLyricsBlock.lyrics;

          // Apply appropriate chord adjustment based on mode
          const newChords =
            mode === "attached"
              ? updateChordsOnLyricEdit(
                  oldLyrics,
                  newLyrics,
                  chordLyricsBlock.chords,
                )
              : updateChordsLyricsOnly(
                  oldLyrics,
                  newLyrics,
                  chordLyricsBlock.chords,
                );

          return {
            ...block,
            lyrics: newLyrics,
            chords: newChords,
          };
        }
        if (block.type === "section") {
          return {
            ...block,
            children: updateBlockLyricsInTree(
              block.children,
              blockId,
              newLyrics,
              mode,
            ) as ContentBlock[],
          };
        }
        return block;
      });
    },
    [],
  );

  // Update block lyrics with mode
  const updateBlockLyrics = useCallback(
    (blockId: UUID, lyrics: string, mode: LyricEditMode) => {
      updateSong((s) => ({
        ...s,
        blocks: updateBlockLyricsInTree(s.blocks, blockId, lyrics, mode),
      }));
    },
    [updateSong, updateBlockLyricsInTree],
  );

  // Set title
  const setTitle = useCallback(
    (title: string) => {
      updateSong((s) => ({ ...s, title }));
    },
    [updateSong],
  );

  // Update metadata (multiple fields at once)
  const updateMetadata = useCallback(
    (updates: Partial<EditableSongMetadata>) => {
      updateSong((s) => ({ ...s, ...updates }));
    },
    [updateSong],
  );

  // Set bar notation for a block
  const setBarNotation = useCallback(
    (blockId: UUID, barNotation: BarNotation | null) => {
      updateSong((s) => ({
        ...s,
        blocks: updateBlockInTree(s.blocks, blockId, {
          barNotation: barNotation ?? undefined,
        } as Partial<Block>),
      }));
    },
    [updateSong],
  );

  // Set section column assignment
  const setSectionColumn = useCallback(
    (sectionId: string, column: "left" | "right" | null) => {
      updateSong((s) => {
        const newAssignments = { ...(s.columnAssignments || {}) };
        if (column === null) {
          delete newAssignments[sectionId];
        } else {
          newAssignments[sectionId] = column;
        }
        return {
          ...s,
          columnAssignments:
            Object.keys(newAssignments).length > 0 ? newAssignments : undefined,
        };
      });
    },
    [updateSong],
  );

  // Set section order for a column
  const setSectionOrder = useCallback(
    (column: "left" | "right", newOrder: string[]) => {
      updateSong((s) => ({
        ...s,
        sectionOrder: {
          ...s.sectionOrder,
          [column]: newOrder.length > 0 ? newOrder : undefined,
        },
      }));
    },
    [updateSong],
  );

  // ==========================================================================
  // BLOCK OPERATIONS
  // ==========================================================================

  // Insert a new block by type
  const insertBlock = useCallback(
    (
      blockType: BlockType,
      afterBlockId: UUID | null,
      parentSectionId: UUID | null,
    ) => {
      const newBlock = createDefaultBlock(blockType);
      updateSong((s) => ({
        ...s,
        blocks: insertBlockInTree(
          s.blocks,
          newBlock,
          afterBlockId,
          parentSectionId,
        ),
      }));
    },
    [updateSong],
  );

  // Insert a new block BEFORE a specific block
  const insertBlockBefore = useCallback(
    (
      blockType: BlockType,
      beforeBlockId: UUID,
      parentSectionId: UUID | null,
    ) => {
      const newBlock = createDefaultBlock(blockType);
      updateSong((s) => ({
        ...s,
        blocks: insertBlockBeforeInTree(
          s.blocks,
          newBlock,
          beforeBlockId,
          parentSectionId,
        ),
      }));
    },
    [updateSong],
  );

  // Insert an existing block instance
  const insertBlockInstance = useCallback(
    (block: Block, afterBlockId: UUID | null, parentSectionId: UUID | null) => {
      updateSong((s) => ({
        ...s,
        blocks: insertBlockInTree(
          s.blocks,
          block,
          afterBlockId,
          parentSectionId,
        ),
      }));
    },
    [updateSong],
  );

  // Move a block to a new position
  const moveBlockOp = useCallback(
    (blockId: UUID, afterBlockId: UUID | null, newParentId: UUID | null) => {
      updateSong((s) => ({
        ...s,
        blocks: moveBlockInTree(s.blocks, blockId, afterBlockId, newParentId),
      }));
    },
    [updateSong],
  );

  // Move a block to before a specific block
  const moveBlockBeforeOp = useCallback(
    (blockId: UUID, beforeBlockId: UUID, newParentId: UUID | null) => {
      updateSong((s) => ({
        ...s,
        blocks: moveBlockBeforeInTree(
          s.blocks,
          blockId,
          beforeBlockId,
          newParentId,
        ),
      }));
    },
    [updateSong],
  );

  // Delete a block
  const deleteBlock = useCallback(
    (blockId: UUID) => {
      updateSong((s) => ({
        ...s,
        blocks: removeBlockFromTree(s.blocks, blockId),
      }));
    },
    [updateSong],
  );

  // Update a block
  const updateBlockOp = useCallback(
    (blockId: UUID, updates: Partial<Block>) => {
      updateSong((s) => ({
        ...s,
        blocks: updateBlockInTree(s.blocks, blockId, updates),
      }));
    },
    [updateSong],
  );

  // Duplicate a block
  const duplicateBlock = useCallback(
    (blockId: UUID) => {
      if (!song) return;

      const block = findBlock(song.blocks, blockId);
      if (!block) return;

      const clonedBlock = cloneBlock(block);

      updateSong((s) => ({
        ...s,
        blocks: insertBlockInTree(s.blocks, clonedBlock, blockId, null),
      }));
    },
    [song, updateSong],
  );

  // ==========================================================================
  // CLIPBOARD OPERATIONS
  // ==========================================================================

  // Copy a block to clipboard
  const copyBlock = useCallback(
    (blockId: UUID) => {
      if (!song) return;

      const block = findBlock(song.blocks, blockId);
      if (!block) return;

      // Clone the block so clipboard is independent of original
      const clonedBlock = cloneBlock(block);

      setClipboard({
        blocks: [clonedBlock],
        sourceSongId: song.id,
        copiedAt: new Date().toISOString(),
      });
    },
    [song],
  );

  // Paste block(s) from clipboard
  const pasteBlock = useCallback(
    (afterBlockId: UUID | null, parentSectionId: UUID | null) => {
      if (!clipboard || clipboard.blocks.length === 0) return;

      // Clone blocks again for paste (so multiple pastes create unique IDs)
      const blocksToPaste = clipboard.blocks.map((b) => cloneBlock(b));

      updateSong((s) => {
        let newBlocks = s.blocks;
        let lastBlockId = afterBlockId;

        // Insert each block in sequence
        for (const block of blocksToPaste) {
          newBlocks = insertBlockInTree(
            newBlocks,
            block,
            lastBlockId,
            parentSectionId,
          );
          lastBlockId = block.id;
        }

        return { ...s, blocks: newBlocks };
      });
    },
    [clipboard, updateSong],
  );

  // Clear clipboard
  const clearClipboard = useCallback(() => {
    setClipboard(null);
  }, []);

  // Transpose
  const transpose = useCallback(
    (semitones: number) => {
      updateSong((s) => ({
        ...s,
        transpositionOffset: s.transpositionOffset + semitones,
      }));
    },
    [updateSong],
  );

  // Undo
  const undo = useCallback(() => {
    if (pastRef.current.length === 0 || !song) return;

    futureRef.current = [song, ...futureRef.current.slice(0, MAX_HISTORY - 1)];
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    setSong(previous);
    setIsDirty(true);
  }, [song]);

  // Redo
  const redo = useCallback(() => {
    if (futureRef.current.length === 0 || !song) return;

    pastRef.current = [...pastRef.current, song];
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    setSong(next);
    setIsDirty(true);
  }, [song]);

  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  const value: SongContextValue = {
    // Current document
    song,
    isLoading,
    isDirty,

    // Load/create
    loadSong,
    createNewSong: createNewSongFn,

    // Chord operations
    insertChord,
    updateChord,
    moveChord,
    deleteChord,

    // Block operations
    insertBlock,
    insertBlockBefore,
    insertBlockInstance,
    moveBlock: moveBlockOp,
    moveBlockBefore: moveBlockBeforeOp,
    deleteBlock,
    updateBlock: updateBlockOp,
    duplicateBlock,
    updateBlockLyrics,

    // Clipboard operations
    clipboard,
    copyBlock,
    pasteBlock,
    clearClipboard,

    // Song metadata
    setTitle,
    updateMetadata,
    transpose,

    // Bar notation
    setBarNotation,

    // Column layout
    setSectionColumn,
    setSectionOrder,

    // Undo/Redo
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,

    // Mark clean
    markClean,

    // Preferences
    accidentalPreference,
    setAccidentalPreference,
  };

  return <SongContext.Provider value={value}>{children}</SongContext.Provider>;
}

export function useSong(): SongContextValue {
  const context = useContext(SongContext);
  if (!context) {
    throw new Error("useSong must be used within a SongProvider");
  }
  return context;
}
