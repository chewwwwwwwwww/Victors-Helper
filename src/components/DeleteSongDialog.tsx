import { AlertTriangle } from "lucide-react";
import type { Playlist } from "../types/playlist";

interface DeleteSongDialogProps {
  songTitle: string;
  playlists: Playlist[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteSongDialog({
  songTitle,
  playlists,
  onConfirm,
  onCancel,
}: DeleteSongDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Delete Song
          </h2>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete{" "}
            <span className="font-semibold">"{songTitle || "Untitled"}"</span>?
          </p>

          {playlists.length > 0 && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This song is in {playlists.length} playlist
                {playlists.length > 1 ? "s" : ""}:
              </p>
              <ul className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                {playlists.map((p) => (
                  <li key={p.id} className="truncate">
                    - {p.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone.
          </p>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
