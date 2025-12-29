import { useState, useCallback } from "react";
import { Plus, Minus, Repeat } from "lucide-react";
import type { BarNotation } from "../types";

interface BarNotationEditorProps {
  barNotation: BarNotation;
  onChange: (barNotation: BarNotation) => void;
  onRemove?: () => void;
  readOnly?: boolean;
}

export function BarNotationEditor({
  barNotation,
  onChange,
  onRemove,
  readOnly = false,
}: BarNotationEditorProps) {
  const [editingBarIndex, setEditingBarIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  // Add a new bar
  const handleAddBar = useCallback(() => {
    onChange({
      ...barNotation,
      bars: [...barNotation.bars, ""],
    });
  }, [barNotation, onChange]);

  // Remove last bar
  const handleRemoveBar = useCallback(() => {
    if (barNotation.bars.length > 1) {
      onChange({
        ...barNotation,
        bars: barNotation.bars.slice(0, -1),
      });
    }
  }, [barNotation, onChange]);

  // Toggle repeat start
  const handleToggleRepeatStart = useCallback(() => {
    onChange({
      ...barNotation,
      repeatStart: !barNotation.repeatStart,
    });
  }, [barNotation, onChange]);

  // Toggle repeat end
  const handleToggleRepeatEnd = useCallback(() => {
    onChange({
      ...barNotation,
      repeatEnd: !barNotation.repeatEnd,
    });
  }, [barNotation, onChange]);

  // Start editing a bar
  const handleBarClick = useCallback(
    (index: number) => {
      if (readOnly) return;
      setEditingBarIndex(index);
      setEditValue(barNotation.bars[index] || "");
    },
    [barNotation.bars, readOnly],
  );

  // Save edited bar
  const handleBarSave = useCallback(() => {
    if (editingBarIndex !== null) {
      const newBars = [...barNotation.bars];
      newBars[editingBarIndex] = editValue.trim();
      onChange({
        ...barNotation,
        bars: newBars,
      });
      setEditingBarIndex(null);
      setEditValue("");
    }
  }, [barNotation, editingBarIndex, editValue, onChange]);

  // Handle key events in bar input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleBarSave();
      } else if (e.key === "Escape") {
        setEditingBarIndex(null);
        setEditValue("");
      }
    },
    [handleBarSave],
  );

  return (
    <div className="bar-notation-editor flex items-center gap-1 py-1">
      {/* Repeat start button */}
      <button
        type="button"
        onClick={handleToggleRepeatStart}
        disabled={readOnly}
        className={`px-1 py-0.5 text-sm font-mono rounded transition-colors ${
          barNotation.repeatStart
            ? "bg-blue-100 text-blue-700 border border-blue-300"
            : "bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200"
        } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
        title={
          barNotation.repeatStart ? "Remove repeat start" : "Add repeat start"
        }
      >
        ||:
      </button>

      {/* Bars */}
      <div className="flex items-center">
        {barNotation.bars.map((chord, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <span className="text-gray-400 font-mono px-0.5">|</span>
            )}
            {editingBarIndex === index ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBarSave}
                onKeyDown={handleKeyDown}
                className="w-12 px-1 py-0.5 text-sm font-mono text-center border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ color: "#2563eb" }}
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => handleBarClick(index)}
                disabled={readOnly}
                className={`min-w-[2.5rem] px-1 py-0.5 text-sm font-mono text-center rounded transition-colors ${
                  chord
                    ? "text-blue-600 hover:bg-blue-50"
                    : "text-gray-300 hover:bg-gray-50"
                } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                style={{ color: chord ? "#2563eb" : undefined }}
              >
                {chord || "..."}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Repeat end button */}
      <button
        type="button"
        onClick={handleToggleRepeatEnd}
        disabled={readOnly}
        className={`px-1 py-0.5 text-sm font-mono rounded transition-colors ${
          barNotation.repeatEnd
            ? "bg-blue-100 text-blue-700 border border-blue-300"
            : "bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200"
        } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
        title={barNotation.repeatEnd ? "Remove repeat end" : "Add repeat end"}
      >
        :||
      </button>

      {/* Add/Remove bar buttons (only when not read-only) */}
      {!readOnly && (
        <div className="flex items-center gap-1 ml-2">
          <button
            type="button"
            onClick={handleAddBar}
            className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Add bar"
          >
            <Plus size={14} />
          </button>
          {barNotation.bars.length > 1 && (
            <button
              type="button"
              onClick={handleRemoveBar}
              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Remove last bar"
            >
              <Minus size={14} />
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors ml-1"
              title="Convert to regular line"
            >
              <Repeat size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Helper to create default bar notation
export function createDefaultBarNotation(bars: number = 4): BarNotation {
  return {
    bars: Array(bars).fill(""),
    repeatStart: true,
    repeatEnd: true,
  };
}

// Display-only version for PDF export
export function BarNotationDisplay({
  barNotation,
}: {
  barNotation: BarNotation;
}) {
  return (
    <div
      className="bar-notation-display font-mono text-sm"
      style={{ color: "#2563eb" }}
    >
      {barNotation.repeatStart && "||:"}
      {barNotation.bars.map((chord, index) => (
        <span key={index}>
          {chord || "..."}
          {index < barNotation.bars.length - 1 && " |"}
        </span>
      ))}
      {barNotation.repeatEnd && " :||"}
    </div>
  );
}
