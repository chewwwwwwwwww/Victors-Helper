import { useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FreeTextBlock, UUID } from "../../types/song";
import { DragHandle } from "../dnd/DragHandle";
import { BlockContextMenu } from "./BlockContextMenu";
import type { BlockRenderContext } from "./BlockRenderer";
import { useSong } from "../../contexts/SongContext";

interface FreeTextBlockComponentProps {
  block: FreeTextBlock;
  parentSectionId: UUID | null;
  context: BlockRenderContext;
  isSelected: boolean;
}

/**
 * Free text block for notes, instructions, etc.
 */
export function FreeTextBlockComponent({
  block,
  parentSectionId,
  context,
  isSelected,
}: FreeTextBlockComponentProps) {
  const { updateBlock } = useSong();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(block.text);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    data: {
      type: "block",
      blockId: block.id,
      blockType: "freeText",
      parentSectionId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleClick = useCallback(() => {
    context.onBlockSelect(block.id);
  }, [block.id, context]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditValue(block.text);
  }, [block.text]);

  const handleBlur = useCallback(() => {
    if (editValue !== block.text) {
      updateBlock(block.id, { text: editValue });
    }
    setIsEditing(false);
  }, [editValue, block.id, block.text, updateBlock]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditValue(block.text);
        setIsEditing(false);
      }
      // Allow Shift+Enter for newlines, Enter alone commits
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleBlur();
      }
    },
    [handleBlur, block.text],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        free-text-block relative group
        ${isDragging ? "z-50" : ""}
        ${isSelected ? "bg-blue-50" : ""}
      `}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Drag handle */}
      <div
        className="
          absolute -left-8 top-0 h-full
          opacity-0 group-hover:opacity-100
          transition-opacity
          flex items-center
        "
      >
        <DragHandle attributes={attributes} listeners={listeners} />
      </div>

      {/* Free text content */}
      {isEditing ? (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="
            w-full min-h-[60px] p-2
            border-2 border-blue-500 rounded
            resize-y
            focus:outline-none
          "
          autoFocus
          placeholder="Enter text..."
        />
      ) : (
        <div
          className="
            py-1 px-2
            text-gray-600 italic
            bg-yellow-50 border-l-4 border-yellow-400
            rounded-r
            cursor-text hover:bg-yellow-100
            transition-colors
            whitespace-pre-wrap
            min-h-[24px]
          "
          onDoubleClick={handleDoubleClick}
        >
          {block.text || "(Empty note - double-click to edit)"}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <BlockContextMenu
          blockId={block.id}
          parentSectionId={parentSectionId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
