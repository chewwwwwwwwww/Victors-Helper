import { useState, useEffect, useCallback } from "react";
import { X, Check, Loader2, AlertCircle } from "lucide-react";

export interface ImportJob {
  id: string;
  filename: string;
  status: "pending" | "processing" | "complete" | "error";
  error?: string;
}

const PROCESSING_MESSAGES = [
  "Analyzing image...",
  "Detecting chords...",
  "Extracting lyrics...",
  "Parsing structure...",
  "Identifying sections...",
  "Processing metadata...",
  "Almost there...",
];

interface ImportToastProps {
  job: ImportJob;
  onDismiss: (id: string) => void;
  onComplete?: (id: string) => void;
}

export function ImportToast({ job, onDismiss, onComplete }: ImportToastProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Cycle through processing messages
  useEffect(() => {
    if (job.status === "processing") {
      const interval = setInterval(() => {
        setMessageIndex((i) => (i + 1) % PROCESSING_MESSAGES.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [job.status]);

  // Auto-dismiss after completion
  useEffect(() => {
    if (job.status === "complete") {
      onComplete?.(job.id);
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(job.id), 300);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [job.status, job.id, onDismiss, onComplete]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(job.id), 300);
  }, [job.id, onDismiss]);

  // Truncate long filenames
  const displayName =
    job.filename.length > 30
      ? job.filename.substring(0, 27) + "..."
      : job.filename;

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg shadow-lg border
        min-w-[320px] max-w-[400px]
        transition-all duration-300 ease-out
        ${isExiting ? "opacity-0 translate-x-full" : "opacity-100 translate-x-0"}
        ${
          job.status === "complete"
            ? "bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800"
            : job.status === "error"
              ? "bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800"
              : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
        }
      `}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {job.status === "complete" ? (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        ) : job.status === "error" ? (
          <AlertCircle className="w-5 h-5 text-red-500" />
        ) : (
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            job.status === "complete"
              ? "text-green-800 dark:text-green-200"
              : job.status === "error"
                ? "text-red-800 dark:text-red-200"
                : "text-gray-900 dark:text-white"
          }`}
        >
          {displayName}
        </p>
        <p
          className={`text-xs mt-0.5 ${
            job.status === "complete"
              ? "text-green-600 dark:text-green-400"
              : job.status === "error"
                ? "text-red-600 dark:text-red-400"
                : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {job.status === "complete"
            ? "Import complete!"
            : job.status === "error"
              ? job.error || "Import failed"
              : job.status === "pending"
                ? "Waiting..."
                : PROCESSING_MESSAGES[messageIndex]}
        </p>
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className={`
          flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10
          transition-colors
          ${
            job.status === "complete"
              ? "text-green-600 dark:text-green-400"
              : job.status === "error"
                ? "text-red-600 dark:text-red-400"
                : "text-gray-400 dark:text-gray-500"
          }
        `}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  jobs: ImportJob[];
  onDismiss: (id: string) => void;
  onComplete?: (id: string) => void;
}

export function ToastContainer({
  jobs,
  onDismiss,
  onComplete,
}: ToastContainerProps) {
  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {jobs.map((job) => (
        <ImportToast
          key={job.id}
          job={job}
          onDismiss={onDismiss}
          onComplete={onComplete}
        />
      ))}
    </div>
  );
}
