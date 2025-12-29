import { useMemo, useState, useCallback, useRef } from "react";
import { Upload, X } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import type {
  Song,
  ChordReference,
  FontMetrics,
  EditableSongMetadata,
} from "../types";
import type { RenderedLine } from "../types/rendering";
import {
  computeLayout,
  DEFAULT_FONT_METRICS,
  pixelXToCharIndex,
} from "../lib/layout-engine";
import { ChartLine } from "./ChartLine";
import { MetadataPanel } from "./MetadataPanel";
import { SectionContainer, StaticSectionContainer } from "./SectionContainer";
import type { AccidentalPreference } from "../types/chord-theory";
import type { LyricEditMode } from "./LyricEditor";

/** Section header patterns (case insensitive) */
const SECTION_HEADER_PATTERNS = [
  /^(verse|chorus|bridge|intro|outro|pre-chorus|prechorus|turnaround|tag|coda|interlude|instrumental|hook|refrain|ending|vamp|solo|breakdown)\s*\d*\s*:?\s*$/i,
  /^\[.*\]$/, // Bracketed headers like [Verse 1]
  /^<.*>$/, // Angle bracket headers like <Chorus>
];

/** Check if a line is a section header */
function isSectionHeader(lyrics: string): boolean {
  const trimmed = lyrics.trim();
  if (!trimmed) return false;
  return SECTION_HEADER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/** Droppable empty column zone */
function DroppableColumn({
  id,
  isEmpty,
  children,
}: {
  id: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      id={id}
      className={`min-h-[200px] transition-colors rounded ${
        isOver ? "bg-blue-50 border-2 border-dashed border-blue-300" : ""
      } ${isEmpty ? "border-2 border-dashed border-gray-200" : ""}`}
    >
      {children}
      {isEmpty && (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          Drop section here
        </div>
      )}
    </div>
  );
}

/** Check if a line is empty (no lyrics, no chords, and no bar notation) */
function isEmptyLine(line: RenderedLine): boolean {
  return !line.lyrics.trim() && !line.hasChords && !line.barNotation;
}

/** A section is a group of consecutive lines that belong together */
interface Section {
  id: string;
  lines: RenderedLine[];
}

/** Group lines into sections based on empty lines and section headers */
function groupLinesIntoSections(lines: RenderedLine[]): Section[] {
  const sections: Section[] = [];
  let currentSection: RenderedLine[] = [];
  let sectionIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isEmpty = isEmptyLine(line);
    const isHeader = isSectionHeader(line.lyrics);

    // Empty lines are section separators
    if (isEmpty) {
      // Save current section if it has content
      if (currentSection.length > 0) {
        sections.push({
          id: `section-${sectionIndex++}`,
          lines: currentSection,
        });
        currentSection = [];
      }
      continue; // Skip adding empty line to any section
    }

    // Section headers start a new section (if we have content already)
    if (isHeader && currentSection.length > 0) {
      sections.push({
        id: `section-${sectionIndex++}`,
        lines: currentSection,
      });
      currentSection = [];
    }

    // Add non-empty line to current section
    currentSection.push(line);
  }

  // Don't forget the last section
  if (currentSection.length > 0) {
    sections.push({
      id: `section-${sectionIndex++}`,
      lines: currentSection,
    });
  }

  return sections;
}

