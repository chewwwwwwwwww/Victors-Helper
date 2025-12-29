import { useDroppable } from "@dnd-kit/core";
import type {
  Block,
  UUID,
  ChordReference,
  FontMetrics,
  BarNotation,
} from "../../types";
import { SectionBlockComponent } from "./SectionBlockComponent";
import { ChordLyricsBlockComponent } from "./ChordLyricsBlockComponent";
import { BarNotationBlockComponent } from "./BarNotationBlockComponent";
import { FreeTextBlockComponent } from "./FreeTextBlockComponent";
import { BlockDropZone } from "./BlockDropZone";
import type { LyricEditMode } from "../LyricEditor";

export interface BlockRenderContext {
  fontMetrics: FontMetrics;
  chordsVisible: boolean;
  accidentalPreference: "auto" | "sharps" | "flats";
  transpositionOffset: number;

  // Selection state
  selectedBlockId: UUID | null;
  editingBlockId: UUID | null;
  editingLineId: UUID | null;
  lyricEditMode: LyricEditMode;

  // Chord operations
  selectedChords: ChordReference[];
  onChordSelect: (ref: ChordReference) => void;
  onChordDoubleClick: (ref: ChordReference, event?: React.MouseEvent) => void;
  onChordMove: (ref: ChordReference, newCharIndex: number) => void;

  // Chord drag operations
  onChordDragStart: (ref: ChordReference, startX: number) => void;
  onChordDragMove: (clientX: number) => void;
  onChordDragEnd: () => void;
  getDragPreviewCharIndex: (lineId: string) => number | null;

  // Lyric operations
  onLyricEditModeChange: (mode: LyricEditMode) => void;
  onLyricCommit: (blockId: UUID, newValue: string, mode: LyricEditMode) => void;
  onLyricCancel: () => void;
  onLyricEnter: (blockId: UUID) => void;

  // Block operations
  onBlockSelect: (blockId: UUID) => void;
  onBlockDoubleClick: (blockId: UUID) => void;
  onBlockContextMenu: (blockId: UUID, x: number, y: number) => void;

  // Bar notation
  onBarNotationChange?: (
    blockId: UUID,
    barNotation: BarNotation | null,
  ) => void;
}

interface BlockRendererProps {
  block: Block;
  parentSectionId: UUID | null;
  context: BlockRenderContext;
  isLast?: boolean;
}

/**
 * Polymorphic block renderer that renders the appropriate component
 * based on block type.
 */
export function BlockRenderer({
  block,
  parentSectionId,
  context,
  isLast = false,
}: BlockRendererProps) {
  const isSelected = context.selectedBlockId === block.id;

  // Common wrapper for all block types
  const blockContent = (() => {
    switch (block.type) {
      case "section":
        return (
          <SectionBlockComponent
            block={block}
            context={context}
            isSelected={isSelected}
          />
        );

      case "chordLyricsLine":
        return (
          <ChordLyricsBlockComponent
            block={block}
            parentSectionId={parentSectionId}
            context={context}
            isSelected={isSelected}
          />
        );

      case "barNotationLine":
        return (
          <BarNotationBlockComponent
            block={block}
            parentSectionId={parentSectionId}
            context={context}
            isSelected={isSelected}
          />
        );

      case "freeText":
        return (
          <FreeTextBlockComponent
            block={block}
            parentSectionId={parentSectionId}
            context={context}
            isSelected={isSelected}
          />
        );

      default:
        return null;
    }
  })();

  return (
    <div
      className="block-wrapper"
      style={{
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      {/* Drop zone before this block */}
      <BlockDropZone
        position="before"
        targetBlockId={block.id}
        parentSectionId={parentSectionId}
      />

      {/* Block content */}
      {blockContent}

      {/* Drop zone after this block (only for last block) */}
      {isLast && (
        <BlockDropZone
          position="after"
          targetBlockId={block.id}
          parentSectionId={parentSectionId}
          isEdge
        />
      )}
    </div>
  );
}

/**
 * Empty container drop zone component
 */
function EmptyContainerDropZone({
  parentSectionId,
}: {
  parentSectionId: UUID | null;
}) {
  const dropZoneId = `empty-container-${parentSectionId ?? "root"}`;

  const { setNodeRef, isOver } = useDroppable({
    id: dropZoneId,
    data: {
      type: "emptyContainer",
      parentSectionId,
      // Insert at the beginning of this container
      targetBlockId: null,
      position: "after",
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[50px] border-2 border-dashed rounded
        flex items-center justify-center text-sm
        transition-colors
        ${isOver ? "border-blue-400 bg-blue-50 text-blue-500" : "border-gray-200 text-gray-400"}
      `}
    >
      Drop blocks here
    </div>
  );
}

/**
 * Render a list of blocks with drop zones.
 */
export function BlockList({
  blocks,
  parentSectionId,
  context,
}: {
  blocks: Block[];
  parentSectionId: UUID | null;
  context: BlockRenderContext;
}) {
  if (blocks.length === 0) {
    // Empty drop zone for empty containers
    return <EmptyContainerDropZone parentSectionId={parentSectionId} />;
  }

  return (
    <>
      {blocks.map((block, index) => (
        <BlockRenderer
          key={block.id}
          block={block}
          parentSectionId={parentSectionId}
          context={context}
          isLast={index === blocks.length - 1}
        />
      ))}
    </>
  );
}
