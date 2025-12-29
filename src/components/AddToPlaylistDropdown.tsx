import { useState, useRef, useEffect } from "react";
import { ListPlus, Plus, Check } from "lucide-react";
import type { Playlist } from "../types/playlist";

interface AddToPlaylistDropdownProps {
  songId: string;
  playlists: Playlist[];
  onAddToPlaylist: (playlistId: string, songId: string) => void;
  onRemoveFromPlaylist: (playlistId: string, songId: string) => void;
  onCreatePlaylist: () => void;
}

export function AddToPlaylistDropdown({
  songId,
  playlists,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onCreatePlaylist,
}: AddToPlaylistDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent, playlist: Playlist) => {
    e.stopPropagation();
    if (playlist.songIds.includes(songId)) {
      onRemoveFromPlaylist(playlist.id, songId);
    } else {
      onAddToPlaylist(playlist.id, songId);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
        title="Add to playlist"
      >
        <ListPlus className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Add to playlist
          </div>

          {playlists.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
              No playlists yet
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {playlists.map((playlist) => {
                const isInPlaylist = playlist.songIds.includes(songId);
                return (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={(e) => handleToggle(e, playlist)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isInPlaylist
                          ? "bg-blue-600 border-blue-600"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isInPlaylist && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="flex-1 truncate text-sm">
                      {playlist.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {playlist.songIds.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onCreatePlaylist();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Create new playlist</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
