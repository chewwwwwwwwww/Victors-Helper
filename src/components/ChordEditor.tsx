import { useState, useEffect, useRef, useCallback } from "react";
import type { ChordReference } from "../types";
import { validateChord } from "../lib/chord-validator";
import {
  formatChordDisplay,
  normalizeChordAccidentals,
} from "../lib/accidental-display";

interface ChordEditorProps {
  chordRef: ChordReference;
  initialValue: string;
  x: number;
  y: number;
  onCommit: (chordRef: ChordReference, newValue: string) => void;
  onCancel: () => void;
  onDelete: (chordRef: ChordReference) => void;
}

export function ChordEditor({
  chordRef,
  initialValue,
  x,
  y,
  onCommit,
  onCancel,
  onDelete,
}: ChordEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (newValue.trim()) {
      const validation = validateChord(newValue);
      setError(validation.isValid ? null : validation.error || "Invalid chord");
    } else {
      setError(null);
    }
  }, []);

  const handleCommit = useCallback(() => {
    const trimmed = value.trim();

    if (!trimmed) {
      // Empty value = delete chord
      onDelete(chordRef);
      return;
    }

    const validation = validateChord(trimmed);
    if (!validation.isValid) {
      setError(validation.error || "Invalid chord");
      return;
    }

    // Normalize accidentals for storage
    const normalized = normalizeChordAccidentals(trimmed);
    onCommit(chordRef, normalized);
  }, [value, chordRef, onCommit, onDelete]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "Enter":
          e.preventDefault();
          handleCommit();
          break;
        case "Escape":
          e.preventDefault();
          onCancel();
          break;
        case "Delete":
        case "Backspace":
          if (value === "") {
            e.preventDefault();
            onDelete(chordRef);
          }
          break;
      }
    },
    [handleCommit, onCancel, onDelete, chordRef, value],
  );

  const handleBlur = useCallback(() => {
    handleCommit();
  }, [handleCommit]);

  // Preview the formatted chord
  const preview = value.trim() ? formatChordDisplay(value.trim()) : "";

  return (
    <div className="absolute z-50" style={{ left: x, top: y }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={`
            w-24 px-2 py-1 text-sm font-mono
            bg-white dark:bg-gray-700
            border rounded
            focus:outline-none focus:ring-2
            ${
              error
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
            }
          `}
          placeholder="Chord"
          aria-label="Edit chord"
          aria-invalid={!!error}
        />

        {/* Preview */}
        {preview && !error && (
          <div className="mt-1 text-sm text-blue-600 dark:text-blue-400 font-mono font-semibold">
            {preview}
          </div>
        )}

        {/* Error message */}
        {error && <div className="mt-1 text-xs text-red-500">{error}</div>}

        {/* Hint */}
        <div className="mt-1 text-xs text-gray-400">
          Enter to save, Esc to cancel
        </div>
      </div>
    </div>
  );
}
