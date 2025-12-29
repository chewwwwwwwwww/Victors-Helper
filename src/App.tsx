import { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { SongProvider, useSong } from "./contexts/SongContext";
import { usePersistence } from "./hooks/usePersistence";
import { useImportQueue } from "./hooks/useImportQueue";
import { usePDFExport } from "./hooks/usePDFExport";
import { useLogoStorage } from "./hooks/useLogoStorage";
import {
  BlockBasedChartViewer,
  Toolbar,
  EmptyState,
  ImportModal,
  ExportModal,
  ChordEditor,
  LeftSidebar,
  PlaylistModal,
  DeleteSongDialog,
} from "./components";
import { ToastContainer } from "./components/ImportToast";
import type { LyricEditMode } from "./components/LyricEditor";
import type {
  ChordReference,
  ExportOptions,
  Song,
  BlockType,
  UUID,
} from "./types";
import type { PDFExportMode } from "./types/ui";
import type { Playlist } from "./types/playlist";
import { createSampleSong } from "./lib/chart-parser";

function AppContent() {
  const {
    song,
    isDirty,
    loadSong,
    createNewSong,
    updateChord,
    moveChord,
    deleteChord,
    updateBlockLyrics,
    setTitle,
    updateMetadata,
    transpose,
    undo,
    redo,
    canUndo,
    canRedo,
    accidentalPreference,
    // Block operations
    insertBlock,
    insertBlockBefore,
    moveBlock,
    moveBlockBefore,
    copyBlock,
    pasteBlock,
    deleteBlock,
    duplicateBlock,
    clipboard,
  } = useSong();

  const persistence = usePersistence();
  const importQueue = useImportQueue();
  const pdfExport = usePDFExport();
  const logoStorage = useLogoStorage();

  // UI State
  const [selectedChords, setSelectedChords] = useState<ChordReference[]>([]);
  const [editingChord, setEditingChord] = useState<{
    ref: ChordReference;
    value: string;
    x: number;
    y: number;
  } | null>(null);
  const [chordsVisible, setChordsVisible] = useState(true);
  const [activeModal, setActiveModal] = useState<
    | "import"
    | "export"
    | "bulkExport"
    | "createPlaylist"
    | "editPlaylist"
    | "deleteSong"
    | null
  >(null);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [bulkExportSongs, setBulkExportSongs] = useState<Song[]>([]);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [lyricEditMode, setLyricEditMode] = useState<LyricEditMode>("attached");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Block selection state (for V2 block-based editing)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // DnD state for block dragging
  const [activeDragType, setActiveDragType] = useState<
    "block" | "newBlockTemplate" | null
  >(null);
  const [activeBlockType, setActiveBlockType] = useState<BlockType | null>(
    null,
  );

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const chartRef = useRef<HTMLDivElement>(null);

  // Track whether initial load has happened to prevent reload loops
  const initialLoadDoneRef = useRef(false);

  // Auto-save effect
  // Use a ref to avoid recreating the effect on every persistence change
  const saveSongRef = useRef(persistence.saveSong);
  saveSongRef.current = persistence.saveSong;

  useEffect(() => {
    if (song && isDirty) {
      const timeoutId = setTimeout(() => {
        saveSongRef.current(song);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [song, isDirty]);

  // Load initial song or show empty state - ONLY runs on actual initial load
  useEffect(() => {
    // Skip if already loaded or currently have a song
    if (initialLoadDoneRef.current || song) {
      return;
    }

    if (!persistence.isLoading && persistence.songs.length > 0) {
      const mostRecent = persistence.getSongList()[0];
      if (mostRecent) {
        const loadedSong = persistence.loadSong(mostRecent.id);
        if (loadedSong) {
          loadSong(loadedSong);
          initialLoadDoneRef.current = true;
        }
      }
    }
  }, [persistence.isLoading, song, loadSong, persistence]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when editing
      if (editingChord) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Redo with Ctrl+Y
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
        return;
      }

      // Copy block (Ctrl/Cmd+C)
      if ((e.metaKey || e.ctrlKey) && e.key === "c" && selectedBlockId) {
        e.preventDefault();
        copyBlock(selectedBlockId);
        return;
      }

      // Paste block (Ctrl/Cmd+V)
      if ((e.metaKey || e.ctrlKey) && e.key === "v" && clipboard) {
        e.preventDefault();
        pasteBlock(selectedBlockId, null);
        return;
      }

      // Duplicate block (Ctrl/Cmd+D)
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && selectedBlockId) {
        e.preventDefault();
        duplicateBlock(selectedBlockId);
        return;
      }

      // Delete selected block
      if ((e.key === "Delete" || e.key === "Backspace") && selectedBlockId) {
        e.preventDefault();
        deleteBlock(selectedBlockId);
        setSelectedBlockId(null);
        return;
      }

      // Delete selected chords (only if no block selected)
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedChords.length > 0
      ) {
        e.preventDefault();
        selectedChords.forEach((ref) => {
          deleteChord(ref.lineId, ref.chordId);
        });
        setSelectedChords([]);
        return;
      }

      // Escape to clear selection
      if (e.key === "Escape") {
        setSelectedBlockId(null);
        setSelectedChords([]);
        return;
      }

      // Arrow keys for nudging chords
      if (
        (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
        selectedChords.length > 0 &&
        song
      ) {
        e.preventDefault();
        const delta = e.key === "ArrowLeft" ? -1 : 1;
        const amount = e.shiftKey ? 5 : 1;

        // Helper to find chord in blocks
        const findChordInBlocks = (
          blocks: import("./types").Block[],
          lineId: string,
          chordId: string,
        ): { charIndex: number } | null => {
          for (const block of blocks) {
            if (block.type === "chordLyricsLine" && block.id === lineId) {
              const chord = block.chords.find((c) => c.id === chordId);
              if (chord) return { charIndex: chord.charIndex };
            }
            if (block.type === "section") {
              const found = findChordInBlocks(block.children, lineId, chordId);
              if (found) return found;
            }
          }
          return null;
        };

        selectedChords.forEach((ref) => {
          const found = findChordInBlocks(song.blocks, ref.lineId, ref.chordId);
          if (found) {
            const newCharIndex = Math.max(0, found.charIndex + delta * amount);
            moveChord(ref, newCharIndex);
          }
        });
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    song,
    selectedChords,
    editingChord,
    undo,
    redo,
    deleteChord,
    moveChord,
    selectedBlockId,
    copyBlock,
    pasteBlock,
    duplicateBlock,
    deleteBlock,
    clipboard,
  ]);

  // Handlers
  const handleChordSelect = useCallback((ref: ChordReference) => {
    setSelectedChords([ref]);
  }, []);

  const handleChordDoubleClick = useCallback(
    (ref: ChordReference, event?: React.MouseEvent) => {
      if (!song) return;

      // Search in blocks
      const findChordInBlocks = (
        blocks: import("./types").Block[],
      ): string | null => {
        for (const block of blocks) {
          if (block.type === "chordLyricsLine" && block.id === ref.lineId) {
            const chord = block.chords.find((c) => c.id === ref.chordId);
            if (chord) return chord.chord;
          }
          if (block.type === "section") {
            const found = findChordInBlocks(block.children);
            if (found) return found;
          }
        }
        return null;
      };
      const chordSymbol = findChordInBlocks(song.blocks);

      if (chordSymbol) {
        // Get chord position from the clicked element or mouse position
        let x = 100;
        let y = 100;

        if (event) {
          // Position near the click
          const target = event.currentTarget as HTMLElement;
          const rect = target.getBoundingClientRect();
          x = rect.left;
          y = rect.bottom + 4; // Below the chord
        } else {
          // Try to find the chord element by data attribute
          const chordElement = document.querySelector(
            `[data-chord-id="${ref.chordId}"]`,
          );
          if (chordElement) {
            const rect = chordElement.getBoundingClientRect();
            x = rect.left;
            y = rect.bottom + 4;
          }
        }

        setEditingChord({
          ref,
          value: chordSymbol,
          x,
          y,
        });
        setSelectedChords([ref]);
      }
    },
    [song],
  );

  const handleChordCommit = useCallback(
    (ref: ChordReference, newValue: string) => {
      updateChord(ref.lineId, ref.chordId, newValue);
      setEditingChord(null);
    },
    [updateChord],
  );

  const handleChordDelete = useCallback(
    (ref: ChordReference) => {
      deleteChord(ref.lineId, ref.chordId);
      setEditingChord(null);
      setSelectedChords([]);
    },
    [deleteChord],
  );

  const handleChordMove = useCallback(
    (ref: ChordReference, newCharIndex: number) => {
      moveChord(ref, newCharIndex);
    },
    [moveChord],
  );

  const handleLyricCommit = useCallback(
    (blockId: string, newValue: string, mode: LyricEditMode) => {
      updateBlockLyrics(blockId as UUID, newValue, mode);
      setEditingLineId(null);
    },
    [updateBlockLyrics],
  );

  const handleLyricCancel = useCallback(() => {
    setEditingLineId(null);
  }, []);

  const handleLyricEnter = useCallback(
    (blockId: string) => {
      // Insert a new chord/lyrics block after this one
      insertBlock("chordLyricsLine", blockId as UUID, null);
      setEditingLineId(null);
    },
    [insertBlock],
  );

  // Block DnD handlers
  const handleBlockDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    if (data?.type === "newBlockTemplate") {
      setActiveDragType("newBlockTemplate");
      setActiveBlockType(data.blockType as BlockType);
    } else if (data?.type === "block") {
      setActiveDragType("block");
      setActiveBlockType(null);
    }
  }, []);

  const handleBlockDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Reset drag state
      setActiveDragType(null);
      setActiveBlockType(null);

      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      // Determine target block, parent section, and position
      let targetBlockId: UUID | null = null;
      let parentSectionId: UUID | null = null;
      let position: "before" | "after" = "after";

      if (overData?.type === "emptyContainer") {
        // Dropping into an empty section/container
        targetBlockId = null;
        parentSectionId = overData.parentSectionId ?? null;
        position = "after";
      } else if (overData?.targetBlockId) {
        targetBlockId = overData.targetBlockId;
        parentSectionId = overData.parentSectionId ?? null;
        position = overData.position ?? "after";
      } else if (overData?.type === "block") {
        // Dropping directly onto a block
        const overBlockType = overData.blockType as BlockType | undefined;

        if (overBlockType === "section") {
          // Dropping onto a section - insert into the section's children
          targetBlockId = null; // Insert at beginning of section
          parentSectionId = over.id as UUID; // The section itself is the parent
          position = "after";
        } else {
          // Dropping onto a non-section block
          targetBlockId = over.id as UUID;
          parentSectionId = overData.parentSectionId ?? null;
        }
      }

      if (activeData?.type === "newBlockTemplate") {
        // Create new block from toolbar drag
        const blockType = activeData.blockType as BlockType;
        // Sections cannot be nested - force to root level
        const effectiveParentId =
          blockType === "section" ? null : parentSectionId;

        if (position === "before" && targetBlockId) {
          insertBlockBefore(blockType, targetBlockId, effectiveParentId);
        } else {
          insertBlock(blockType, targetBlockId, effectiveParentId);
        }
      } else if (activeData?.type === "block") {
        // Move existing block
        const blockId = active.id as UUID;
        if (blockId !== targetBlockId && blockId !== parentSectionId) {
          // Check if the block being moved is a section (sections cannot be nested)
          const blockType = activeData.blockType as BlockType | undefined;
          const effectiveParentId =
            blockType === "section" ? null : parentSectionId;

          if (position === "before" && targetBlockId) {
            moveBlockBefore(blockId, targetBlockId, effectiveParentId);
          } else {
            moveBlock(blockId, targetBlockId, effectiveParentId);
          }
        }
      }
    },
    [insertBlock, insertBlockBefore, moveBlock, moveBlockBefore],
  );

  const handleNewSong = useCallback(() => {
    createNewSong();
    setSelectedChords([]);
    setEditingChord(null);
  }, [createNewSong]);

  const handleLoadSample = useCallback(() => {
    const sampleSong = createSampleSong();
    persistence.saveSong(sampleSong);
    loadSong(sampleSong);
    setSelectedChords([]);
    setEditingChord(null);
  }, [persistence, loadSong]);

  const handleLoadSong = useCallback(
    (id: string) => {
      const loadedSong = persistence.loadSong(id);
      if (loadedSong) {
        loadSong(loadedSong);
        setSelectedChords([]);
        setEditingChord(null);
      }
    },
    [persistence, loadSong],
  );

  const handleDeleteSong = useCallback(
    (id: string) => {
      persistence.deleteSong(id);
      if (song?.id === id) {
        const remaining = persistence.getSongList().filter((s) => s.id !== id);
        if (remaining.length > 0) {
          const nextSong = persistence.loadSong(remaining[0].id);
          if (nextSong) {
            loadSong(nextSong);
          }
        } else {
          createNewSong();
        }
      }
    },
    [persistence, song, loadSong, createNewSong],
  );

  const handleImport = useCallback(() => {
    setActiveModal("import");
  }, []);

  // Playlist handlers
  const handleCreatePlaylist = useCallback(() => {
    setActiveModal("createPlaylist");
  }, []);

  const handleSavePlaylist = useCallback(
    (name: string) => {
      if (activeModal === "createPlaylist") {
        persistence.createPlaylist(name);
      } else if (activeModal === "editPlaylist" && editingPlaylist) {
        persistence.updatePlaylist({ ...editingPlaylist, name });
      }
      setActiveModal(null);
      setEditingPlaylist(null);
    },
    [activeModal, editingPlaylist, persistence],
  );

  const handleDeletePlaylist = useCallback(
    (playlistId: string) => {
      persistence.deletePlaylist(playlistId);
    },
    [persistence],
  );

  const handleAddToPlaylist = useCallback(
    (playlistId: string, songId: string) => {
      persistence.addSongToPlaylist(playlistId, songId);
    },
    [persistence],
  );

  const handleRemoveFromPlaylist = useCallback(
    (playlistId: string, songId: string) => {
      persistence.removeSongFromPlaylist(playlistId, songId);
    },
    [persistence],
  );

  const handleDeleteSongClick = useCallback(() => {
    setActiveModal("deleteSong");
  }, []);

  // Duplicate current song (for toolbar)
  const handleDuplicateSong = useCallback(() => {
    if (song) {
      const duplicated = persistence.duplicateSong(song.id);
      if (duplicated) {
        loadSong(duplicated);
        setSelectedChords([]);
        setEditingChord(null);
      }
    }
  }, [song, persistence, loadSong]);

  // Duplicate any song by ID (for sidebar)
  const handleDuplicateSongById = useCallback(
    (songId: string) => {
      const duplicated = persistence.duplicateSong(songId);
      if (duplicated) {
        loadSong(duplicated);
        setSelectedChords([]);
        setEditingChord(null);
      }
    },
    [persistence, loadSong],
  );

  const handleConfirmDeleteSong = useCallback(() => {
    if (song) {
      handleDeleteSong(song.id);
      setActiveModal(null);
    }
  }, [song, handleDeleteSong]);

  const handleImportFiles = useCallback(
    (files: File[]) => {
      // Start import in background, modal closes immediately
      importQueue.startImport(files, (importedSong) => {
        // When a song is imported, save it and load it
        persistence.saveSong(importedSong);
        loadSong(importedSong);
      });
    },
    [importQueue, loadSong, persistence],
  );

  const handleExport = useCallback(() => {
    setActiveModal("export");
  }, []);

  const handleExportPDF = useCallback(
    async (options: ExportOptions) => {
      if (song) {
        await pdfExport.exportToPDF(
          chartRef.current,
          options,
          song.title,
          song,
          logoStorage.logo || undefined,
        );
        setActiveModal(null);
      }
    },
    [pdfExport, song, logoStorage.logo],
  );

  const handleTranspose = useCallback(
    (semitones: number) => {
      transpose(semitones);
    },
    [transpose],
  );

  const handleTransposeReset = useCallback(() => {
    if (song) {
      transpose(-song.transpositionOffset);
    }
  }, [song, transpose]);

  // Bulk operation handlers
  const handleBulkDuplicateSongs = useCallback(
    (songIds: string[]) => {
      persistence.bulkDuplicateSongs(songIds);
    },
    [persistence],
  );

  const handleBulkDeleteSongs = useCallback(
    (songIds: string[]) => {
      persistence.bulkDeleteSongs(songIds);
      // If current song was deleted, load another
      if (song && songIds.includes(song.id)) {
        const remaining = persistence
          .getSongList()
          .filter((s) => !songIds.includes(s.id));
        if (remaining.length > 0) {
          const nextSong = persistence.loadSong(remaining[0].id);
          if (nextSong) {
            loadSong(nextSong);
          }
        } else {
          createNewSong();
        }
      }
    },
    [persistence, song, loadSong, createNewSong],
  );

  const handleBulkAddSongsToPlaylists = useCallback(
    (songIds: string[], playlistIds: string[]) => {
      persistence.bulkAddSongsToPlaylists(songIds, playlistIds);
    },
    [persistence],
  );

  const handleBulkExportSongs = useCallback(
    (songIds: string[]) => {
      const songs = songIds
        .map((id) => persistence.loadSong(id))
        .filter((s): s is Song => s !== null);
      if (songs.length > 0) {
        setBulkExportSongs(songs);
        setActiveModal("bulkExport");
      }
    },
    [persistence],
  );

  const handleBulkDuplicatePlaylists = useCallback(
    (playlistIds: string[]) => {
      persistence.bulkDuplicatePlaylists(playlistIds);
    },
    [persistence],
  );

  const handleBulkDeletePlaylists = useCallback(
    (playlistIds: string[]) => {
      persistence.bulkDeletePlaylists(playlistIds);
    },
    [persistence],
  );

  const handleBulkExportPlaylists = useCallback(
    (playlistIds: string[]) => {
      const songs = persistence.getSongsForPlaylists(playlistIds);
      if (songs.length > 0) {
        setBulkExportSongs(songs);
        setActiveModal("bulkExport");
      }
    },
    [persistence],
  );

  const handleExportPlaylist = useCallback(
    (playlistId: string) => {
      const songs = persistence.getSongsForPlaylists([playlistId]);
      if (songs.length > 0) {
        setBulkExportSongs(songs);
        setActiveModal("bulkExport");
      }
    },
    [persistence],
  );

  const handleBulkExportPDF = useCallback(
    async (options: ExportOptions, mode?: PDFExportMode) => {
      if (bulkExportSongs.length === 0) return;

      if (mode === "separate") {
        await pdfExport.exportSeparatePDFs(
          bulkExportSongs,
          options,
          logoStorage.logo || undefined,
        );
      } else {
        // Combined mode (default)
        await pdfExport.exportMultipleToPDF(
          bulkExportSongs,
          options,
          logoStorage.logo || undefined,
        );
      }

      setActiveModal(null);
      setBulkExportSongs([]);
    },
    [bulkExportSongs, pdfExport, logoStorage.logo],
  );

  // Render
  if (persistence.isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Logo */}
      <button
        onClick={handleNewSong}
        className={`fixed top-0 left-0 z-40 h-12 flex items-center justify-center bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 ${
          sidebarCollapsed ? "w-12" : "w-[22rem]"
        }`}
      >
        {!sidebarCollapsed && (
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Victor's Helper
          </span>
        )}
      </button>

      {/* Left Sidebar */}
      <LeftSidebar
        songs={persistence.getSongList()}
        playlists={persistence.playlists}
        currentSongId={song?.id ?? null}
        onSelectSong={handleLoadSong}
        onDuplicateSong={handleDuplicateSongById}
        onDeleteSong={handleDeleteSong}
        onCreatePlaylist={handleCreatePlaylist}
        onDeletePlaylist={handleDeletePlaylist}
        onDuplicatePlaylist={persistence.duplicatePlaylist}
        onAddSongToPlaylist={persistence.addSongToPlaylist}
        onReorderPlaylist={persistence.reorderPlaylist}
        onRemoveSongFromPlaylist={persistence.removeSongFromPlaylist}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onBulkDuplicateSongs={handleBulkDuplicateSongs}
        onBulkDeleteSongs={handleBulkDeleteSongs}
        onBulkAddSongsToPlaylists={handleBulkAddSongsToPlaylists}
        onBulkExportSongs={handleBulkExportSongs}
        onBulkDuplicatePlaylists={handleBulkDuplicatePlaylists}
        onBulkDeletePlaylists={handleBulkDeletePlaylists}
        onBulkExportPlaylists={handleBulkExportPlaylists}
        onExportPlaylist={handleExportPlaylist}
      />

      {/* DndContext wraps toolbar and chart for block drag-and-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleBlockDragStart}
        onDragEnd={handleBlockDragEnd}
      >
        {/* Toolbar */}
        {song && (
          <Toolbar
            title={song.title}
            onTitleChange={setTitle}
            transposeOffset={song.transpositionOffset || 0}
            onTranspose={handleTranspose}
            onTransposeReset={handleTransposeReset}
            chordsVisible={chordsVisible}
            onToggleChords={() => setChordsVisible(!chordsVisible)}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onImport={handleImport}
            onExport={handleExport}
            isDirty={isDirty}
            onCreateNew={handleNewSong}
            onLoadSample={handleLoadSample}
            onDeleteSong={handleDeleteSongClick}
            onDuplicateSong={handleDuplicateSong}
            songId={song.id}
            playlists={persistence.playlists}
            onAddToPlaylist={handleAddToPlaylist}
            onRemoveFromPlaylist={handleRemoveFromPlaylist}
            onCreatePlaylist={handleCreatePlaylist}
            sidebarCollapsed={sidebarCollapsed}
          />
        )}

        {/* Main Content */}
        <div
          className="flex-1 overflow-auto pt-20 transition-[margin] duration-200 ease-in-out"
          style={{ marginLeft: sidebarCollapsed ? "3rem" : "22rem" }}
        >
          {/* Chart Area */}
          <div className="p-4 md:p-8">
            {song ? (
              <div ref={chartRef}>
                <BlockBasedChartViewer
                  song={song}
                  selectedChords={selectedChords}
                  chordsVisible={chordsVisible}
                  accidentalPreference={accidentalPreference}
                  onChordSelect={handleChordSelect}
                  onChordDoubleClick={handleChordDoubleClick}
                  onChordMove={handleChordMove}
                  editingLineId={editingLineId}
                  lyricEditMode={lyricEditMode}
                  onLyricEditModeChange={setLyricEditMode}
                  onLyricCommit={handleLyricCommit}
                  onLyricCancel={handleLyricCancel}
                  onLyricEnter={handleLyricEnter}
                  selectedBlockId={selectedBlockId}
                  onBlockSelect={setSelectedBlockId}
                  onMetadataChange={updateMetadata}
                  showFooterFields={true}
                  logoUrl={logoStorage.logo || undefined}
                  onLogoUpload={logoStorage.setLogo}
                  onLogoClear={logoStorage.clearLogo}
                />
              </div>
            ) : (
              <EmptyState
                onCreateNew={handleNewSong}
                onLoadSample={handleLoadSample}
                onImport={handleImport}
              />
            )}
          </div>
        </div>

        {/* Drag Overlay for block dragging */}
        <DragOverlay>
          {activeDragType === "newBlockTemplate" && activeBlockType && (
            <div className="bg-white shadow-lg rounded p-2 opacity-80 border-2 border-blue-500">
              <span className="text-sm text-gray-700 capitalize">
                New {activeBlockType.replace(/([A-Z])/g, " $1").trim()}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Chord Editor Popover */}
      {editingChord && (
        <ChordEditor
          chordRef={editingChord.ref}
          initialValue={editingChord.value}
          x={editingChord.x}
          y={editingChord.y}
          onCommit={handleChordCommit}
          onCancel={() => setEditingChord(null)}
          onDelete={handleChordDelete}
        />
      )}

      {/* Import Modal */}
      {activeModal === "import" && (
        <ImportModal
          onImport={handleImportFiles}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Import Toast Notifications */}
      <ToastContainer
        jobs={importQueue.jobs}
        onDismiss={importQueue.dismissJob}
      />

      {/* Export Modal */}
      {activeModal === "export" && (
        <ExportModal
          onExport={handleExportPDF}
          onClose={() => setActiveModal(null)}
          isExporting={pdfExport.isExporting}
          song={song}
          logoUrl={logoStorage.logo || undefined}
        />
      )}

      {/* Bulk Export Modal */}
      {activeModal === "bulkExport" && bulkExportSongs.length > 0 && (
        <ExportModal
          onExport={handleBulkExportPDF}
          onClose={() => {
            setActiveModal(null);
            setBulkExportSongs([]);
          }}
          isExporting={pdfExport.isExporting}
          songs={bulkExportSongs}
          logoUrl={logoStorage.logo || undefined}
        />
      )}

      {/* Playlist Modal */}
      {(activeModal === "createPlaylist" || activeModal === "editPlaylist") && (
        <PlaylistModal
          mode={activeModal === "createPlaylist" ? "create" : "edit"}
          playlist={editingPlaylist ?? undefined}
          onSave={handleSavePlaylist}
          onClose={() => {
            setActiveModal(null);
            setEditingPlaylist(null);
          }}
        />
      )}

      {/* Delete Song Dialog */}
      {activeModal === "deleteSong" && song && (
        <DeleteSongDialog
          songTitle={song.title || "Untitled"}
          playlists={persistence.getPlaylistsForSong(song.id)}
          onConfirm={handleConfirmDeleteSong}
          onCancel={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  // Detect system dark mode preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = () => {
      if (mediaQuery.matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    updateTheme();
    mediaQuery.addEventListener("change", updateTheme);
    return () => mediaQuery.removeEventListener("change", updateTheme);
  }, []);

  return (
    <SongProvider>
      <AppContent />
    </SongProvider>
  );
}
