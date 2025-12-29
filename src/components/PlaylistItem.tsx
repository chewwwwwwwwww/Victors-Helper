import { useState } from "react";
import { ChevronRight, GripVertical, MoreVertical } from "lucide-react";
import type { Playlist } from "../types/playlist";
import type { SongMetadata } from "../types";

interface PlaylistItemProps {
  playlist: Playlist;
  songs: SongMetadata[];
  currentSongId: string | null;
  onSelectSong: (songId: string) => void;
  onEditPlaylist: (playlist: Playlist) => void;
  onDeletePlaylist: (playlistId: string) => void;
}

export function PlaylistItem({
  playlist,
  songs,
  currentSongId,
  onSelectSong,
  onEditPlaylist,
  onDeletePlaylist,
}: PlaylistItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Get songs in playlist order
  const playlistSongs = playlist.songIds
    .map((id) => songs.find((s) => s.id === id))
    .filter((s): s is SongMetadata => s !== undefined);

  return (
    <div className="rounded-lg">
      {/* Playlist Header */}
      <div className="flex items-center group">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronRight
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
          <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {playlist.name}
          </span>
          <span className="text-xs text-gray-400">{playlistSongs.length}</span>
        </button>

        {/* Menu button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-1">
                <button
                  onClick={() => {
                    onEditPlaylist(playlist);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Rename
                </button>
                <button
                  onClick={() => {
                    onDeletePlaylist(playlist.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expanded Songs */}
      {isExpanded && (
        <div className="ml-4 mt-1 space-y-0.5">
          {playlistSongs.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400 italic">
              No songs in playlist
            </div>
          ) : (
            playlistSongs.map((song, index) => (
              <button
                key={song.id}
                onClick={() => onSelectSong(song.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-left rounded transition-colors ${
                  currentSongId === song.id
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                <GripVertical className="w-3 h-3 text-gray-400 cursor-grab" />
                <span className="text-xs text-gray-400 w-4">{index + 1}.</span>
                <span className="flex-1 text-sm truncate">
                  {song.title || "Untitled"}
                </span>
                {song.key && (
                  <span className="text-xs px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono">
                    {song.key}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
