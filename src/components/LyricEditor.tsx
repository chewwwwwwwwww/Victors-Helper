import { useState, useEffect, useRef, useCallback } from "react";
import { Link2, Link2Off } from "lucide-react";

export type LyricEditMode = "attached" | "detached";

interface LyricEditorProps {
  lineId: string;
  initialValue: string;
  mode: LyricEditMode;
  onModeChange: (mode: LyricEditMode) => void;
  onCommit: (lineId: string, newValue: string, mode: LyricEditMode) => void;
  onCancel: () => void;
  onEnter: (lineId: string) => void; // Insert new line after
}

export function LyricEditor({
  lineId,
  initialValue,
  mode,
  onModeChange,
  onCommit,
  onCancel,
  onEnter,
}: LyricEditorProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    // Place cursor at end
    const len = inputRef.current?.value.length || 0;
    inputRef.current?.setSelectionRange(len, len);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const handleCommit = useCallback(() => {
    onCommit(lineId, value, mode);
  }, [lineId, value, mode, onCommit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "Enter":
          e.preventDefault();
          handleCommit();
          onEnter(lineId);
          break;
        case "Escape":
          e.preventDefault();
          onCancel();
          break;
      }
    },
    [handleCommit, onCancel, onEnter, lineId],
  );

  const handleBlur = useCallback(() => {
    handleCommit();
  }, [handleCommit]);

  const toggleMode = useCallback(() => {
    onModeChange(mode === "attached" ? "detached" : "attached");
  }, [mode, onModeChange]);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="
          flex-1 px-0 py-0
          font-mono text-gray-800 dark:text-gray-200
          bg-transparent
          border-b-2 border-blue-500
          focus:outline-none
        "
        style={{ fontSize: "inherit", lineHeight: "inherit" }}
        aria-label="Edit lyrics"
      />
      <button
        type="button"
        onClick={toggleMode}
        onMouseDown={(e) => e.preventDefault()} // Prevent blur on input
        className={`p-1.5 rounded transition-colors ${
          mode === "attached"
            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        }`}
        title={
          mode === "attached"
            ? "Chords attached to words (click to detach)"
            : "Chords detached (click to attach to words)"
        }
      >
        {mode === "attached" ? (
          <Link2 className="w-4 h-4" />
        ) : (
          <Link2Off className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
