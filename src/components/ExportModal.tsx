import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ExportOptions, Song } from "../types";
import type { PDFExportMode } from "../types/ui";
import {
  buildPDFContent,
  getPageDimensions,
  MM_TO_PIXELS,
} from "../lib/pdf-content-builder";

interface ExportModalProps {
  onClose: () => void;
  onExport: (options: ExportOptions, mode?: PDFExportMode) => Promise<void>;
  /** Single song for backward compatibility */
  song?: Song | null;
  /** Multiple songs for bulk export */
  songs?: Song[];
  isExporting: boolean;
  logoUrl?: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const DEFAULT_ZOOM = 0.75;
const ZOOM_STEP = 0.1;

export function ExportModal({
  onClose,
  song,
  songs: songsProp,
  onExport,
  isExporting,
  logoUrl,
}: ExportModalProps) {
  // Normalize songs: support both single song and multiple songs
  const allSongs = useMemo(() => {
    if (songsProp && songsProp.length > 0) {
      return songsProp;
    }
    if (song) {
      return [song];
    }
    return [];
  }, [song, songsProp]);

  const isMultiSong = allSongs.length > 1;

  const [options, setOptions] = useState<ExportOptions>({
    paperSize: "a4", // Fixed to A4
    orientation: "portrait",
    margin: 15,
    includeTitle: true,
    includeChords: true,
    includeMetadata: true,
    includeFooter: true,
    columnCount: 2,
  });

  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [exportMode, setExportMode] = useState<PDFExportMode>("combined");
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);

  // Calculate page dimensions for preview container sizing
  const pageDimensions = useMemo(() => {
    const { width, height } = getPageDimensions(options);
    return {
      widthPx: width * MM_TO_PIXELS,
      heightPx: height * MM_TO_PIXELS,
    };
  }, [options]);

  // Get current song for preview
  const currentPreviewSong = allSongs[currentPreviewIndex] || null;

  // Build preview content - now includes full page dimensions with margin as padding
  const previewContent = useMemo(() => {
    if (!currentPreviewSong) return null;
    return buildPDFContent(currentPreviewSong, options, logoUrl);
  }, [currentPreviewSong, options, logoUrl]);

