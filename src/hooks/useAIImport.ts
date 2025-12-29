import { useState, useCallback } from "react";
import type { Song, ImportProgress } from "../types";
import { parseFromBracketNotation } from "../lib/chart-parser";

interface ImportMetadata {
  songwriters?: string[];
  album?: string;
  recordedBy?: string;
  key?: string;
  tempo?: number;
  timeSignature?: string;
  ccliSongNumber?: string;
  publisher?: string;
  copyright?: string;
}

interface ImportSection {
  header: string;
  isBarNotation: boolean;
  content: string;
}

interface ImportResult {
  success: boolean;
  bracketNotation?: string;
  title?: string;
  metadata?: ImportMetadata;
  sections?: ImportSection[];
  confidence?: number;
  error?: string;
}

export function useAIImport() {
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const importFile = useCallback(async (file: File): Promise<Song | null> => {
    try {
      setProgress({ stage: "uploading", percent: 10 });

      // Convert file to base64
      const fileData = await fileToBase64(file);

      setProgress({
        stage: "processing",
        percent: 30,
        message: "Analyzing with AI...",
      });

      // Call the API
      const response = await fetch("/api/import-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData,
          mimeType: file.type,
          filename: file.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Import failed: ${response.status}`);
      }

      setProgress({
        stage: "parsing",
        percent: 70,
        message: "Parsing chord chart...",
      });

      const result: ImportResult = await response.json();

      // Debug: Log the full API response
      console.log("AI Import API Response:", {
        success: result.success,
        hasTitle: !!result.title,
        title: result.title,
        hasMetadata: !!result.metadata,
        metadata: result.metadata,
        hasSections: !!result.sections,
        sectionsCount: result.sections?.length,
        confidence: result.confidence,
        bracketNotationPreview: result.bracketNotation?.substring(0, 200),
      });

      if (!result.success || !result.bracketNotation) {
        throw new Error(result.error || "No content extracted from image");
      }

      // Parse the bracket notation into a Song
      const song = parseFromBracketNotation(result.bracketNotation, {
        title: result.title,
        // Pass through sections for bar notation handling
        sections: result.sections,
      });

      // Apply extracted metadata to the song
      if (result.metadata) {
        const meta = result.metadata;
        // Apply all metadata fields that are present
        if (meta.songwriters && meta.songwriters.length > 0) {
          song.songwriters = meta.songwriters;
        }
        if (meta.album) song.album = meta.album;
        if (meta.recordedBy) song.recordedBy = meta.recordedBy;
        if (meta.key) song.key = meta.key;
        if (meta.tempo) song.tempo = meta.tempo;
        if (meta.timeSignature) song.timeSignature = meta.timeSignature;
        if (meta.ccliSongNumber) song.ccliSongNumber = meta.ccliSongNumber;
        if (meta.publisher) song.publisher = meta.publisher;
        if (meta.copyright) song.copyright = meta.copyright;

        // Log for debugging
        console.log("Imported song with metadata:", {
          title: song.title,
          songwriters: song.songwriters,
          album: song.album,
          recordedBy: song.recordedBy,
          key: song.key,
          tempo: song.tempo,
          timeSignature: song.timeSignature,
          ccliSongNumber: song.ccliSongNumber,
          publisher: song.publisher,
          copyright: song.copyright,
        });
      } else {
        console.warn(
          "No metadata returned from AI import. Full response:",
          JSON.stringify(result, null, 2),
        );
      }

      setProgress({ stage: "complete", percent: 100 });

      return song;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setProgress({
        stage: "error",
        percent: 0,
        error: message,
      });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setProgress(null);
  }, []);

  return {
    progress,
    importFile,
    reset,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (data:image/png;base64,)
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
