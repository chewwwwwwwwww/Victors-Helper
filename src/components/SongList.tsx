// removed unused import
import type { SongMetadata } from "../types";

interface SongListProps {
  songs: SongMetadata[];
  currentSongId: string | null;
  onSelectSong: (id: string) => void;
  onDeleteSong: (id: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

export function SongList({
  songs,
  currentSongId,
  onSelectSong,
  onDeleteSong,
  onCreateNew,
  onClose,
}: SongListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-gray-800 shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Saved Songs
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          aria-label="Close sidebar"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Song List */}
      <div className="flex-1 overflow-y-auto">
        {songs.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No saved songs yet
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {songs.map((song) => (
              <li key={song.id}>
                <button
                  onClick={() => onSelectSong(song.id)}
                  className={`
                    w-full text-left p-4 flex items-center justify-between
                    hover:bg-gray-50 dark:hover:bg-gray-700
                    transition-colors
                    ${song.id === currentSongId ? "bg-blue-50 dark:bg-blue-900/30" : ""}
                  `}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {song.title || "Untitled Song"}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {song.lineCount} lines • {formatDate(song.updatedAt)}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSong(song.id);
                    }}
                    className="ml-2 p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
                    aria-label="Delete song"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onCreateNew}
          className="
            w-full py-2 px-4 rounded-lg
            bg-blue-600 hover:bg-blue-700
            text-white font-medium
            transition-colors
          "
        >
          + New Song
        </button>
      </div>
    </div>
  );
}
