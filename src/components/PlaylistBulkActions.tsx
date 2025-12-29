import { Copy, Trash2, FileDown } from "lucide-react";

interface PlaylistBulkActionsProps {
  selectedPlaylistIds: string[];
  onDuplicate: () => void;
  onDelete: () => void;
  onExportPDF: () => void;
}

export function PlaylistBulkActions({
  selectedPlaylistIds,
  onDuplicate,
  onDelete,
  onExportPDF,
}: PlaylistBulkActionsProps) {
  const disabled = selectedPlaylistIds.length === 0;

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
