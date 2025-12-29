import { Trash2, X } from "lucide-react";

interface BulkDeleteConfirmDialogProps {
  itemType: "songs" | "playlists";
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BulkDeleteConfirmDialog({
  itemType,
  count,
  onConfirm,
  onCancel,
}: BulkDeleteConfirmDialogProps) {
  const itemLabel = count === 1 ? itemType.slice(0, -1) : itemType;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Trash2 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">
              Delete {count} {itemLabel}?
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to permanently delete{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {count} {itemLabel}
            </span>
            ?
          </p>
          {itemType === "songs" && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              These songs will also be removed from any playlists they belong
              to.
            </p>
          )}
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
            This action cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Delete {count} {itemLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
