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
  ChartViewer,
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
import { isSongV2 } from "./types/song";
import type { PDFExportMode } from "./types/ui";
import type { Playlist } from "./types/playlist";
import { createSampleSong } from "./lib/chart-parser";

function AppContent() {
  const {
    song,
    songV2,
    isDirty,
    loadSong,
    createNewSong,
    updateChord,
    moveChord,
    deleteChord,
    updateLineWithMode,
    insertLine,
    setTitle,
    updateMetadata,
    setBarNotation,
    setSectionColumn,
    setSectionOrder,
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

  // Auto-save effect - save songV2 if available, otherwise song (V1)
  useEffect(() => {
    const songToSave = songV2 || song;
    if (songToSave && isDirty) {
      const timeoutId = setTimeout(() => {
        persistence.saveSong(songToSave);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [song, songV2, isDirty, persistence]);

  // Load initial song or show empty state
  useEffect(() => {
    if (!persistence.isLoading && persistence.songs.length > 0 && !song) {
      const mostRecent = persistence.getSongList()[0];
      if (mostRecent) {
        const loadedSong = persistence.loadSong(mostRecent.id);
        if (loadedSong) {
          loadSong(loadedSong);
        }
      }
    }
  }, [
    persistence.isLoading,
    persistence.songs.length,
    song,
    loadSong,
    persistence,
  ]);

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

        selectedChords.forEach((ref) => {
          const line = song.lines.find((l) => l.id === ref.lineId);
          const chord = line?.chords.find((c) => c.id === ref.chordId);
          if (chord) {
            const newCharIndex = Math.max(0, chord.charIndex + delta * amount);
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
      const line = song.lines.find((l) => l.id === ref.lineId);
      const chord = line?.chords.find((c) => c.id === ref.chordId);
      if (chord) {
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
          value: chord.chord,
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

  const handleLineDoubleClick = useCallback((lineId: string) => {
    setEditingLineId(lineId);
  }, []);

  const handleLyricCommit = useCallback(
    (lineId: string, newValue: string, mode: LyricEditMode) => {
      updateLineWithMode(lineId, newValue, mode);
      setEditingLineId(null);
    },
    [updateLineWithMode],
  );

  const handleLyricCancel = useCallback(() => {
    setEditingLineId(null);
  }, []);

  const handleLyricEnter = useCallback(
    (lineId: string) => {
      insertLine(lineId);
      setEditingLineId(null);
    },
    [insertLine],
  );

  // Bar notation change handler
  const handleBarNotationChange = useCallback(
    (lineId: string, barNotation: import("./types").BarNotation | null) => {
      setBarNotation(lineId, barNotation);
    },
    [setBarNotation],
  );

  // Section column change handler (for drag-and-drop)
  const handleSectionColumnChange = useCallback(
    (sectionId: string, column: "left" | "right" | null) => {
      setSectionColumn(sectionId, column);
    },
    [setSectionColumn],
  );

  // Section order change handler (for reordering within a column)
  const handleSectionOrderChange = useCallback(
    (column: "left" | "right", newOrder: string[]) => {
      setSectionOrder(column, newOrder);
    },
    [setSectionOrder],
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
        targetBlockId = over.id as UUID;
        parentSectionId = overData.parentSectionId ?? null;
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
        if (blockId !== targetBlockId) {
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
      const allSongs = persistence.getSongsForPlaylists(playlistIds);
      // Filter to only V1 songs for PDF export
      const songs = allSongs.filter((s): s is Song => !isSongV2(s));
      if (songs.length > 0) {
        setBulkExportSongs(songs);
        setActiveModal("bulkExport");
      }
    },
    [persistence],
  );

  const handleExportPlaylist = useCallback(
    (playlistId: string) => {
      const allSongs = persistence.getSongsForPlaylists([playlistId]);
      // Filter to only V1 songs for PDF export
      const songs = allSongs.filter((s): s is Song => !isSongV2(s));
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
        {(songV2 || song) && (
          <Toolbar
            title={songV2?.title || song?.title}
            onTitleChange={setTitle}
            transposeOffset={
              songV2?.transpositionOffset || song?.transpositionOffset || 0
            }
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
            songId={songV2?.id || song?.id}
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
            {songV2 ? (
              <div ref={chartRef}>
                <BlockBasedChartViewer
                  song={songV2}
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
            ) : song ? (
              <div ref={chartRef}>
                <ChartViewer
                  song={song}
                  selectedChords={selectedChords}
                  chordsVisible={chordsVisible}
                  accidentalPreference={accidentalPreference}
                  onChordSelect={handleChordSelect}
                  onChordDoubleClick={handleChordDoubleClick}
                  onChordMove={handleChordMove}
                  onLineDoubleClick={handleLineDoubleClick}
                  editingLineId={editingLineId}
                  lyricEditMode={lyricEditMode}
                  onLyricEditModeChange={setLyricEditMode}
                  onLyricCommit={handleLyricCommit}
                  onLyricCancel={handleLyricCancel}
                  onLyricEnter={handleLyricEnter}
                  onMetadataChange={updateMetadata}
                  onBarNotationChange={handleBarNotationChange}
                  onSectionColumnChange={handleSectionColumnChange}
                  onSectionOrderChange={handleSectionOrderChange}
                  enableSectionDrag={true}
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
