import { useState, type ReactNode } from "react";
import { ChevronDown, Search, CheckSquare } from "lucide-react";

interface SidebarSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  headerAction?: ReactNode;
  /** Enable selection mode UI */
  selectable?: boolean;
  /** Current selection mode state */
  isSelectionMode?: boolean;
  /** Toggle selection mode callback */
  onToggleSelectionMode?: () => void;
  /** Action bar content to render when items are selected */
  selectionActionBar?: ReactNode;
}

export function SidebarSection({
  title,
  icon,
  children,
  defaultExpanded = true,
  searchable = false,
  searchValue = "",
  onSearchChange,
  headerAction,
  selectable = false,
  isSelectionMode = false,
  onToggleSelectionMode,
  selectionActionBar,
}: SidebarSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
        <span className="flex-1 text-left">{title}</span>
        {/* Select button */}
        {selectable && !isSelectionMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelectionMode?.();
            }}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Select items"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
        )}
        {headerAction && (
          <span
            onClick={(e) => e.stopPropagation()}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            {headerAction}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isExpanded ? "" : "-rotate-90"
          }`}
        />
      </button>

      {/* Selection Action Bar */}
      {isSelectionMode && selectionActionBar && isExpanded && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          {selectionActionBar}
        </div>
      )}

      {/* Content */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? "max-h-[500px]" : "max-h-0"
        }`}
      >
        {/* Search - hide during selection mode */}
        {searchable && isExpanded && !isSelectionMode && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Children */}
        <div className="px-2 pb-2 space-y-1 max-h-80 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
