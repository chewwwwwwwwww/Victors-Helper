import { useEffect, useRef } from "react";
import { LayoutGrid, Music, AlignLeft, Type } from "lucide-react";
import type { BlockType, UUID } from "../../types/song";

interface BlockTypeOption {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  description: string;
  /** Whether this type can be added at root level (outside sections) */
  allowAtRoot: boolean;
  /** Whether this type can be added inside sections */
  allowInSection: boolean;
}

const BLOCK_TYPE_OPTIONS: BlockTypeOption[] = [
  {
    type: "section",
    label: "Section",
    icon: <LayoutGrid size={16} />,
    description: "Container with title (Verse, Chorus, etc.)",
    allowAtRoot: true,
    allowInSection: false, // Sections cannot be nested
  },
  {
    type: "chordLyricsLine",
    label: "Chord/Lyrics Line",
    icon: <Music size={16} />,
    description: "Line with chords above lyrics",
    allowAtRoot: true,
    allowInSection: true,
  },
  {
    type: "barNotationLine",
    label: "Bar Notation",
    icon: <AlignLeft size={16} />,
    description: "Instrumental bars with repeat marks",
    allowAtRoot: true,
    allowInSection: true,
  },
  {
    type: "freeText",
    label: "Free Text",
    icon: <Type size={16} />,
    description: "Plain text note or instruction",
    allowAtRoot: true,
    allowInSection: true,
  },
];

interface BlockTypePickerProps {
  onSelect: (blockType: BlockType) => void;
  onClose: () => void;
  /** If non-null, we're inserting inside a section */
  parentSectionId: UUID | null;
}

/**
 * Popover menu for selecting which type of block to add.
 */
export function BlockTypePicker({
  onSelect,
  onClose,
  parentSectionId,
}: BlockTypePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on context
  const isInsideSection = parentSectionId !== null;
  const availableOptions = BLOCK_TYPE_OPTIONS.filter((opt) =>
    isInsideSection ? opt.allowInSection : opt.allowAtRoot,
  );

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

    // Close on Escape
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
    };
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="
        absolute left-1/2 -translate-x-1/2 top-full mt-2
        bg-white rounded-lg shadow-lg border border-gray-200
        py-1 z-30 min-w-[200px]
      "
    >
      <div className="px-3 py-1.5 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
        Add Block
      </div>
      {availableOptions.map((option) => (
        <button
          key={option.type}
          type="button"
          onClick={() => onSelect(option.type)}
          className="
            w-full px-3 py-2 text-left
            hover:bg-gray-100
            flex items-center gap-3
            transition-colors
          "
        >
          <span className="text-gray-500">{option.icon}</span>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-700">
              {option.label}
            </div>
            <div className="text-xs text-gray-500">{option.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
