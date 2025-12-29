import { useState, useRef, useEffect } from "react";
import { ListPlus, Plus, Check } from "lucide-react";
import type { Playlist } from "../types/playlist";

interface BulkAddToPlaylistDropdownProps {
  songIds: string[];
  playlists: Playlist[];
  onAddToPlaylists: (playlistIds: string[]) => void;
  onCreatePlaylist: () => void;
}

export function BulkAddToPlaylistDropdown({
  songIds,
  playlists,
  onAddToPlaylists,
  onCreatePlaylist,
}: BulkAddToPlaylistDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(
    new Set(),
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedPlaylistIds(new Set());
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTogglePlaylist = (playlistId: string) => {
    setSelectedPlaylistIds((prev) => {
      const next = new Set(prev);
      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }
      return next;
    });
  };

  const handleApply = () => {
    if (selectedPlaylistIds.size > 0) {
      onAddToPlaylists(Array.from(selectedPlaylistIds));
    }
    setIsOpen(false);
    setSelectedPlaylistIds(new Set());
  };

  // Count how many of the selected songs are already in each playlist
  const getExistingCount = (playlist: Playlist) => {
    return songIds.filter((id) => playlist.songIds.includes(id)).length;
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={songIds.length === 0}
        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Add to playlist"
      >
        <ListPlus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[70] py-1">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Add {songIds.length} song{songIds.length !== 1 ? "s" : ""} to:
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {playlists.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-400">
                No playlists yet
              </div>
            ) : (
              playlists.map((playlist) => {
                const existingCount = getExistingCount(playlist);
                const isSelected = selectedPlaylistIds.has(playlist.id);

                return (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => handleTogglePlaylist(playlist.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isSelected
                          ? "bg-blue-600 border-blue-600"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                      {playlist.name}
                    </span>
                    {existingCount > 0 && (
                      <span className="text-xs text-gray-400">
                        {existingCount} already in
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 p-2 space-y-2">
            <button
              onClick={() => {
                onCreatePlaylist();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create new playlist
            </button>

            {selectedPlaylistIds.size > 0 && (
              <button
                onClick={handleApply}
                className="w-full px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Add to {selectedPlaylistIds.size} playlist
                {selectedPlaylistIds.size !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
