import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { RenderedLine } from "../types/rendering";
import type { FontMetrics, ChordReference, BarNotation } from "../types";
import { ChartLine } from "./ChartLine";
import type { LyricEditMode } from "./LyricEditor";

interface Section {
  id: string;
  lines: RenderedLine[];
}

interface SectionContainerProps {
  section: Section;
  fontMetrics: FontMetrics;
  chordsVisible: boolean;
  editingLineId: string | null;
  lyricEditMode: LyricEditMode;
  onLyricEditModeChange: (mode: LyricEditMode) => void;
  onChordSelect: (ref: ChordReference) => void;
  onChordDoubleClick: (ref: ChordReference, event?: React.MouseEvent) => void;
  onChordDragStart: (ref: ChordReference, startX: number) => void;
  onChordDragMove: (clientX: number) => void;
  onChordDragEnd: () => void;
  onLineDoubleClick: (lineId: string) => void;
  onLyricCommit: (
    lineId: string,
    newValue: string,
    mode: LyricEditMode,
  ) => void;
  onLyricCancel: () => void;
  onLyricEnter: (lineId: string) => void;
  getDragPreviewCharIndex: (lineId: string) => number | null;
  onBarNotationChange?: (
    lineId: string,
    barNotation: BarNotation | null,
  ) => void;
  isDraggable?: boolean;
}

export function SectionContainer({
  section,
  fontMetrics,
  chordsVisible,
  editingLineId,
  lyricEditMode,
  onLyricEditModeChange,
  onChordSelect,
  onChordDoubleClick,
  onChordDragStart,
  onChordDragMove,
  onChordDragEnd,
  onLineDoubleClick,
  onLyricCommit,
  onLyricCancel,
  onLyricEnter,
  getDragPreviewCharIndex,
  onBarNotationChange,
  isDraggable = true,
}: SectionContainerProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`section-container mb-6 relative group ${isDragging ? "z-50" : ""}`}
    >
      {/* Full-height drag handle */}
      {isDraggable && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-8 top-0 bottom-0 w-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex items-center justify-center hover:bg-gray-100 rounded-l"
        >
          <GripVertical size={16} className="text-gray-400" />
        </div>
      )}

      {/* Section content */}
      {section.lines.map((line) => (
        <ChartLine
          key={line.lineId}
          line={line}
          fontMetrics={fontMetrics}
          onChordSelect={onChordSelect}
          onChordDoubleClick={onChordDoubleClick}
          onChordDragStart={onChordDragStart}
          onChordDragMove={onChordDragMove}
          onChordDragEnd={onChordDragEnd}
          onLineDoubleClick={onLineDoubleClick}
          dragPreviewCharIndex={getDragPreviewCharIndex(line.lineId)}
          chordsVisible={chordsVisible}
          isEditingLyric={editingLineId === line.lineId}
          lyricEditMode={lyricEditMode}
          onLyricEditModeChange={onLyricEditModeChange}
          onLyricCommit={onLyricCommit}
          onLyricCancel={onLyricCancel}
          onLyricEnter={onLyricEnter}
          onBarNotationChange={onBarNotationChange}
        />
      ))}
    </div>
  );
}

/** Non-draggable version for simpler use cases */
export function StaticSectionContainer({
  section,
  fontMetrics,
  chordsVisible,
  editingLineId,
  lyricEditMode,
  onLyricEditModeChange,
  onChordSelect,
  onChordDoubleClick,
  onChordDragStart,
  onChordDragMove,
  onChordDragEnd,
  onLineDoubleClick,
  onLyricCommit,
  onLyricCancel,
  onLyricEnter,
  getDragPreviewCharIndex,
}: Omit<SectionContainerProps, "isDraggable">) {
  return (
    <div className="section-container mb-6">
      {section.lines.map((line) => (
        <ChartLine
          key={line.lineId}
          line={line}
          fontMetrics={fontMetrics}
          onChordSelect={onChordSelect}
          onChordDoubleClick={onChordDoubleClick}
          onChordDragStart={onChordDragStart}
          onChordDragMove={onChordDragMove}
          onChordDragEnd={onChordDragEnd}
          onLineDoubleClick={onLineDoubleClick}
          dragPreviewCharIndex={getDragPreviewCharIndex(line.lineId)}
          chordsVisible={chordsVisible}
          isEditingLyric={editingLineId === line.lineId}
          lyricEditMode={lyricEditMode}
          onLyricEditModeChange={onLyricEditModeChange}
          onLyricCommit={onLyricCommit}
          onLyricCancel={onLyricCancel}
          onLyricEnter={onLyricEnter}
        />
      ))}
    </div>
  );
}
