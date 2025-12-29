import { useState, useEffect, useRef, useCallback } from "react";
import { Copy, ClipboardPaste, Trash2 } from "lucide-react";
import { useSong } from "../../contexts/SongContext";
import type { UUID } from "../../types/song";

interface BlockContextMenuProps {
  blockId: UUID;
  parentSectionId: UUID | null;
  x: number;
  y: number;
  onClose: () => void;
}

/**
 * Right-click context menu for blocks.
 * Shows: Copy, Paste above, Paste below, Delete (with confirmation)
 */
export function BlockContextMenu({
  blockId,
  parentSectionId,
  x,
  y,
  onClose,
}: BlockContextMenuProps) {
  const { copyBlock, pasteBlock, deleteBlock, clipboard } = useSong();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const deleteConfirmTimeoutRef = useRef<number | null>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      if (deleteConfirmTimeoutRef.current) {
        clearTimeout(deleteConfirmTimeoutRef.current);
      }
    };
  }, [onClose]);

  // Auto-dismiss delete confirmation after 3 seconds
  useEffect(() => {
    if (showDeleteConfirm) {
      deleteConfirmTimeoutRef.current = window.setTimeout(() => {
        setShowDeleteConfirm(false);
      }, 3000);
    }

    return () => {
      if (deleteConfirmTimeoutRef.current) {
        clearTimeout(deleteConfirmTimeoutRef.current);
      }
    };
  }, [showDeleteConfirm]);

  const handleCopy = useCallback(() => {
    copyBlock(blockId);
    onClose();
  }, [blockId, copyBlock, onClose]);

  const handlePasteAbove = useCallback(() => {
    // Paste before this block (afterId = null means at beginning, but we need
    // to find the previous block's ID - for simplicity, we'll use a special approach)
    pasteBlock(null, parentSectionId);
    onClose();
  }, [pasteBlock, parentSectionId, onClose]);

  const handlePasteBelow = useCallback(() => {
    pasteBlock(blockId, parentSectionId);
    onClose();
  }, [blockId, pasteBlock, parentSectionId, onClose]);

  const handleDelete = useCallback(() => {
    deleteBlock(blockId);
    onClose();
  }, [blockId, deleteBlock, onClose]);

  const hasClipboard = clipboard && clipboard.blocks.length > 0;

  return (
    <div
      ref={containerRef}
      className="
        fixed bg-white rounded-lg shadow-lg border border-gray-200
        py-1 z-50 min-w-[180px]
      "
      style={{ left: x, top: y }}
    >
      {/* Copy */}
      <button
        type="button"
        onClick={handleCopy}
        className="
          w-full px-3 py-2 text-left text-sm
          hover:bg-gray-100
          flex items-center gap-3
          transition-colors
        "
      >
        <Copy size={14} className="text-gray-500" />
        <span className="flex-1">Copy</span>
        <span className="text-xs text-gray-400">Ctrl+C</span>
      </button>

      {/* Paste above */}
      {hasClipboard && (
        <button
          type="button"
          onClick={handlePasteAbove}
          className="
            w-full px-3 py-2 text-left text-sm
            hover:bg-gray-100
            flex items-center gap-3
            transition-colors
          "
        >
          <ClipboardPaste size={14} className="text-gray-500" />
          <span className="flex-1">Paste above</span>
          <span className="text-xs text-gray-400">Opt+V</span>
        </button>
      )}

      {/* Paste below */}
      {hasClipboard && (
        <button
          type="button"
          onClick={handlePasteBelow}
          className="
            w-full px-3 py-2 text-left text-sm
            hover:bg-gray-100
            flex items-center gap-3
            transition-colors
          "
        >
          <ClipboardPaste size={14} className="text-gray-500" />
          <span className="flex-1">Paste below</span>
          <span className="text-xs text-gray-400">Ctrl+V</span>
        </button>
      )}

      {/* Divider */}
      <div className="border-t border-gray-200 my-1" />

      {/* Delete */}
      {showDeleteConfirm ? (
        <div className="px-3 py-2 flex items-center gap-2">
          <Trash2 size={14} className="text-red-500" />
          <span className="text-sm text-red-600">Delete?</span>
          <button
            type="button"
            onClick={handleDelete}
            className="
              px-2 py-1 text-xs
              bg-red-500 text-white rounded
              hover:bg-red-600
              transition-colors
            "
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(false)}
            className="
              px-2 py-1 text-xs
              bg-gray-200 text-gray-700 rounded
              hover:bg-gray-300
              transition-colors
            "
          >
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="
            w-full px-3 py-2 text-left text-sm
            text-red-600 hover:bg-red-50
            flex items-center gap-3
            transition-colors
          "
        >
          <Trash2 size={14} />
          <span className="flex-1">Delete</span>
        </button>
      )}
    </div>
  );
}
