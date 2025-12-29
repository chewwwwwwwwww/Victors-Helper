import { useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Song } from "../types";
import type { ImportJob } from "../components/ImportToast";
import { parseFromBracketNotation } from "../lib/chart-parser";

interface ImportResult {
  job: ImportJob;
  song: Song | null;
}

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

interface APIResponse {
  success: boolean;
  bracketNotation?: string;
  title?: string;
  metadata?: ImportMetadata;
  sections?: ImportSection[];
  confidence?: number;
  error?: string;
}

export function useImportQueue() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [completedSongs, setCompletedSongs] = useState<Song[]>([]);
  const processingRef = useRef<Set<string>>(new Set());

  // Add files to the queue
  const addFiles = useCallback((files: File[]): ImportJob[] => {
    const newJobs: ImportJob[] = files.map((file) => ({
      id: uuidv4(),
      filename: file.name,
      status: "pending" as const,
    }));

    setJobs((prev) => [...prev, ...newJobs]);
    return newJobs;
  }, []);

  // Process a single file
  const processFile = useCallback(
    async (file: File, jobId: string): Promise<Song | null> => {
      // Prevent duplicate processing
      if (processingRef.current.has(jobId)) return null;
      processingRef.current.add(jobId);

      try {
        // Update status to processing
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, status: "processing" as const } : j,
          ),
        );

        // Convert file to base64
        const fileData = await fileToBase64(file);

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
          throw new Error(
            errorData.error || `Import failed: ${response.status}`,
          );
        }

        const result: APIResponse = await response.json();

        if (!result.success || !result.bracketNotation) {
          throw new Error(result.error || "No content extracted from image");
        }

        // Parse the bracket notation into a Song
        const song = parseFromBracketNotation(result.bracketNotation, {
          title: result.title,
          sections: result.sections,
        });

        // Apply metadata
        if (result.metadata) {
          const meta = result.metadata;
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
        }

        // Update status to complete
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, status: "complete" as const } : j,
          ),
        );

        return song;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? { ...j, status: "error" as const, error: message }
              : j,
          ),
        );
        return null;
      } finally {
        processingRef.current.delete(jobId);
      }
    },
    [],
  );

  // Start importing files
  const startImport = useCallback(
    async (
      files: File[],
      onSongImported?: (song: Song) => void,
    ): Promise<ImportResult[]> => {
      const newJobs = addFiles(files);
      const results: ImportResult[] = [];

      // Process files concurrently (but limit to 3 at a time to avoid overwhelming the API)
      const chunks = chunkArray(
        files.map((file, i) => ({ file, job: newJobs[i] })),
        3,
      );

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(async ({ file, job }) => {
            const song = await processFile(file, job.id);
            if (song) {
              setCompletedSongs((prev) => [...prev, song]);
              onSongImported?.(song);
            }
            return {
              job: jobs.find((j) => j.id === job.id) || job,
              song,
            };
          }),
        );
        results.push(...chunkResults);
      }

      return results;
    },
    [addFiles, processFile, jobs],
  );

  // Dismiss a job from the list
  const dismissJob = useCallback((jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }, []);

  // Clear all completed jobs
  const clearCompleted = useCallback(() => {
    setJobs((prev) =>
      prev.filter((j) => j.status !== "complete" && j.status !== "error"),
    );
  }, []);

  // Get the latest completed song
  const popCompletedSong = useCallback((): Song | null => {
    if (completedSongs.length === 0) return null;
    const song = completedSongs[0];
    setCompletedSongs((prev) => prev.slice(1));
    return song;
  }, [completedSongs]);

  return {
    jobs,
    completedSongs,
    startImport,
    dismissJob,
    clearCompleted,
    popCompletedSong,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
