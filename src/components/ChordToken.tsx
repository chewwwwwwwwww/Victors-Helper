import { useRef, useCallback } from "react";
import type { ChordReference } from "../types";

interface ChordTokenProps {
  symbol: string;
  x: number;
  width: number;
  isSelected: boolean;
  isDragging: boolean;
  wasNudged: boolean;
  chordRef: ChordReference;
  onSelect: (ref: ChordReference) => void;
  onDoubleClick: (ref: ChordReference, event?: React.MouseEvent) => void;
  onDragStart: (ref: ChordReference, startX: number) => void;
  onDragMove: (clientX: number) => void;
  onDragEnd: () => void;
}

export function ChordToken({
  symbol,
  x,
  isSelected,
  isDragging,
  wasNudged,
  chordRef,
  onSelect,
  onDoubleClick,
  onDragStart,
  onDragMove,
  onDragEnd,
}: ChordTokenProps) {
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Capture pointer for drag tracking
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      isDraggingRef.current = false;
      startXRef.current = e.clientX;

      onSelect(chordRef);
    },
    [chordRef, onSelect],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const distance = Math.abs(e.clientX - startXRef.current);

      // Start drag after 5px of movement
      if (distance > 5 && !isDraggingRef.current) {
        isDraggingRef.current = true;
        onDragStart(chordRef, startXRef.current);
      }

      if (isDraggingRef.current) {
        onDragMove(e.clientX);
      }
    },
    [chordRef, onDragStart, onDragMove],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      if (isDraggingRef.current) {
        onDragEnd();
        isDraggingRef.current = false;
      }
    },
    [onDragEnd],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDoubleClick(chordRef, e);
    },
    [chordRef, onDoubleClick],
  );

  return (
    <span
      className={`
        chord-token absolute cursor-grab select-none
        font-mono font-semibold text-sm
        px-1 rounded
        transition-all duration-150
        ${isDragging ? "opacity-50 cursor-grabbing z-50" : ""}
        ${wasNudged ? "border-l-2" : ""}
      `}
      style={{
        left: `${x}px`,
        top: 0,
        touchAction: "none",
        // Explicit hex colors for html2canvas compatibility (doesn't support oklch)
        color: "#2563eb", // blue-600
        backgroundColor: isSelected ? "#dbeafe" : undefined, // blue-100
        boxShadow: isSelected ? "0 0 0 2px #3b82f6" : undefined, // ring-blue-500
        borderLeftColor: wasNudged ? "#fb923c" : undefined, // orange-400
      }}
      data-chord-id={chordRef.chordId}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      role="button"
      tabIndex={0}
      aria-label={`Chord ${symbol}`}
      aria-selected={isSelected}
    >
      {symbol}
    </span>
  );
}
