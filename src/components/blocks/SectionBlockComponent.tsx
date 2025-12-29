import { useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SectionBlock } from "../../types/song";
import { DragHandle } from "../dnd/DragHandle";
import { BlockList, type BlockRenderContext } from "./BlockRenderer";
import { BlockContextMenu } from "./BlockContextMenu";
import { useSong } from "../../contexts/SongContext";

interface SectionBlockComponentProps {
  block: SectionBlock;
  context: BlockRenderContext;
  isSelected: boolean;
}

/**
 * Section block component - container with label and children.
 */
export function SectionBlockComponent({
  block,
  context,
  isSelected,
}: SectionBlockComponentProps) {
  const { updateBlock } = useSong();
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editLabelValue, setEditLabelValue] = useState(block.label);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

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
      blockType: "section",
      parentSectionId: null,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleLabelDoubleClick = useCallback(() => {
    setIsEditingLabel(true);
    setEditLabelValue(block.label);
  }, [block.label]);

  const handleLabelBlur = useCallback(() => {
    if (editLabelValue.trim() && editLabelValue !== block.label) {
      updateBlock(block.id, { label: editLabelValue.trim() });
    }
    setIsEditingLabel(false);
  }, [editLabelValue, block.id, block.label, updateBlock]);

  const handleLabelKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleLabelBlur();
      } else if (e.key === "Escape") {
        setEditLabelValue(block.label);
        setIsEditingLabel(false);
      }
    },
    [handleLabelBlur, block.label],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleClick = useCallback(() => {
    context.onBlockSelect(block.id);
  }, [block.id, context]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        section-block relative group mb-6
        ${isDragging ? "z-50" : ""}
        ${isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
      `}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Drag handle */}
      <div
        className="
          absolute -left-8 top-0 h-8
          opacity-0 group-hover:opacity-100
          transition-opacity
        "
      >
        <DragHandle attributes={attributes} listeners={listeners} />
      </div>

      {/* Section header */}
      <div className="flex items-center gap-2 mb-2">
        {isEditingLabel ? (
          <input
            type="text"
            value={editLabelValue}
            onChange={(e) => setEditLabelValue(e.target.value)}
            onBlur={handleLabelBlur}
            onKeyDown={handleLabelKeyDown}
            className="
              text-sm font-semibold text-gray-600 uppercase tracking-wide
              bg-transparent border-b-2 border-blue-500
              outline-none px-1
            "
            autoFocus
          />
        ) : (
          <h3
            className="
              text-sm font-semibold text-gray-600 uppercase tracking-wide
              cursor-text hover:text-gray-800
              px-1 py-0.5 -mx-1 rounded
              hover:bg-gray-100
            "
            onDoubleClick={handleLabelDoubleClick}
          >
            {block.label || "Untitled Section"}
          </h3>
        )}
      </div>

      {/* Section content (children) */}
      <div className="pl-4 border-l-2 border-gray-200">
        <BlockList
          blocks={block.children}
          parentSectionId={block.id}
          context={context}
        />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <BlockContextMenu
          blockId={block.id}
          parentSectionId={null}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
