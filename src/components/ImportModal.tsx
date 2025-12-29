import { useState, useCallback, useRef } from "react";

interface ImportModalProps {
  onClose: () => void;
  onImport: (files: File[]) => void;
}

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ImportModal({ onClose, onImport }: ImportModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `${file.name}: Please upload a PNG, JPEG, WebP image or PDF file`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File is too large. Maximum size is 10MB`;
    }
    return null;
  };

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const errors: string[] = [];
      const validFiles: File[] = [];

      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(validationError);
        } else {
          validFiles.push(file);
        }
      }

      if (errors.length > 0) {
        setError(errors.join("\n"));
      }

      if (validFiles.length > 0) {
        setError(null);
        onImport(validFiles);
        onClose(); // Close modal immediately, progress shown in toast
      }
    },
    [onImport, onClose],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles],
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Import
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Drop Zone */}
          <div
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center
              transition-colors cursor-pointer
              ${
                dragOver
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={handleFileSelect}
              className="hidden"
              multiple
            />

            <div className="text-4xl mb-4">📷</div>

            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
              Drop images or PDFs here
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              or click to browse
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              PNG, JPEG, WebP, or PDF (max 10MB each)
            </p>
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">
              Supports multiple files for bulk import
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm whitespace-pre-line">
              {error}
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              How it works
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>1. Upload one or more chord chart images</li>
              <li>2. Imports run in the background</li>
              <li>3. Progress shown in bottom-right corner</li>
              <li>4. Review and edit when complete</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