interface ChartViewerProps {
  song: Song;
  fontMetrics?: FontMetrics;
  selectedChords: ChordReference[];
  chordsVisible: boolean;
  accidentalPreference?: AccidentalPreference;
  onChordSelect: (ref: ChordReference) => void;
  onChordDoubleClick: (ref: ChordReference, event?: React.MouseEvent) => void;
  onChordMove: (ref: ChordReference, newCharIndex: number) => void;
  onLineDoubleClick: (lineId: string) => void;
  // Inline lyric editing
  editingLineId: string | null;
  lyricEditMode: LyricEditMode;
  onLyricEditModeChange: (mode: LyricEditMode) => void;
  onLyricCommit: (
    lineId: string,
    newValue: string,
    mode: LyricEditMode,
  ) => void;
  onLyricCancel: () => void;
  onLyricEnter: (lineId: string) => void;
  // Metadata editing
  onMetadataChange?: (updates: Partial<EditableSongMetadata>) => void;
  // Bar notation editing
  onBarNotationChange?: (
    lineId: string,
    barNotation: import("../types").BarNotation | null,
  ) => void;
  // Section column and order control
  onSectionColumnChange?: (
    sectionId: string,
    column: "left" | "right" | null,
  ) => void;
  onSectionOrderChange?: (column: "left" | "right", newOrder: string[]) => void;
  // Logo customization
  logoUrl?: string;
  onLogoUpload?: (file: File) => Promise<void>;
  onLogoClear?: () => void;
  showFooterFields?: boolean;
  // Layout options
  enableSectionDrag?: boolean;
}