  // Preview navigation handlers
  const handlePrevPreview = useCallback(() => {
    setCurrentPreviewIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNextPreview = useCallback(() => {
    setCurrentPreviewIndex((i) => Math.min(allSongs.length - 1, i + 1));
  }, [allSongs.length]);

  // Update preview content when it changes using safe DOM methods
  useEffect(() => {
    if (previewContainerRef.current && previewContent) {
      // Clear existing children safely
      while (previewContainerRef.current.firstChild) {
        previewContainerRef.current.removeChild(
          previewContainerRef.current.firstChild,
        );
      }
      // Append cloned content (the content already has full page dimensions)
      previewContainerRef.current.appendChild(previewContent.cloneNode(true));
    }
  }, [previewContent]);

  const handleExport = useCallback(async () => {
    await onExport(options, isMultiSong ? exportMode : undefined);
  }, [options, onExport, isMultiSong, exportMode]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, []);

  // Handle pinch-to-zoom and scroll wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Check for pinch gesture (ctrlKey) or trackpad pinch
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.01;
      setZoom((z) => Math.min(Math.max(z + delta, MIN_ZOOM), MAX_ZOOM));
    }
  }, []);

  // Prevent default browser zoom on the preview pane
  useEffect(() => {
    const pane = previewPaneRef.current;
    if (!pane) return;

    const preventDefaultZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    pane.addEventListener("wheel", preventDefaultZoom, { passive: false });
    return () => pane.removeEventListener("wheel", preventDefaultZoom);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-[95vw] max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Export to PDF
            </h2>
            {isMultiSong && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({allSongs.length} songs)
              </span>
            )}
          </div>

          {/* Preview navigation + Zoom controls */}
          <div className="flex items-center gap-4">
            {/* Preview navigation for multi-song */}
            {isMultiSong && (
              <div className="flex items-center gap-2 pr-4 border-r border-gray-200 dark:border-gray-700">
                <button
                  onClick={handlePrevPreview}
                  disabled={currentPreviewIndex === 0}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
                  title="Previous song"
                >
                  <ChevronLeft
                    size={18}
                    className="text-gray-600 dark:text-gray-400"
                  />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[80px] text-center">
                  {currentPreviewIndex + 1} / {allSongs.length}
                </span>
                <button
                  onClick={handleNextPreview}
                  disabled={currentPreviewIndex === allSongs.length - 1}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
                  title="Next song"
                >
                  <ChevronRight
                    size={18}
                    className="text-gray-600 dark:text-gray-400"
                  />
                </button>
              </div>
            )}

            {/* Zoom controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= MIN_ZOOM}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
                title="Zoom out"
              >
                <ZoomOut
                  size={18}
                  className="text-gray-600 dark:text-gray-400"
                />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400 w-14 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
                title="Zoom in"
              >
                <ZoomIn
                  size={18}
                  className="text-gray-600 dark:text-gray-400"
                />
              </button>
              <button
                onClick={handleZoomReset}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ml-1"
                title="Reset zoom"
              >
                <RotateCcw
                  size={16}
                  className="text-gray-600 dark:text-gray-400"
                />
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Preview pane */}
          <div
            ref={previewPaneRef}
            className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-8"
            onWheel={handleWheel}
          >
            <div className="flex flex-col items-center">
              {/* Current song title for multi-song preview */}
              {isMultiSong && currentPreviewSong && (
                <div className="mb-4 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {currentPreviewSong.title || "Untitled Song"}
                  </span>
                </div>
              )}

              {/* Paper representation - the content element already has full page dimensions */}
              <div
                className="shadow-lg origin-top"
                style={{
                  transform: `scale(${zoom})`,
                }}
              >
                <div
                  ref={previewContainerRef}
                  style={{
                    width: `${pageDimensions.widthPx}px`,
                    height: `${pageDimensions.heightPx}px`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Options sidebar */}
          <div className="w-64 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto shrink-0">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">
              Export Options
            </h3>

            {/* Export Mode (only for multi-song) */}
            {isMultiSong && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Export Mode
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExportMode("combined")}
                    className={`flex-1 py-1.5 px-2 rounded text-sm font-medium transition-colors ${
                      exportMode === "combined"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    Combined
                  </button>
                  <button
                    onClick={() => setExportMode("separate")}
                    className={`flex-1 py-1.5 px-2 rounded text-sm font-medium transition-colors ${
                      exportMode === "separate"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    Separate
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  {exportMode === "combined"
                    ? "All songs in one PDF file"
                    : "Each song as separate PDF (zip)"}
                </p>
              </div>
            )}

            {/* Orientation */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Orientation
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setOptions((o) => ({ ...o, orientation: "portrait" }))
                  }
                  className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${
                    options.orientation === "portrait"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  Portrait
                </button>
                <button
                  onClick={() =>
                    setOptions((o) => ({ ...o, orientation: "landscape" }))
                  }
                  className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${
                    options.orientation === "landscape"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  Landscape
                </button>
              </div>
            </div>

            {/* Columns */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Columns
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOptions((o) => ({ ...o, columnCount: 1 }))}
                  className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${
                    options.columnCount === 1
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  Single
                </button>
                <button
                  onClick={() => setOptions((o) => ({ ...o, columnCount: 2 }))}
                  className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${
                    options.columnCount === 2
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  Two
                </button>
              </div>
            </div>

            {/* Margin */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Margin: {options.margin}mm
              </label>
              <input
                type="range"
                min="5"
                max="30"
                value={options.margin}
                onChange={(e) =>
                  setOptions((o) => ({ ...o, margin: Number(e.target.value) }))
                }
                className="w-full"
              />
            </div>

            {/* Divider */}
            <hr className="border-gray-200 dark:border-gray-700 my-4" />

            {/* Content options */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeTitle}
                  onChange={(e) =>
                    setOptions((o) => ({
                      ...o,
                      includeTitle: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include title
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeMetadata}
                  onChange={(e) =>
                    setOptions((o) => ({
                      ...o,
                      includeMetadata: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include metadata
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeChords}
                  onChange={(e) =>
                    setOptions((o) => ({
                      ...o,
                      includeChords: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include chords
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeFooter}
                  onChange={(e) =>
                    setOptions((o) => ({
                      ...o,
                      includeFooter: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include footer (CCLI info)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="py-2 px-6 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="py-2 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Exporting...
              </>
            ) : (
              "Export PDF"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
