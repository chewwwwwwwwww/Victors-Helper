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
  SongV2,
  AnySong,
  ChordReference,
  Line,
  BarNotation,
  EditableSongMetadata,
  Block,
  BlockType,
  UUID,
} from "../types";
import type { ClipboardState } from "../types/clipboard";
import type { AccidentalPreference } from "../types/chord-theory";
import { v4 as uuidv4 } from "uuid";
import {
  insertChord as insertChordInLine,
  moveChord as moveChordInLine,
  updateChord as updateChordInLine,
  deleteChord as deleteChordInLine,
  updateLyrics as updateLyricsInLine,
} from "../lib/char-index-utils";
import { createEmptySong, createSampleSong } from "../lib/chart-parser";
import {
  updateChordsOnLyricEdit,
  updateChordsLyricsOnly,
} from "../lib/chord-attachment";
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
import { isSongV2 } from "../types/song";
import { migrateV1ToV2, createEmptySongV2 } from "../lib/migration";
import type { LyricEditMode } from "../components/LyricEditor";

interface SongContextValue {
  // Current document (supports both V1 and V2)
  song: Song | null;
  songV2: SongV2 | null;
  isLoading: boolean;
  isDirty: boolean;

  // Load/create
  loadSong: (song: AnySong) => void;
  createNewSong: (title?: string) => void;
  loadSampleSong: () => void;
  createNewSongV2: (title?: string) => void;

  // Chord operations (V1 - for backward compatibility)
  insertChord: (lineId: string, chordSymbol: string, charIndex: number) => void;
  updateChord: (lineId: string, chordId: string, newSymbol: string) => void;
  moveChord: (ref: ChordReference, newCharIndex: number) => void;
  deleteChord: (lineId: string, chordId: string) => void;

  // Line operations (V1 - for backward compatibility)
  updateLine: (lineId: string, lyrics: string) => void;
  updateLineWithMode: (
    lineId: string,
    lyrics: string,
    mode: LyricEditMode,
  ) => void;
  insertLine: (afterLineId: string | null) => void;
  deleteLine: (lineId: string) => void;

