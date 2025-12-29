import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  GripVertical,
  MoreVertical,
  X,
  Copy,
  Trash2,
  Square,
  CheckSquare,
  FileDown,
} from "lucide-react";
import type { Playlist } from "../types/playlist";
import type { SongMetadata } from "../types";

interface SortablePlaylistSongProps {
  song: SongMetadata;
  index: number;
  playlistId: string;
  currentSongId: string | null;
  onSelectSong: (songId: string) => void;
  onRemove: (songId: string) => void;
}

function SortablePlaylistSong({
  song,
  index,
  playlistId,
  currentSongId,
  onSelectSong,
  onRemove,
}: SortablePlaylistSongProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `playlist-${playlistId}-song-${song.id}`,
    data: {
      type: "playlist-song",
      playlistId,
      songId: song.id,
      index,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
        currentSongId === song.id
          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100"
          : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-3 h-3 text-gray-400" />
      </div>
      <span className="text-xs text-gray-400 w-4">{index + 1}.</span>
      <button
        onClick={() => onSelectSong(song.id)}
        className="flex-1 text-left text-sm truncate"
      >
        {song.title || "Untitled"}
      </button>
      {song.key && (
        <span className="text-xs px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono">
          {song.key}
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(song.id);
        }}
        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
        title="Remove from playlist"
      >
        <X className="w-3 h-3 text-red-500" />
      </button>
    </div>
  );
}

interface SortablePlaylistItemProps {
  playlist: Playlist;
  songs: SongMetadata[];
  currentSongId: string | null;
  onSelectSong: (songId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onDuplicatePlaylist: (playlistId: string) => void;
  onRemoveSong: (songId: string) => void;
  onExportPDF?: (playlistId: string) => void;
  /** Selection mode state */
  isSelectionMode?: boolean;
  /** Whether this item is selected */
  isSelected?: boolean;
  /** Toggle selection callback */
  onToggleSelect?: (playlistId: string) => void;
}

export function SortablePlaylistItem({
  playlist,
  songs,
  currentSongId,
  onSelectSong,
  onDeletePlaylist,
  onDuplicatePlaylist,
  onRemoveSong,
  onExportPDF,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: SortablePlaylistItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Calculate menu position when it opens
  useEffect(() => {
    if (showMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const menuWidth = 192; // w-48 = 12rem = 192px
      const viewportWidth = window.innerWidth;

      // Position menu to the right of button, or left if it would overflow
      let left = rect.right + 4;
      if (left + menuWidth > viewportWidth - 16) {
        left = rect.left - menuWidth - 4;
      }

      setMenuPosition({
        top: rect.top,
        left: Math.max(8, left),
      });
    }
  }, [showMenu]);

  // Reset delete confirm when menu closes
  useEffect(() => {
    if (!showMenu) {
      setShowDeleteConfirm(false);
    }
  }, [showMenu]);

  // Set up droppable for adding songs to playlist
  const { setNodeRef, isOver } = useDroppable({
    id: `playlist-drop-${playlist.id}`,
    data: {
      type: "playlist",
      playlistId: playlist.id,
    },
  });

  // Get songs in playlist order
  const playlistSongs = playlist.songIds
    .map((id) => songs.find((s) => s.id === id))
    .filter((s): s is SongMetadata => s !== undefined);

  // Create sortable IDs for songs in this playlist
  const sortableIds = playlistSongs.map(
    (song) => `playlist-${playlist.id}-song-${song.id}`,
  );

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg transition-colors ${
        isOver ? "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400" : ""
      }`}
    >
      {/* Playlist Header */}
      <div className="flex items-center group">
        {/* Checkbox for selection mode */}
        {isSelectionMode && (
          <button
            onClick={() => onToggleSelect?.(playlist.id)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>
        )}

        <button
          onClick={() => {
            if (isSelectionMode) {
              onToggleSelect?.(playlist.id);
            } else {
              setIsExpanded(!isExpanded);
            }
          }}
          className={`flex-1 flex items-center gap-2 px-3 py-2 text-left rounded-lg transition-colors ${
            isSelected
              ? "bg-blue-100 dark:bg-blue-900/30"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          {!isSelectionMode && (
            <ChevronRight
              className={`w-4 h-4 text-gray-400 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          )}
          <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {playlist.name}
          </span>
          <span className="text-xs text-gray-400">{playlistSongs.length}</span>
        </button>

        {/* Menu button - hide in selection mode */}
        {!isSelectionMode && (
          <div className="relative">
            <button
              ref={menuButtonRef}
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-[60]"
                  onClick={() => setShowMenu(false)}
                />
                <div
                  className="fixed w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[70] py-1"
                  style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                  <button
                    onClick={() => {
                      onDuplicatePlaylist(playlist.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>

                  {onExportPDF && (
                    <button
                      onClick={() => {
                        onExportPDF(playlist.id);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FileDown className="w-4 h-4" />
                      Export to PDF
                    </button>
                  )}

                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  ) : (
                    <div className="px-3 py-2">
                      <div className="flex items-start gap-2 text-red-600 dark:text-red-400 mb-2">
                        <Trash2 className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="text-sm">
                          Are you sure you want to permanently delete this
                          playlist?
                        </span>
                      </div>
                      <div className="flex gap-2 ml-6">
                        <button
                          onClick={() => {
                            onDeletePlaylist(playlist.id);
                            setShowMenu(false);
                          }}
                          className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Drop hint when dragging over */}
      {isOver && !isExpanded && (
        <div className="mx-3 mb-2 px-3 py-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded">
          Drop to add to playlist
        </div>
      )}

      {/* Expanded Songs with Sortable */}
      {isExpanded && (
        <div className="ml-4 mt-1 space-y-0.5">
          {playlistSongs.length === 0 ? (
            <div
              className={`px-3 py-2 text-xs italic rounded ${
                isOver
                  ? "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30"
                  : "text-gray-400"
              }`}
            >
              {isOver ? "Drop to add song" : "No songs in playlist"}
            </div>
          ) : (
            <SortableContext
              items={sortableIds}
              strategy={verticalListSortingStrategy}
            >
              {playlistSongs.map((song, index) => (
                <SortablePlaylistSong
                  key={song.id}
                  song={song}
                  index={index}
                  playlistId={playlist.id}
                  currentSongId={currentSongId}
                  onSelectSong={onSelectSong}
                  onRemove={onRemoveSong}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}