export function ChartViewer({
  song,
  fontMetrics = DEFAULT_FONT_METRICS,
  selectedChords,
  chordsVisible,
  accidentalPreference = "auto",
  onChordSelect,
  onChordDoubleClick,
  onChordMove,
  onLineDoubleClick,
  editingLineId,
  lyricEditMode,
  onLyricEditModeChange,
  onLyricCommit,
  onLyricCancel,
  onLyricEnter,
  onMetadataChange,
  onBarNotationChange,
  onSectionColumnChange,
  onSectionOrderChange,
  logoUrl,
  onLogoUpload,
  onLogoClear,
  showFooterFields = false,
  enableSectionDrag = false,
}: ChartViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Chord drag state (for moving chords within a line)
  const [dragState, setDragState] = useState<{
    chordRef: ChordReference;
    lineId: string;
    startX: number;
    currentCharIndex: number;
    originalCharIndex: number;
  } | null>(null);

  // Section drag state (for drag-and-drop between columns)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Compute layout with drag state
  const layout = useMemo(() => {
    return computeLayout(
      song,
      fontMetrics,
      selectedChords,
      dragState?.chordRef ?? null,
      accidentalPreference,
      chordsVisible,
    );
  }, [
    song,
    fontMetrics,
    selectedChords,
    dragState?.chordRef,
    accidentalPreference,
    chordsVisible,
  ]);

  // Get the line for current drag (for lyrics length)
  const dragLine = useMemo(() => {
    if (!dragState) return null;
    return song.lines.find((l) => l.id === dragState.lineId);
  }, [song.lines, dragState]);

  const handleDragStart = useCallback(
    (ref: ChordReference, startX: number) => {
      const line = song.lines.find((l) => l.id === ref.lineId);
      const chord = line?.chords.find((c) => c.id === ref.chordId);

      if (!line || !chord) return;

      setDragState({
        chordRef: ref,
        lineId: ref.lineId,
        startX,
        currentCharIndex: chord.charIndex,
        originalCharIndex: chord.charIndex,
      });
    },
    [song.lines],
  );

  const handleDragMove = useCallback(
    (clientX: number) => {
      if (!dragState || !containerRef.current || !dragLine) return;

      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const newCharIndex = pixelXToCharIndex(
        relativeX,
        fontMetrics.charWidth,
        dragLine.lyrics.length,
      );

      setDragState((prev) =>
        prev ? { ...prev, currentCharIndex: newCharIndex } : null,
      );
    },
    [dragState, dragLine, fontMetrics.charWidth],
  );

  const handleDragEnd = useCallback(() => {
    if (!dragState) return;

    if (dragState.currentCharIndex !== dragState.originalCharIndex) {
      onChordMove(dragState.chordRef, dragState.currentCharIndex);
    }

    setDragState(null);
  }, [dragState, onChordMove]);

  // Get drag preview char index for the line being dragged
  const getDragPreviewCharIndex = useCallback(
    (lineId: string): number | null => {
      if (!dragState || dragState.lineId !== lineId) return null;
      return dragState.currentCharIndex;
    },
    [dragState],
  );

  // Group lines into sections for 2-column layout
  const sections = useMemo(() => {
    return groupLinesIntoSections(layout.lines);
  }, [layout.lines]);

  // Split sections into left and right columns
  const { leftSections, rightSections } = useMemo(() => {
    const columnAssignments = song.columnAssignments || {};
    const sectionOrder = song.sectionOrder || {};
    const left: Section[] = [];
    const right: Section[] = [];

    // Check if any sections have explicit assignments
    const hasExplicitAssignments = Object.keys(columnAssignments).length > 0;

    if (hasExplicitAssignments) {
      // Use explicit assignments
      for (const section of sections) {
        const assignment = columnAssignments[section.id];
        if (assignment === "right") {
          right.push(section);
        } else {
          left.push(section);
        }
      }
    } else {
      // Auto-balance: split roughly in half
      const midpoint = Math.ceil(sections.length / 2);
      left.push(...sections.slice(0, midpoint));
      right.push(...sections.slice(midpoint));
    }

    // Apply section ordering if available
    const sortByOrder = (items: Section[], order: string[] | undefined) => {
      if (!order || order.length === 0) return items;
      // Create a map from id to index for quick lookup
      const orderMap = new Map(order.map((id, idx) => [id, idx]));
      // Sort by order index, with unordered items at the end
      return [...items].sort((a, b) => {
        const aIdx = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const bIdx = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return aIdx - bIdx;
      });
    };

    return {
      leftSections: sortByOrder(left, sectionOrder.left),
      rightSections: sortByOrder(right, sectionOrder.right),
    };
  }, [sections, song.columnAssignments, song.sectionOrder]);

  // Section drag handlers
  const handleSectionDragStart = useCallback((event: DragStartEvent) => {
    setActiveSectionId(event.active.id as string);
  }, []);

  const handleSectionDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveSectionId(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Find which column the active item is in
      const activeInLeft = leftSections.some((s) => s.id === activeId);
      const sourceColumn: "left" | "right" = activeInLeft ? "left" : "right";

      // Determine target column
      const overInLeft =
        overId === "left-column" || leftSections.some((s) => s.id === overId);
      const overInRight =
        overId === "right-column" || rightSections.some((s) => s.id === overId);
      const targetColumn = overInLeft ? "left" : overInRight ? "right" : null;

      if (!targetColumn) return;

      // Check if moving between columns
      if (sourceColumn !== targetColumn && onSectionColumnChange) {
        onSectionColumnChange(activeId, targetColumn);
        return;
      }

      // Reordering within the same column
      if (onSectionOrderChange && activeId !== overId) {
        const currentSections =
          sourceColumn === "left" ? leftSections : rightSections;
        const oldIndex = currentSections.findIndex((s) => s.id === activeId);
        const newIndex = currentSections.findIndex((s) => s.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          // Perform the reorder using arrayMove
          const newOrder = arrayMove(
            currentSections.map((s) => s.id),
            oldIndex,
            newIndex,
          );
          onSectionOrderChange(sourceColumn, newOrder);
        }
      }
    },
    [onSectionColumnChange, onSectionOrderChange, leftSections, rightSections],
  );

  // Find active section for drag overlay
  const activeSection = useMemo(() => {
    if (!activeSectionId) return null;
    return sections.find((s) => s.id === activeSectionId) || null;
  }, [activeSectionId, sections]);

  // Extract metadata for the panel
  const metadata: EditableSongMetadata = {
    title: song.title,
    songwriters: song.songwriters,
    album: song.album,
    recordedBy: song.recordedBy,
    key: song.key,
    tempo: song.tempo,
    timeSignature: song.timeSignature,
    ccliSongNumber: song.ccliSongNumber,
    publisher: song.publisher,
    copyright: song.copyright,
  };

  return (
    <div
      ref={containerRef}
      className="chart-viewer relative"
      style={{
        // Explicit colors for html2canvas compatibility (doesn't support oklch)
        backgroundColor: "#ffffff",
        color: "#1f2937",
      }}
    >
      {/* Header row: Metadata (left) + Logo (right) */}
      <div className="flex justify-between items-start px-4 pt-4 mb-4">
        {/* Metadata Panel - left side */}
        <div className="flex-1 max-w-lg">
          {onMetadataChange ? (
            <MetadataPanel
              metadata={metadata}
              onChange={onMetadataChange}
              showFooterFields={showFooterFields}
            />
          ) : (
            // Read-only display when no handler provided
            <div>
              {song.title && (
                <h1 className="text-2xl font-bold italic">{song.title}</h1>
              )}
              {song.songwriters && song.songwriters.length > 0 && (
                <p className="text-sm text-gray-600">
                  {song.songwriters.join(" | ")}
                </p>
              )}
              {song.album && (
                <p className="text-sm text-gray-600">Album: {song.album}</p>
              )}
              {song.recordedBy && (
                <p className="text-sm text-gray-600">
                  Recorded by: {song.recordedBy}
                </p>
              )}
              {(song.key || song.tempo || song.timeSignature) && (
                <p className="text-sm font-semibold mt-1">
                  {song.key && `Key - ${song.key}`}
                  {song.key && song.tempo && " | "}
                  {song.tempo && `Tempo - ${song.tempo}`}
                  {(song.key || song.tempo) && song.timeSignature && " | "}
                  {song.timeSignature && `Time - ${song.timeSignature}`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Logo - right side */}
        <div className="shrink-0 ml-4 group relative">
          <img
            src={logoUrl || "/logo.png"}
            alt="Logo"
            className="h-12 w-auto object-contain"
          />
          {/* Logo upload overlay - only shown when handlers provided */}
          {(onLogoUpload || onLogoClear) && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded">
              {onLogoUpload && (
                <label className="p-1 bg-white/90 rounded cursor-pointer hover:bg-white transition-colors">
                  <Upload size={14} className="text-gray-700" />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onLogoUpload(file);
                        e.target.value = ""; // Reset input
                      }
                    }}
                  />
                </label>
              )}
              {onLogoClear && logoUrl && (
                <button
                  type="button"
                  onClick={onLogoClear}
                  className="p-1 bg-white/90 rounded hover:bg-white transition-colors"
                  title="Reset to default logo"
                >
                  <X size={14} className="text-red-600" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart content with 2-column grid layout */}
      {enableSectionDrag ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleSectionDragStart}
          onDragEnd={handleSectionDragEnd}
        >
          <div className="font-mono px-4 pb-6 grid grid-cols-2 gap-8">
            {/* Left Column */}
            <SortableContext
              items={leftSections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <DroppableColumn
                id="left-column"
                isEmpty={leftSections.length === 0}
              >
                {leftSections.map((section) => (
                  <SectionContainer
                    key={section.id}
                    section={section}
                    fontMetrics={fontMetrics}
                    chordsVisible={chordsVisible}
                    editingLineId={editingLineId}
                    lyricEditMode={lyricEditMode}
                    onLyricEditModeChange={onLyricEditModeChange}
                    onChordSelect={onChordSelect}
                    onChordDoubleClick={onChordDoubleClick}
                    onChordDragStart={handleDragStart}
                    onChordDragMove={handleDragMove}
                    onChordDragEnd={handleDragEnd}
                    onLineDoubleClick={onLineDoubleClick}
                    onLyricCommit={onLyricCommit}
                    onLyricCancel={onLyricCancel}
                    onLyricEnter={onLyricEnter}
                    getDragPreviewCharIndex={getDragPreviewCharIndex}
                    onBarNotationChange={onBarNotationChange}
                    isDraggable={true}
                  />
                ))}
              </DroppableColumn>
            </SortableContext>

            {/* Right Column */}
            <SortableContext
              items={rightSections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <DroppableColumn
                id="right-column"
                isEmpty={rightSections.length === 0}
              >
                {rightSections.map((section) => (
                  <SectionContainer
                    key={section.id}
                    section={section}
                    fontMetrics={fontMetrics}
                    chordsVisible={chordsVisible}
                    editingLineId={editingLineId}
                    lyricEditMode={lyricEditMode}
                    onLyricEditModeChange={onLyricEditModeChange}
                    onChordSelect={onChordSelect}
                    onChordDoubleClick={onChordDoubleClick}
                    onChordDragStart={handleDragStart}
                    onChordDragMove={handleDragMove}
                    onChordDragEnd={handleDragEnd}
                    onLineDoubleClick={onLineDoubleClick}
                    onLyricCommit={onLyricCommit}
                    onLyricCancel={onLyricCancel}
                    onLyricEnter={onLyricEnter}
                    getDragPreviewCharIndex={getDragPreviewCharIndex}
                    onBarNotationChange={onBarNotationChange}
                    isDraggable={true}
                  />
                ))}
              </DroppableColumn>
            </SortableContext>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeSection && (
              <div className="bg-white shadow-lg rounded p-2 opacity-80">
                <StaticSectionContainer
                  section={activeSection}
                  fontMetrics={fontMetrics}
                  chordsVisible={chordsVisible}
                  editingLineId={null}
                  lyricEditMode={lyricEditMode}
                  onLyricEditModeChange={onLyricEditModeChange}
                  onChordSelect={() => {}}
                  onChordDoubleClick={() => {}}
                  onChordDragStart={() => {}}
                  onChordDragMove={() => {}}
                  onChordDragEnd={() => {}}
                  onLineDoubleClick={() => {}}
                  onLyricCommit={() => {}}
                  onLyricCancel={() => {}}
                  onLyricEnter={() => {}}
                  getDragPreviewCharIndex={() => null}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        /* Non-draggable CSS columns layout */
        <div
          className="font-mono px-4 pb-6"
          style={{
            columns: 2,
            columnGap: "3rem",
            columnFill: "balance",
          }}
        >
          {sections.map((section) => (
            <div
              key={section.id}
              className="section-container mb-6"
              style={{
                breakInside: "avoid",
                pageBreakInside: "avoid",
              }}
            >
              {section.lines.map((line) => (
                <ChartLine
                  key={line.lineId}
                  line={line}
                  fontMetrics={fontMetrics}
                  onChordSelect={onChordSelect}
                  onChordDoubleClick={onChordDoubleClick}
                  onChordDragStart={handleDragStart}
                  onChordDragMove={handleDragMove}
                  onChordDragEnd={handleDragEnd}
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
          ))}
        </div>
      )}

      {/* Footer - CCLI info (only shown when footer fields are visible and have data) */}
      {showFooterFields &&
        (song.ccliSongNumber || song.publisher || song.copyright) && (
          <div className="pdf-footer text-center text-xs text-gray-500 border-t border-gray-200 pt-2 pb-4 px-4">
            {song.ccliSongNumber && (
              <p>
                <strong>CCLI Song Number:</strong> {song.ccliSongNumber}
              </p>
            )}
            {song.publisher && (
              <p>
                <strong>Publisher:</strong> {song.publisher}
                {song.songwriters &&
                  song.songwriters.length > 0 &&
                  `, Writers: ${song.songwriters.join(", ")}`}
              </p>
            )}
            {song.recordedBy && (
              <p>
                <strong>Artists:</strong> {song.recordedBy}
                {song.album && `, Album: ${song.album}`}
              </p>
            )}
          </div>
        )}
    </div>
  );
}