  // Block operations (V2)
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
  setBarNotation: (lineId: string, barNotation: BarNotation | null) => void;

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
  // Support both V1 (song) and V2 (songV2) - V2 is primary going forward
  const [song, setSong] = useState<Song | null>(null);
  const [songV2, setSongV2] = useState<SongV2 | null>(null);
  const [isLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [accidentalPreference, setAccidentalPreference] =
    useState<AccidentalPreference>("auto");

  // History for undo/redo (stores V2 songs)
  const pastRef = useRef<SongV2[]>([]);
  const futureRef = useRef<SongV2[]>([]);

  // Push current state to history
  const pushHistory = useCallback(() => {
    if (songV2) {
      pastRef.current = [...pastRef.current.slice(-MAX_HISTORY + 1), songV2];
      futureRef.current = [];
    }
  }, [songV2]);

  // Update V2 song with history tracking
  const updateSongV2 = useCallback(
    (updater: (s: SongV2) => SongV2) => {
      setSongV2((prev) => {
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

  // Legacy: Update V1 song with history tracking (kept for backward compatibility)
  const updateSong = useCallback((updater: (s: Song) => Song) => {
    setSong((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      setIsDirty(true);
      return {
        ...updated,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Load a song (auto-migrates V1 to V2)
  const loadSong = useCallback((newSong: AnySong) => {
    pastRef.current = [];
    futureRef.current = [];

    if (isSongV2(newSong)) {
      setSongV2(newSong);
      setSong(null); // Clear V1 state
    } else {
      // Migrate V1 to V2
      const migratedSong = migrateV1ToV2(newSong);
      setSongV2(migratedSong);
      setSong(newSong); // Keep V1 for backward compatibility
    }
    setIsDirty(false);
  }, []);

  // Create new V1 song (legacy)
  const createNewSong = useCallback(
    (title?: string) => {
      const newSong = createEmptySong(title);
      loadSong(newSong);
    },
    [loadSong],
  );

  // Create new V2 song (preferred)
  const createNewSongV2 = useCallback(
    (title?: string) => {
      const newSong = createEmptySongV2();
      if (title) {
        newSong.title = title;
      }
      loadSong(newSong);
    },
    [loadSong],
  );

  // Load sample song
  const loadSampleSong = useCallback(() => {
    loadSong(createSampleSong());
  }, [loadSong]);

  // Insert chord
  const insertChord = useCallback(
    (lineId: string, chordSymbol: string, charIndex: number) => {
      updateSong((s) => ({
        ...s,
        lines: s.lines.map((line) =>
          line.id === lineId
            ? insertChordInLine(line, chordSymbol, charIndex)
            : line,
        ),
      }));
    },
    [updateSong],
  );

  // Update chord symbol
  const updateChord = useCallback(
    (lineId: string, chordId: string, newSymbol: string) => {
      updateSong((s) => ({
        ...s,
        lines: s.lines.map((line) =>
          line.id === lineId
            ? updateChordInLine(line, chordId, newSymbol)
            : line,
        ),
      }));
    },
    [updateSong],
  );

  // Move chord
  const moveChord = useCallback(
    (ref: ChordReference, newCharIndex: number) => {
      updateSong((s) => ({
        ...s,
        lines: s.lines.map((line) =>
          line.id === ref.lineId
            ? moveChordInLine(line, ref.chordId, newCharIndex)
            : line,
        ),
      }));
    },
    [updateSong],
  );

  // Delete chord
  const deleteChord = useCallback(
    (lineId: string, chordId: string) => {
      updateSong((s) => ({
        ...s,
        lines: s.lines.map((line) =>
          line.id === lineId ? deleteChordInLine(line, chordId) : line,
        ),
      }));
    },
    [updateSong],
  );

  // Update line lyrics (simple version, uses char-index shifting)
  const updateLine = useCallback(
    (lineId: string, lyrics: string) => {
      updateSong((s) => ({
        ...s,
        lines: s.lines.map((line) =>
          line.id === lineId ? updateLyricsInLine(line, lyrics) : line,
        ),
      }));
    },
    [updateSong],
  );

  // Update line lyrics with mode (attached/detached chord behavior)
  const updateLineWithMode = useCallback(
    (lineId: string, lyrics: string, mode: LyricEditMode) => {
      updateSong((s) => ({
        ...s,
        lines: s.lines.map((line) => {
          if (line.id !== lineId) return line;

          // Apply appropriate chord adjustment based on mode
          const newChords =
            mode === "attached"
              ? updateChordsOnLyricEdit(line.lyrics, lyrics, line.chords)
              : updateChordsLyricsOnly(line.lyrics, lyrics, line.chords);

          return {
            ...line,
            lyrics,
            chords: newChords,
          };
        }),
      }));
    },
    [updateSong],
  );

  // Insert new line
  const insertLine = useCallback(
    (afterLineId: string | null) => {
      updateSong((s) => {
        const newLine: Line = {
          id: uuidv4(),
          lyrics: "",
          chords: [],
        };

        if (afterLineId === null) {
          return { ...s, lines: [newLine, ...s.lines] };
        }

        const index = s.lines.findIndex((l) => l.id === afterLineId);
        if (index === -1) {
          return { ...s, lines: [...s.lines, newLine] };
        }

        const newLines = [...s.lines];
        newLines.splice(index + 1, 0, newLine);
        return { ...s, lines: newLines };
      });
    },
    [updateSong],
  );

  // Delete line
  const deleteLine = useCallback(
    (lineId: string) => {
      updateSong((s) => {
        // Don't delete last line
        if (s.lines.length <= 1) return s;
        return { ...s, lines: s.lines.filter((l) => l.id !== lineId) };
      });
    },
    [updateSong],
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

  // Set bar notation for a line
  const setBarNotation = useCallback(
    (lineId: string, barNotation: BarNotation | null) => {
      updateSong((s) => ({
        ...s,
        lines: s.lines.map((line) =>
          line.id === lineId
            ? {
                ...line,
                barNotation: barNotation ?? undefined,
                // Clear chords when switching to bar notation
                chords: barNotation ? [] : line.chords,
              }
            : line,
        ),
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
  // BLOCK OPERATIONS (V2)
  // ==========================================================================

  // Insert a new block by type
  const insertBlock = useCallback(
    (
      blockType: BlockType,
      afterBlockId: UUID | null,
      parentSectionId: UUID | null,
    ) => {
      const newBlock = createDefaultBlock(blockType);
      updateSongV2((s) => ({
        ...s,
        blocks: insertBlockInTree(
          s.blocks,
          newBlock,
          afterBlockId,
          parentSectionId,
        ),
      }));
    },
    [updateSongV2],
  );

  // Insert a new block BEFORE a specific block
  const insertBlockBefore = useCallback(
    (
      blockType: BlockType,
      beforeBlockId: UUID,
      parentSectionId: UUID | null,
    ) => {
      const newBlock = createDefaultBlock(blockType);
      updateSongV2((s) => ({
        ...s,
        blocks: insertBlockBeforeInTree(
          s.blocks,
          newBlock,
          beforeBlockId,
          parentSectionId,
        ),
      }));
    },
    [updateSongV2],
  );

  // Insert an existing block instance
  const insertBlockInstance = useCallback(
    (block: Block, afterBlockId: UUID | null, parentSectionId: UUID | null) => {
      updateSongV2((s) => ({
        ...s,
        blocks: insertBlockInTree(
          s.blocks,
          block,
          afterBlockId,
          parentSectionId,
        ),
      }));
    },
    [updateSongV2],
  );

  // Move a block to a new position
  const moveBlockOp = useCallback(
    (blockId: UUID, afterBlockId: UUID | null, newParentId: UUID | null) => {
      updateSongV2((s) => ({
        ...s,
        blocks: moveBlockInTree(s.blocks, blockId, afterBlockId, newParentId),
      }));
    },
    [updateSongV2],
  );

  // Move a block to before a specific block
  const moveBlockBeforeOp = useCallback(
    (blockId: UUID, beforeBlockId: UUID, newParentId: UUID | null) => {
      updateSongV2((s) => ({
        ...s,
        blocks: moveBlockBeforeInTree(
          s.blocks,
          blockId,
          beforeBlockId,
          newParentId,
        ),
      }));
    },
    [updateSongV2],
  );

  // Delete a block
  const deleteBlock = useCallback(
    (blockId: UUID) => {
      updateSongV2((s) => ({
        ...s,
        blocks: removeBlockFromTree(s.blocks, blockId),
      }));
    },
    [updateSongV2],
  );

  // Update a block
  const updateBlockOp = useCallback(
    (blockId: UUID, updates: Partial<Block>) => {
      updateSongV2((s) => ({
        ...s,
        blocks: updateBlockInTree(s.blocks, blockId, updates),
      }));
    },
    [updateSongV2],
  );

  // Duplicate a block
  const duplicateBlock = useCallback(
    (blockId: UUID) => {
      if (!songV2) return;

      const block = findBlock(songV2.blocks, blockId);
      if (!block) return;

      const clonedBlock = cloneBlock(block);

      updateSongV2((s) => ({
        ...s,
        blocks: insertBlockInTree(s.blocks, clonedBlock, blockId, null),
      }));
    },
    [songV2, updateSongV2],
  );

  // ==========================================================================
  // CLIPBOARD OPERATIONS
  // ==========================================================================

  // Copy a block to clipboard
  const copyBlock = useCallback(
    (blockId: UUID) => {
      if (!songV2) return;

      const block = findBlock(songV2.blocks, blockId);
      if (!block) return;

      // Clone the block so clipboard is independent of original
      const clonedBlock = cloneBlock(block);

      setClipboard({
        blocks: [clonedBlock],
        sourceSongId: songV2.id,
        copiedAt: new Date().toISOString(),
      });
    },
    [songV2],
  );

  // Paste block(s) from clipboard
  const pasteBlock = useCallback(
    (afterBlockId: UUID | null, parentSectionId: UUID | null) => {
      if (!clipboard || clipboard.blocks.length === 0) return;

      // Clone blocks again for paste (so multiple pastes create unique IDs)
      const blocksToPaste = clipboard.blocks.map((b) => cloneBlock(b));

      updateSongV2((s) => {
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
    [clipboard, updateSongV2],
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

  // Undo (works with V2)
  const undo = useCallback(() => {
    if (pastRef.current.length === 0 || !songV2) return;

    futureRef.current = [
      songV2,
      ...futureRef.current.slice(0, MAX_HISTORY - 1),
    ];
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    setSongV2(previous);
    setIsDirty(true);
  }, [songV2]);

  // Redo (works with V2)
  const redo = useCallback(() => {
    if (futureRef.current.length === 0 || !songV2) return;

    pastRef.current = [...pastRef.current, songV2];
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    setSongV2(next);
    setIsDirty(true);
  }, [songV2]);

  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  const value: SongContextValue = {
    // Current document (V1 and V2)
    song,
    songV2,
    isLoading,
    isDirty,

    // Load/create
    loadSong,
    createNewSong,
    loadSampleSong,
    createNewSongV2,

    // Chord operations (V1)
    insertChord,
    updateChord,
    moveChord,
    deleteChord,

    // Line operations (V1)
    updateLine,
    updateLineWithMode,
    insertLine,
    deleteLine,

    // Block operations (V2)
    insertBlock,
    insertBlockBefore,
    insertBlockInstance,
    moveBlock: moveBlockOp,
    moveBlockBefore: moveBlockBeforeOp,
    deleteBlock,
    updateBlock: updateBlockOp,
    duplicateBlock,

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
