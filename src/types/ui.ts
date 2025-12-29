import type { Song, ChordReference } from "./song";
import type { AccidentalPreference } from "./chord-theory";

/** Application UI modes */
export type UIMode = "view" | "edit" | "import" | "export";

/** Global UI state */
export interface UIState {
  mode: UIMode;
  selectedChords: ChordReference[];
  editingChord: ChordReference | null;
  editingLineId: string | null;
  isDirty: boolean;
  chordsVisible: boolean;
  isSidebarOpen: boolean;
}

/** AI import progress state */
export interface ImportProgress {
  stage: "idle" | "uploading" | "processing" | "parsing" | "complete" | "error";
  percent: number;
  message?: string;
  error?: string;
}

/** PDF export options */
export interface ExportOptions {
  paperSize: "letter" | "a4";
  orientation: "portrait" | "landscape";
  margin: number;
  includeTitle: boolean;
  includeChords: boolean;
  includeMetadata: boolean;
  includeFooter: boolean;
  columnCount: 1 | 2;
}

/** PDF export mode for multi-song exports */
export type PDFExportMode = "combined" | "separate";

/** User preferences stored in localStorage */
export interface UserPreferences {
  accidentalPreference: AccidentalPreference;
  fontSize: number;
  autoSave: boolean;
  sidebarOpen: boolean;
}

/** Snapshot of document state for undo/redo */
export interface DocumentSnapshot {
  song: Song;
  timestamp: number;
}

/** History state for undo/redo */
export interface HistoryState {
  past: DocumentSnapshot[];
  future: DocumentSnapshot[];
  maxSize: number;
}

/** Modal types */
export type ModalType = "import" | "export" | "confirm" | "settings" | null;

/** Confirmation dialog props */
export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "default" | "danger";
}
