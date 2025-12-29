import { useDraggable } from "@dnd-kit/core";
import { LayoutGrid, Music, AlignLeft, Type } from "lucide-react";
import type { BlockType } from "../../types/song";

interface BlockTypeConfig {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const BLOCK_TYPES: BlockTypeConfig[] = [
  {
    type: "section",
    label: "Section",
    icon: <LayoutGrid size={16} />,
    description: "Container with title (Verse, Chorus, etc.)",
  },
  {
    type: "chordLyricsLine",
    label: "Chord/Lyrics",
    icon: <Music size={16} />,
    description: "Line with chords above lyrics",
  },
  {
    type: "barNotationLine",
    label: "Bar Notation",
    icon: <AlignLeft size={16} />,
    description: "Instrumental bars with repeat marks",
  },
  {
    type: "freeText",
    label: "Free Text",
    icon: <Type size={16} />,
    description: "Plain text note or instruction",
  },
];

interface ToolbarDragItemProps {
  config: BlockTypeConfig;
}

function ToolbarDragItem({ config }: ToolbarDragItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new-block-${config.type}`,
    data: {
      type: "newBlockTemplate",
      blockType: config.type,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        cursor-grab active:cursor-grabbing
        transition-all duration-100
        ${isDragging ? "opacity-50 scale-95" : "hover:bg-gray-100"}
      `}
      title={config.description}
    >
      <span className="text-gray-600">{config.icon}</span>
      <span className="text-sm text-gray-700 whitespace-nowrap">
        {config.label}
      </span>
    </div>
  );
}

interface BlockTypeToolbarProps {
  className?: string;
}

/**
 * Toolbar section with draggable block type icons.
 * Drag these to add new blocks to the editor.
 */
export function BlockTypeToolbar({ className = "" }: BlockTypeToolbarProps) {
  return (
    <div
      className={`
        flex items-center gap-1
        px-3 py-1
        border-l border-gray-200
        ${className}
      `}
    >
      <span className="text-xs text-gray-500 uppercase tracking-wide mr-2">
        Add:
      </span>
      {BLOCK_TYPES.map((config) => (
        <ToolbarDragItem key={config.type} config={config} />
      ))}
    </div>
  );
}

export { BLOCK_TYPES };
