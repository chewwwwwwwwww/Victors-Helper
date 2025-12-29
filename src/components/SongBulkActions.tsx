import { Copy, Trash2, FileDown } from "lucide-react";
import { BulkAddToPlaylistDropdown } from "./BulkAddToPlaylistDropdown";
import type { Playlist } from "../types/playlist";

interface SongBulkActionsProps {
  selectedSongIds: string[];
  playlists: Playlist[];
  onDuplicate: () => void;
  onDelete: () => void;
  onAddToPlaylists: (playlistIds: string[]) => void;
  onExportPDF: () => void;
  onCreatePlaylist: () => void;
}

export function SongBulkActions({
  selectedSongIds,
  playlists,
  onDuplicate,
  onDelete,
  onAddToPlaylists,
  onExportPDF,
  onCreatePlaylist,
}: SongBulkActionsProps) {
  const disabled = selectedSongIds.length === 0;

  return (
    <div className="flex items-center gap-1">
      {/* Duplicate */}
      <button
        onClick={onDuplicate}
        disabled={disabled}
        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Duplicate selected"
      >
        <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Add to Playlist */}
      <BulkAddToPlaylistDropdown
        songIds={selectedSongIds}
        playlists={playlists}
        onAddToPlaylists={onAddToPlaylists}
        onCreatePlaylist={onCreatePlaylist}
      />

      {/* Export PDF */}
      <button
        onClick={onExportPDF}
        disabled={disabled}
        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export to PDF"
      >
        <FileDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        disabled={disabled}
        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Delete selected"
      >
        <Trash2 className="w-4 h-4 text-red-500" />
      </button>
    </div>
  );
}
