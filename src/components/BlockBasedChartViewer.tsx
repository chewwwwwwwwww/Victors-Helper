import { useMemo, useState, useCallback, useRef } from "react";
import { Upload, X } from "lucide-react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type {
  SongV2,
  ChordReference,
  FontMetrics,
  EditableSongMetadata,
  UUID,
  BarNotation,
} from "../types";
import { DEFAULT_FONT_METRICS } from "../lib/layout-engine";
import { MetadataPanel } from "./MetadataPanel";
import { BlockList, type BlockRenderContext } from "./blocks/BlockRenderer";
import type { AccidentalPreference } from "../types/chord-theory";
import type { LyricEditMode } from "./LyricEditor";
import { useSong } from "../contexts/SongContext";
import { getAllBlockIds } from "../lib/block-utils";

interface BlockBasedChartViewerProps {
  song: SongV2;
  fontMetrics?: FontMetrics;
  selectedChords: ChordReference[];
  chordsVisible: boolean;
  accidentalPreference?: AccidentalPreference;
  onChordSelect: (ref: ChordReference) => void;
  onChordDoubleClick: (ref: ChordReference, event?: React.MouseEvent) => void;
  onChordMove: (ref: ChordReference, newCharIndex: number) => void;
  // Inline lyric editing
  editingLineId: string | null;
  lyricEditMode: LyricEditMode;
  onLyricEditModeChange: (mode: LyricEditMode) => void;
  onLyricCommit: (
    lineId: string,
    newValue: string,
    mode: LyricEditMode,
  ) => void;
  onLyricCancel: () => void;
  onLyricEnter: (lineId: string) => void;
  // Block selection (lifted state)
  selectedBlockId: string | null;
  onBlockSelect: (blockId: string | null) => void;
  // Metadata editing
  onMetadataChange?: (updates: Partial<EditableSongMetadata>) => void;
  // Logo customization
  logoUrl?: string;
  onLogoUpload?: (file: File) => Promise<void>;
  onLogoClear?: () => void;
  showFooterFields?: boolean;
}

