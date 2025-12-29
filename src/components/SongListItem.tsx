import type { SongMetadata } from "../types";

interface SongListItemProps {
  song: SongMetadata;
  isActive: boolean;
  onClick: () => void;
}

export function SongListItem({ song, isActive, onClick }: SongListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
        isActive
          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100"
          : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
      }`}
    >
      <div className="font-medium truncate">
        {song.title || "Untitled Song"}
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        {song.key && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-mono">
            {song.key}
          </span>
        )}
        {song.artist && (
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {song.artist}
          </span>
        )}
      </div>
    </button>
  );
}
