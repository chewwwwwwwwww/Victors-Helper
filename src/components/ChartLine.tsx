import { useCallback, useRef } from "react";
import type {
  RenderedLine,
  FontMetrics,
  ChordReference,
  BarNotation,
} from "../types";
import { ChordToken } from "./ChordToken";
import { LyricEditor, type LyricEditMode } from "./LyricEditor";
import { BarNotationEditor, BarNotationDisplay } from "./BarNotationEditor";

interface ChartLineProps {
  line: RenderedLine;
  fontMetrics: FontMetrics;
  onChordSelect: (ref: ChordReference) => void;
  onChordDoubleClick: (ref: ChordReference, event?: React.MouseEvent) => void;
  onChordDragStart: (ref: ChordReference, startX: number) => void;
  onChordDragMove: (clientX: number) => void;
  onChordDragEnd: () => void;
  onLineDoubleClick: (lineId: string) => void;
  dragPreviewCharIndex: number | null;
  chordsVisible: boolean;
  // Inline lyric editing
  isEditingLyric: boolean;
  lyricEditMode: LyricEditMode;
  onLyricEditModeChange: (mode: LyricEditMode) => void;
  onLyricCommit: (
    lineId: string,
    newValue: string,
    mode: LyricEditMode,
  ) => void;
  onLyricCancel: () => void;
  onLyricEnter: (lineId: string) => void;
  // Bar notation
  onBarNotationChange?: (
    lineId: string,
    barNotation: BarNotation | null,
  ) => void;
  readOnly?: boolean;
}

export function ChartLine({
  line,
  fontMetrics,
  onChordSelect,
  onChordDoubleClick,
  onChordDragStart,
  onChordDragMove,
  onChordDragEnd,
  onLineDoubleClick,
  dragPreviewCharIndex,
  chordsVisible,
  isEditingLyric,
  lyricEditMode,
  onLyricEditModeChange,
  onLyricCommit,
  onLyricCancel,
  onLyricEnter,
  onBarNotationChange,
  readOnly = false,
}: ChartLineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLineDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      // Only trigger if clicking on lyrics, not on a chord
      if ((e.target as HTMLElement).closest(".chord-token")) return;
      onLineDoubleClick(line.lineId);
    },
    [line.lineId, onLineDoubleClick],
  );

  // Handle bar notation changes
  const handleBarNotationChange = useCallback(
    (barNotation: BarNotation) => {
      onBarNotationChange?.(line.lineId, barNotation);
    },
    [line.lineId, onBarNotationChange],
  );

  // Handle removing bar notation (convert back to regular line)
  const handleRemoveBarNotation = useCallback(() => {
    onBarNotationChange?.(line.lineId, null);
  }, [line.lineId, onBarNotationChange]);

  // If line has bar notation, render it only when chords are visible
  if (line.barNotation) {
    // When chords are hidden, don't render bar notation lines at all
    if (!chordsVisible) {
      return null;
    }
    return (
      <div
        ref={containerRef}
        className="relative"
        style={{ minHeight: fontMetrics.lineHeight }}
      >
        {readOnly || !onBarNotationChange ? (
          <BarNotationDisplay barNotation={line.barNotation} />
        ) : (
          <BarNotationEditor
            barNotation={line.barNotation}
            onChange={handleBarNotationChange}
            onRemove={handleRemoveBarNotation}
            readOnly={readOnly}
          />
        )}
      </div>
    );
  }

  // Regular chord/lyric line
  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: line.height }}
    >
      {/* Chord Row - only rendered when chords are visible */}
      {line.hasChords && chordsVisible && (
        <div
          className="relative"
          style={{
            height: fontMetrics.chordRowHeight,
          }}
        >
          {line.chords.map((chord) => (
            <ChordToken
              key={chord.chordRef.chordId}
              symbol={chord.symbol}
              x={chord.x}
              width={chord.width}
              isSelected={chord.isSelected}
              isDragging={chord.isDragging}
              wasNudged={chord.wasNudged}
              chordRef={chord.chordRef}
              onSelect={onChordSelect}
              onDoubleClick={onChordDoubleClick}
              onDragStart={onChordDragStart}
              onDragMove={onChordDragMove}
              onDragEnd={onChordDragEnd}
            />
          ))}

          {/* Drag preview caret */}
          {dragPreviewCharIndex !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 pointer-events-none z-40"
              style={{
                left: `${dragPreviewCharIndex * fontMetrics.charWidth}px`,
                backgroundColor: "#3b82f6", // Explicit hex for html2canvas
              }}
            />
          )}
        </div>
      )}

      {/* Lyrics Row */}
      <div
        className="lyric-line font-mono whitespace-pre"
        style={{
          lineHeight: `${fontMetrics.lineHeight}px`,
          fontSize: `${fontMetrics.fontSize}px`,
          minHeight: `${fontMetrics.lineHeight}px`,
          color: "#1f2937", // Explicit hex for html2canvas (gray-800)
        }}
        onDoubleClick={!isEditingLyric ? handleLineDoubleClick : undefined}
      >
        {isEditingLyric ? (
          <LyricEditor
            lineId={line.lineId}
            initialValue={line.lyrics}
            mode={lyricEditMode}
            onModeChange={onLyricEditModeChange}
            onCommit={onLyricCommit}
            onCancel={onLyricCancel}
            onEnter={onLyricEnter}
          />
        ) : (
          <span className="cursor-text">
            {line.lyrics || "\u00A0"} {/* Non-breaking space for empty lines */}
          </span>
        )}
      </div>
    </div>
  );
}
