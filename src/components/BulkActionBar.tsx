import { X } from "lucide-react";
import type { ReactNode } from "react";

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCancel: () => void;
  children: ReactNode;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onCancel,
  children,
}: BulkActionBarProps) {
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
      {/* Select All / Deselect All */}
      <button
        onClick={allSelected ? onDeselectAll : onSelectAll}
        className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
      >
        {allSelected ? "Deselect All" : `Select All (${totalCount})`}
      </button>

      {/* Selected count */}
      <span className="text-[10px] text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {selectedCount} selected
      </span>

      {/* Divider */}
      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

      {/* Action buttons */}
      <div className="flex items-center gap-1 flex-1">{children}</div>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        title="Cancel selection"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}
