interface EmptyStateProps {
  onCreateNew: () => void;
  onLoadSample: () => void;
  onImport: () => void;
}

export function EmptyState({
  onCreateNew,
  onLoadSample,
  onImport,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="text-6xl mb-4">🎵</div>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
        Victor's Helper
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
        Create, edit, and transpose chord charts with ease. Chords appear above
        lyrics just like SongSelect or Ultimate Guitar.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onCreateNew}
          className="
            px-6 py-3 rounded-lg
            bg-blue-600 hover:bg-blue-700
            text-white font-medium
            transition-colors
          "
        >
          Create New Song
        </button>

        <button
          onClick={onLoadSample}
          className="
            px-6 py-3 rounded-lg
            bg-gray-100 dark:bg-gray-700
            hover:bg-gray-200 dark:hover:bg-gray-600
            text-gray-700 dark:text-gray-300 font-medium
            transition-colors
          "
        >
          Load Sample Song
        </button>

        <button
          onClick={onImport}
          className="
            px-6 py-3 rounded-lg
            bg-gray-100 dark:bg-gray-700
            hover:bg-gray-200 dark:hover:bg-gray-600
            text-gray-700 dark:text-gray-300 font-medium
            transition-colors
          "
        >
          AI Import
        </button>
      </div>

      <div className="mt-12 text-sm text-gray-500 dark:text-gray-500 max-w-lg">
        <h3 className="font-semibold mb-2">Quick Tips:</h3>
        <ul className="text-left space-y-1">
          <li>• Click on lyrics to add a chord at that position</li>
          <li>• Double-click a chord to edit it</li>
          <li>• Drag chords to reposition them</li>
          <li>• Use arrow keys to nudge selected chords (Shift for 5 chars)</li>
          <li>• Use +/- to transpose all chords</li>
        </ul>
      </div>
    </div>
  );
}
