import { useCallback } from "react";
import { formatTransposeOffset } from "../lib/transposition";

interface TransposeControlsProps {
  offset: number;
  onTranspose: (semitones: number) => void;
  onReset: () => void;
}

export function TransposeControls({
  offset,
  onTranspose,
  onReset,
}: TransposeControlsProps) {
  const handleDown = useCallback(() => {
    onTranspose(-1);
  }, [onTranspose]);

  const handleUp = useCallback(() => {
    onTranspose(1);
  }, [onTranspose]);

  return (
    <div className="flex items-center gap-2">
      {offset !== 0 && (
        <button
          onClick={onReset}
          className="
            px-2 py-1 text-xs
            rounded
            bg-gray-100 dark:bg-gray-700
            hover:bg-gray-200 dark:hover:bg-gray-600
            text-gray-600 dark:text-gray-400
            transition-colors
          "
          aria-label="Reset transposition"
        >
          Reset
        </button>
      )}

      <span className="text-sm text-gray-600 dark:text-gray-400">
        Transpose:
      </span>

      <button
        onClick={handleDown}
        className="
          w-8 h-8 flex items-center justify-center
          rounded-full
          bg-gray-100 dark:bg-gray-700
          hover:bg-gray-200 dark:hover:bg-gray-600
          text-gray-700 dark:text-gray-300
          font-bold text-lg
          transition-colors
        "
        aria-label="Transpose down one semitone"
      >
        -
      </button>

      <span
        className={`
          min-w-[3ch] text-center font-mono font-semibold
          ${offset === 0 ? "text-gray-500" : "text-blue-600 dark:text-blue-400"}
        `}
      >
        {formatTransposeOffset(offset)}
      </span>

      <button
        onClick={handleUp}
        className="
          w-8 h-8 flex items-center justify-center
          rounded-full
          bg-gray-100 dark:bg-gray-700
          hover:bg-gray-200 dark:hover:bg-gray-600
          text-gray-700 dark:text-gray-300
          font-bold text-lg
          transition-colors
        "
        aria-label="Transpose up one semitone"
      >
        +
      </button>
    </div>
  );
}
