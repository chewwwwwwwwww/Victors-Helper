import { useState, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus, Clipboard } from "lucide-react";
import { useSong } from "../../contexts/SongContext";
import { BlockTypePicker } from "./BlockTypePicker";
import type { UUID, BlockType } from "../../types/song";

interface BlockDropZoneProps {
  /** Position relative to the target block */
  position: "before" | "after";
  /** The block ID this drop zone is adjacent to */
  targetBlockId: UUID;
  /** Parent section ID (null for root level) */
  parentSectionId: UUID | null;
  /** Whether this is the first/last position in a container */
  isEdge?: boolean;
}

/**
 * Drop zone between blocks that shows:
 * 1. Drop indicator when dragging over
 * 2. Hover add menu (+) for quick block insertion
 * 3. Paste button when clipboard has content
 */
export function BlockDropZone({
  position,
  targetBlockId,
  parentSectionId,
  isEdge = false,
}: BlockDropZoneProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const { clipboard, pasteBlock, insertBlock, insertBlockBefore } = useSong();

  const dropZoneId = `dropzone-${position}-${targetBlockId}`;

  const { setNodeRef, isOver } = useDroppable({
    id: dropZoneId,
    data: {
      type: "dropZone",
      position,
      targetBlockId,
      parentSectionId,
    },
  });

  const handleAddClick = useCallback(() => {
    setShowPicker(true);
  }, []);

  const handlePasteClick = useCallback(() => {
    const afterId = position === "after" ? targetBlockId : null;
    pasteBlock(afterId, parentSectionId);
    setIsHovered(false);
  }, [position, targetBlockId, parentSectionId, pasteBlock]);

  const handleBlockTypeSelect = useCallback(
    (blockType: string) => {
      const bt = blockType as BlockType;
      if (position === "before") {
        // Insert before the target block
        insertBlockBefore(bt, targetBlockId, parentSectionId);
      } else {
        // Insert after the target block
        insertBlock(bt, targetBlockId, parentSectionId);
      }
      setShowPicker(false);
      setIsHovered(false);
    },
    [position, targetBlockId, parentSectionId, insertBlock, insertBlockBefore],
  );

  return (
    <div
      ref={setNodeRef}
      className={`
        relative
        transition-all duration-100
        ${isEdge ? "h-4" : "h-2"}
        group/dropzone
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowPicker(false);
      }}
    >
      {/* Drop indicator line (visible when dragging over) */}
      {isOver && (
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-500 z-10"
          style={{ boxShadow: "0 0 4px rgba(59, 130, 246, 0.5)" }}
        />
      )}

      {/* Hover add menu */}
      {isHovered && !isOver && (
        <div
          className="
            absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2
            flex items-center gap-1 z-20
          "
        >
          {/* Add button */}
          <button
            type="button"
            onClick={handleAddClick}
            className="
              p-1.5 rounded-full
              bg-blue-500 text-white
              shadow-sm hover:bg-blue-600
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
            "
            title="Add block"
          >
            <Plus size={14} />
          </button>

          {/* Paste button (shown when clipboard has content) */}
          {clipboard && clipboard.blocks.length > 0 && (
            <button
              type="button"
              onClick={handlePasteClick}
              className="
                p-1.5 rounded-full
                bg-green-500 text-white
                shadow-sm hover:bg-green-600
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1
              "
              title="Paste block"
            >
              <Clipboard size={14} />
            </button>
          )}
        </div>
      )}

      {/* Block type picker popover */}
      {showPicker && (
        <BlockTypePicker
          onSelect={handleBlockTypeSelect}
          onClose={() => setShowPicker(false)}
          parentSectionId={parentSectionId}
        />
      )}
    </div>
  );
}
