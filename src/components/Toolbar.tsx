import { useCallback, useState } from "react";
import {
  Plus,
  FileText,
  Sparkles,
  Trash2,
  Undo,
  Redo,
  Copy,
} from "lucide-react";
import { TransposeControls } from "./TransposeControls";
import { IconButton } from "./IconButton";
import { AddToPlaylistDropdown } from "./AddToPlaylistDropdown";
import { BlockTypeToolbar } from "./dnd/ToolbarDragSource";
import type { Playlist } from "../types/playlist";

interface ToolbarProps {
  title?: string;
  onTitleChange: (title: string) => void;
  transposeOffset: number;
  onTranspose: (semitones: number) => void;
  onTransposeReset: () => void;
  chordsVisible: boolean;
  onToggleChords: () => void;
  onImport: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  // New props
  onCreateNew: () => void;
  onLoadSample: () => void;
  onDeleteSong: () => void;
  onDuplicateSong: () => void;
  songId?: string;
  playlists: Playlist[];
  onAddToPlaylist: (playlistId: string, songId: string) => void;
  onRemoveFromPlaylist: (playlistId: string, songId: string) => void;
  onCreatePlaylist: () => void;
  sidebarCollapsed: boolean;
}

export function Toolbar({
  title,
  onTitleChange,
  transposeOffset,
  onTranspose,
  onTransposeReset,
  chordsVisible,
  onToggleChords,
  onImport,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isDirty,
  onCreateNew,
  onLoadSample,
  onDeleteSong,
  onDuplicateSong,
  songId,
  playlists,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onCreatePlaylist,
  sidebarCollapsed,
}: ToolbarProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(title || "");

  const handleTitleClick = useCallback(() => {
    setTitleValue(title || "");
    setIsEditingTitle(true);
  }, [title]);

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false);
    if (titleValue.trim() !== title) {
      onTitleChange(titleValue.trim() || "Untitled Song");
    }
  }, [titleValue, title, onTitleChange]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleTitleBlur();
      } else if (e.key === "Escape") {
        setTitleValue(title || "");
        setIsEditingTitle(false);
      }
    },
    [handleTitleBlur, title],
  );

  return (
    <div
      className="fixed top-0 right-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 transition-[left] duration-200 ease-in-out"
      style={{ left: sidebarCollapsed ? "3rem" : "22rem" }}
    >
      <div className="flex flex-wrap items-center gap-4">
        {/* Quick Actions - Icon buttons */}
        <div className="flex items-center gap-1">
          <IconButton
            icon={<Plus className="w-5 h-5" />}
            label="Create New Song"
            onClick={onCreateNew}
          />
          <IconButton
            icon={<FileText className="w-5 h-5" />}
            label="Load Sample Song"
            onClick={onLoadSample}
          />
          <IconButton
            icon={<Sparkles className="w-5 h-5" />}
            label="AI Import"
            onClick={onImport}
          />
        </div>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* Block Type Toolbar - Drag to add blocks */}
        <BlockTypeToolbar />

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* Title */}
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="
                text-xl font-semibold w-full
                bg-transparent border-b-2 border-blue-500
                focus:outline-none
                text-gray-900 dark:text-white
              "
            />
          ) : (
            <h1
              onClick={handleTitleClick}
              className="
                text-xl font-semibold truncate cursor-text
                text-gray-900 dark:text-white
                hover:text-blue-600 dark:hover:text-blue-400
              "
            >
              {title || "Untitled Song"}
              {isDirty && <span className="text-gray-400 ml-1">*</span>}
            </h1>
          )}
        </div>

        {/* Transpose Controls */}
        <TransposeControls
          offset={transposeOffset}
          onTranspose={onTranspose}
          onReset={onTransposeReset}
        />

        {/* Toggle Chords */}
        <button
          onClick={onToggleChords}
          className={`
            px-3 py-1.5 text-sm rounded-lg
            transition-colors
            ${
              chordsVisible
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            }
          `}
        >
          {chordsVisible ? "Chords On" : "Chords Off"}
        </button>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <IconButton
            icon={<Undo className="w-5 h-5" />}
            label="Undo (Ctrl+Z)"
            onClick={onUndo}
            disabled={!canUndo}
          />
          <IconButton
            icon={<Redo className="w-5 h-5" />}
            label="Redo (Ctrl+Shift+Z)"
            onClick={onRedo}
            disabled={!canRedo}
          />
        </div>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* Playlist, Duplicate & Delete */}
        {songId && (
          <div className="flex items-center gap-1">
            <AddToPlaylistDropdown
              songId={songId}
              playlists={playlists}
              onAddToPlaylist={onAddToPlaylist}
              onRemoveFromPlaylist={onRemoveFromPlaylist}
              onCreatePlaylist={onCreatePlaylist}
            />
            <IconButton
              icon={<Copy className="w-5 h-5" />}
              label="Duplicate Song"
              onClick={onDuplicateSong}
            />
            <IconButton
              icon={<Trash2 className="w-5 h-5" />}
              label="Delete Song"
              onClick={onDeleteSong}
              variant="danger"
            />
          </div>
        )}

        {/* Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={onExport}
            className="
              px-3 py-1.5 text-sm rounded-lg
              bg-blue-600 hover:bg-blue-700
              text-white
              transition-colors
            "
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}
