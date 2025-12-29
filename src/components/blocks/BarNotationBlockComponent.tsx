import { useState, useCallback, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BarNotationBlock, UUID } from "../../types/song";
import { DragHandle } from "../dnd/DragHandle";
import { BlockContextMenu } from "./BlockContextMenu";
import type { BlockRenderContext } from "./BlockRenderer";
import { BarNotationEditor } from "../BarNotationEditor";

interface BarNotationBlockComponentProps {
  block: BarNotationBlock;
  parentSectionId: UUID | null;
  context: BlockRenderContext;
  isSelected: boolean;
}

/**
 * Bar notation block for instrumental sections.
 */
export function BarNotationBlockComponent({
  block,
  parentSectionId,
  context,
  isSelected,
}: BarNotationBlockComponentProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-outside handler to exit edit mode
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsEditing(false);
      }
    };

    // Delay adding listener to avoid immediate trigger
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing]);

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
      blockType: "barNotationLine",
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
  }, []);

  const handleBarNotationChange = useCallback(
    (barNotation: import("../../types").BarNotation) => {
      if (context.onBarNotationChange) {
        context.onBarNotationChange(block.id, barNotation);
      }
      // Don't exit edit mode - let user continue editing
      // Click outside will exit edit mode
    },
    [block.id, context],
  );

  const handleBarNotationRemove = useCallback(() => {
    if (context.onBarNotationChange) {
      context.onBarNotationChange(block.id, null);
    }
    setIsEditing(false);
  }, [block.id, context]);

  // Format bar notation for display
  const formatBarNotation = () => {
    const { bars, repeatStart, repeatEnd } = block.barNotation;
    const start = repeatStart ? "||:" : "|";
    const end = repeatEnd ? ":||" : "|";
    return `${start} ${bars.join(" | ")} ${end}`;
  };

  // Combine refs for sortable and click-outside detection
  const combinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
    },
    [setNodeRef],
  );

  return (
    <div
      ref={combinedRef}
      style={style}
      className={`
        bar-notation-block relative group
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

      {/* Bar notation content */}
      {isEditing ? (
        <BarNotationEditor
          barNotation={block.barNotation}
          onChange={handleBarNotationChange}
          onRemove={handleBarNotationRemove}
        />
      ) : (
        <div
          className="
            font-mono py-1 px-2
            bg-gray-50 rounded
            cursor-pointer hover:bg-gray-100
            transition-colors
          "
          onDoubleClick={handleDoubleClick}
        >
          {formatBarNotation()}
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