export function BlockBasedChartViewer({
  song,
  fontMetrics = DEFAULT_FONT_METRICS,
  selectedChords,
  chordsVisible,
  accidentalPreference = "auto",
  onChordSelect,
  onChordDoubleClick,
  onChordMove,
  editingLineId,
  lyricEditMode,
  onLyricEditModeChange,
  onLyricCommit,
  onLyricCancel,
  onLyricEnter,
  selectedBlockId,
  onBlockSelect,
  onMetadataChange,
  logoUrl,
  onLogoUpload,
  onLogoClear,
  showFooterFields = false,
}: BlockBasedChartViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Access block operations from context
  const { insertBlock, updateBlock } = useSong();

  // Editing state (local only)
  const [editingBlockId, setEditingBlockId] = useState<UUID | null>(null);

  // Block operation handlers for context
  const handleBlockSelect = useCallback(
    (blockId: UUID) => {
      onBlockSelect(blockId);
    },
    [onBlockSelect],
  );

  const handleBlockDoubleClick = useCallback((blockId: UUID) => {
    // For chord/lyrics blocks, start editing the lyrics
    setEditingBlockId(blockId);
  }, []);

  const handleBlockContextMenu = useCallback(
    (_blockId: UUID, _x: number, _y: number) => {
      // Context menu is handled by BlockContextMenu component
    },
    [],
  );

  const handleLyricCommitV2 = useCallback(
    (blockId: UUID, newValue: string, mode: LyricEditMode) => {
      // Update the block's lyrics
      updateBlock(blockId, { lyrics: newValue });
      setEditingBlockId(null);
      // Also call the original handler for V1 compatibility
      onLyricCommit(blockId, newValue, mode);
    },
    [updateBlock, onLyricCommit],
  );

  const handleLyricCancelV2 = useCallback(() => {
    setEditingBlockId(null);
    onLyricCancel();
  }, [onLyricCancel]);

  const handleLyricEnterV2 = useCallback(
    (blockId: UUID) => {
      // Insert a new chord/lyrics block after this one
      insertBlock("chordLyricsLine", blockId, null);
      setEditingBlockId(null);
      onLyricEnter(blockId);
    },
    [insertBlock, onLyricEnter],
  );

  const handleBarNotationChange = useCallback(
    (blockId: UUID, barNotation: BarNotation | null) => {
      updateBlock(blockId, { barNotation: barNotation ?? undefined });
    },
    [updateBlock],
  );

  // Get flat list of block IDs for SortableContext
  const blockIds = useMemo(() => {
    return getAllBlockIds(song.blocks);
  }, [song.blocks]);

  // Create the block render context
  const blockContext: BlockRenderContext = useMemo(
    () => ({
      fontMetrics,
      chordsVisible,
      accidentalPreference,
      transpositionOffset: song.transpositionOffset || 0,

      // Selection state
      selectedBlockId: selectedBlockId as UUID | null,
      editingBlockId,
      editingLineId: editingLineId as UUID | null,
      lyricEditMode,

      // Chord operations
      selectedChords,
      onChordSelect,
      onChordDoubleClick,
      onChordMove,

      // Lyric operations
      onLyricEditModeChange,
      onLyricCommit: handleLyricCommitV2,
      onLyricCancel: handleLyricCancelV2,
      onLyricEnter: handleLyricEnterV2,

      // Block operations
      onBlockSelect: handleBlockSelect,
      onBlockDoubleClick: handleBlockDoubleClick,
      onBlockContextMenu: handleBlockContextMenu,

      // Bar notation
      onBarNotationChange: handleBarNotationChange,
    }),
    [
      fontMetrics,
      chordsVisible,
      accidentalPreference,
      song.transpositionOffset,
      selectedBlockId,
      editingBlockId,
      editingLineId,
      lyricEditMode,
      selectedChords,
      onChordSelect,
      onChordDoubleClick,
      onChordMove,
      onLyricEditModeChange,
      handleLyricCommitV2,
      handleLyricCancelV2,
      handleLyricEnterV2,
      handleBlockSelect,
      handleBlockDoubleClick,
      handleBlockContextMenu,
      handleBarNotationChange,
    ],
  );

  // Extract metadata for the panel
  const metadata: EditableSongMetadata = {
    title: song.title,
    songwriters: song.songwriters,
    album: song.album,
    recordedBy: song.recordedBy,
    key: song.key,
    tempo: song.tempo,
    timeSignature: song.timeSignature,
    ccliSongNumber: song.ccliSongNumber,
    publisher: song.publisher,
    copyright: song.copyright,
  };

  return (
    <div
      ref={containerRef}
      className="block-based-chart-viewer relative"
      style={{
        backgroundColor: "#ffffff",
        color: "#1f2937",
      }}
    >
      {/* Header row: Metadata (left) + Logo (right) */}
      <div className="flex justify-between items-start px-4 pt-4 mb-4">
        {/* Metadata Panel - left side */}
        <div className="flex-1 max-w-lg">
          {onMetadataChange ? (
            <MetadataPanel
              metadata={metadata}
              onChange={onMetadataChange}
              showFooterFields={showFooterFields}
            />
          ) : (
            // Read-only display when no handler provided
            <div>
              {song.title && (
                <h1 className="text-2xl font-bold italic">{song.title}</h1>
              )}
              {song.songwriters && song.songwriters.length > 0 && (
                <p className="text-sm text-gray-600">
                  {song.songwriters.join(" | ")}
                </p>
              )}
              {song.album && (
                <p className="text-sm text-gray-600">Album: {song.album}</p>
              )}
              {song.recordedBy && (
                <p className="text-sm text-gray-600">
                  Recorded by: {song.recordedBy}
                </p>
              )}
              {(song.key || song.tempo || song.timeSignature) && (
                <p className="text-sm font-semibold mt-1">
                  {song.key && `Key - ${song.key}`}
                  {song.key && song.tempo && " | "}
                  {song.tempo && `Tempo - ${song.tempo}`}
                  {(song.key || song.tempo) && song.timeSignature && " | "}
                  {song.timeSignature && `Time - ${song.timeSignature}`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Logo - right side */}
        <div className="shrink-0 ml-4 group relative">
          <img
            src={logoUrl || "/logo.png"}
            alt="Logo"
            className="h-12 w-auto object-contain"
          />
          {/* Logo upload overlay - only shown when handlers provided */}
          {(onLogoUpload || onLogoClear) && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded">
              {onLogoUpload && (
                <label className="p-1 bg-white/90 rounded cursor-pointer hover:bg-white transition-colors">
                  <Upload size={14} className="text-gray-700" />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onLogoUpload(file);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              )}
              {onLogoClear && logoUrl && (
                <button
                  type="button"
                  onClick={onLogoClear}
                  className="p-1 bg-white/90 rounded hover:bg-white transition-colors"
                  title="Reset to default logo"
                >
                  <X size={14} className="text-red-600" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Block-based chart content */}
      <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
        <div
          className="font-mono px-4 pb-6"
          style={{
            columns: 2,
            columnGap: "3rem",
            columnFill: "balance",
          }}
        >
          <BlockList
            blocks={song.blocks}
            parentSectionId={null}
            context={blockContext}
          />
        </div>
      </SortableContext>

      {/* Footer - CCLI info (only shown when footer fields are visible and have data) */}
      {showFooterFields &&
        (song.ccliSongNumber || song.publisher || song.copyright) && (
          <div className="pdf-footer text-center text-xs text-gray-500 border-t border-gray-200 pt-2 pb-4 px-4">
            {song.ccliSongNumber && (
              <p>
                <strong>CCLI Song Number:</strong> {song.ccliSongNumber}
              </p>
            )}
            {song.publisher && (
              <p>
                <strong>Publisher:</strong> {song.publisher}
                {song.songwriters &&
                  song.songwriters.length > 0 &&
                  `, Writers: ${song.songwriters.join(", ")}`}
              </p>
            )}
            {song.recordedBy && (
              <p>
                <strong>Artists:</strong> {song.recordedBy}
                {song.album && `, Album: ${song.album}`}
              </p>
            )}
          </div>
        )}
    </div>
  );
}
