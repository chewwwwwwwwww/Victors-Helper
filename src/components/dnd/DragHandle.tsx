import { GripVertical } from "lucide-react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

interface DragHandleProps {
  attributes?: DraggableAttributes;
  listeners?: SyntheticListenerMap;
  className?: string;
}

/**
 * 6-dot grip handle for dragging blocks.
 * Appears on hover (via parent group class).
 */
export function DragHandle({
  attributes,
  listeners,
  className = "",
}: DragHandleProps) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className={`
        flex items-center justify-center
        w-6 h-6 rounded
        text-gray-400 hover:text-gray-600
        hover:bg-gray-100
        cursor-grab active:cursor-grabbing
        transition-colors
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        ${className}
      `}
      aria-label="Drag to reorder"
    >
      <GripVertical size={16} />
    </button>
  );
}
