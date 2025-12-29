import { useState, useCallback, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ChordLyricsBlock, UUID, ChordReference } from "../../types/song";
import { DragHandle } from "../dnd/DragHandle";
import { BlockContextMenu } from "./BlockContextMenu";
import type { BlockRenderContext } from "./BlockRenderer";
import { ChordToken } from "../ChordToken";
import { LyricEditor } from "../LyricEditor";
// Layout engine imports removed - layout computed inline
import { formatChordDisplay } from "../../lib/accidental-display";
import { getTransposedSymbol } from "../../lib/transposition";

interface ChordLyricsBlockComponentProps {
  block: ChordLyricsBlock;
  parentSectionId: UUID | null;
  context: BlockRenderContext;
  isSelected: boolean;
}

/**
 * Chord & Lyrics line block - chords positioned above lyrics.
 */
export function ChordLyricsBlockComponent({
  block,
  parentSectionId,
  context,
  isSelected,
}: ChordLyricsBlockComponentProps) {
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
      blockType: "chordLyricsLine",
      parentSectionId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isEditing = context.editingLineId === block.id;

  // Compute chord layout
  const renderedChords = useMemo(() => {
    return block.chords.map((chord) => {
      // Apply transposition if needed
      const transposedSymbol =
        context.transpositionOffset !== 0
          ? getTransposedSymbol(
              chord.chord,
              context.transpositionOffset,
              context.accidentalPreference,
            )
          : chord.chord;

      const displaySymbol = formatChordDisplay(transposedSymbol);
      const x = chord.charIndex * context.fontMetrics.charWidth;

      const ref: ChordReference = {
        lineId: block.id,
        chordId: chord.id,
      };

      const isChordSelected = context.selectedChords.some(
        (c) => c.lineId === ref.lineId && c.chordId === ref.chordId,
      );

      return {
        chord,
        displaySymbol,
        x,
        ref,
        isSelected: isChordSelected,
      };
    });
  }, [
    block.chords,
    block.id,
    context.transpositionOffset,
    context.accidentalPreference,
    context.fontMetrics.charWidth,
    context.selectedChords,
  ]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleClick = useCallback(() => {
    context.onBlockSelect(block.id);
  }, [block.id, context]);

  const handleDoubleClick = useCallback(() => {
    context.onBlockDoubleClick(block.id);
  }, [block.id, context]);

  const handleLyricCommit = useCallback(
    (lineId: string, newValue: string, mode: "attached" | "detached") => {
      context.onLyricCommit(lineId as UUID, newValue, mode);
    },
    [context],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        chord-lyrics-block relative group
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

      {/* Chord row */}
      {context.chordsVisible && block.chords.length > 0 && (
        <div
          className="relative h-7 font-mono"
          style={{
            minWidth: block.lyrics.length * context.fontMetrics.charWidth,
          }}
        >
          {renderedChords.map(
            ({ chord, displaySymbol, x, ref, isSelected: isChordSelected }) => (
              <ChordToken
                key={chord.id}
                symbol={displaySymbol}
                x={x}
                width={displaySymbol.length * context.fontMetrics.charWidth}
                chordRef={ref}
                isSelected={isChordSelected}
                isDragging={false}
                wasNudged={false}
                onSelect={context.onChordSelect}
                onDoubleClick={context.onChordDoubleClick}
                onDragStart={context.onChordDragStart}
                onDragMove={context.onChordDragMove}
                onDragEnd={context.onChordDragEnd}
              />
            ),
          )}

          {/* Drag preview caret */}
          {context.getDragPreviewCharIndex(block.id) !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 pointer-events-none z-40"
              style={{
                left: `${context.getDragPreviewCharIndex(block.id)! * context.fontMetrics.charWidth}px`,
                backgroundColor: "#3b82f6",
              }}
            />
          )}
        </div>
      )}

      {/* Lyrics row */}
      <div
        className="font-mono whitespace-pre"
        style={{ minHeight: context.fontMetrics.lineHeight }}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <LyricEditor
            lineId={block.id}
            initialValue={block.lyrics}
            mode={context.lyricEditMode}
            onModeChange={context.onLyricEditModeChange}
            onCommit={handleLyricCommit}
            onCancel={context.onLyricCancel}
            onEnter={() => context.onLyricEnter(block.id)}
          />
        ) : (
          <span className="cursor-text">{block.lyrics || "\u00A0"}</span>
        )}
      </div>

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
