import { useState, useRef, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { MoreVertical, Copy, Trash2, Square, CheckSquare } from "lucide-react";
import type { SongMetadata } from "../types";

interface DraggableSongItemProps {
  song: SongMetadata;
  isActive: boolean;
  onClick: () => void;
  onDuplicate: (songId: string) => void;
  onDelete: (songId: string) => void;
  /** Selection mode state */
  isSelectionMode?: boolean;
  /** Whether this item is selected */
  isSelected?: boolean;
  /** Toggle selection callback */
  onToggleSelect?: (songId: string) => void;
}

export function DraggableSongItem({
  song,
  isActive,
  onClick,
  onDuplicate,
  onDelete,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: DraggableSongItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `song-${song.id}`,
      data: {
        type: "song",
        songId: song.id,
        song,
      },
      disabled: isSelectionMode, // Disable drag in selection mode
    });

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

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined;

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(song.id);
    setShowMenu(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(song.id);
    setShowMenu(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const handleClick = () => {
    if (isSelectionMode) {
      onToggleSelect?.(song.id);
    } else {
      onClick();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center">
        {/* Checkbox for selection mode */}
        {isSelectionMode && (
          <button
            onClick={handleClick}
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
          onClick={handleClick}
          className={`flex-1 text-left px-3 py-2 rounded-lg transition-colors ${
            isSelected
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100"
              : isActive
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100"
                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
          }`}
          {...(isSelectionMode ? {} : { ...attributes, ...listeners })}
        >
          <div className="font-medium truncate pr-6">
            {song.title || "Untitled Song"}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {song.key && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-mono">
                {song.key}
              </span>
            )}
            {song.songwriters && song.songwriters.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {song.songwriters.join(", ")}
              </span>
            )}
          </div>
        </button>

        {/* Menu button - hide in selection mode */}
        {!isSelectionMode && (
          <button
            ref={menuButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
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
              onClick={handleDuplicate}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </button>

            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

            {!showDeleteConfirm ? (
              <button
                onClick={handleDeleteClick}
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
                    Are you sure you want to permanently delete this song?
                  </span>
                </div>
                <div className="flex gap-2 ml-6">
                  <button
                    onClick={handleConfirmDelete}
                    className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={handleCancelDelete}
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
  );
}
