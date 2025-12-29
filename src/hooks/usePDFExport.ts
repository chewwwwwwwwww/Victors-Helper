import { useState, useCallback } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import type { ExportOptions, AnySong } from "../types";
import {
  buildPDFContent,
  getPageDimensions,
  MM_TO_PIXELS,
} from "../lib/pdf-content-builder";

interface ExportState {
  isExporting: boolean;
  error: string | null;
}

export function usePDFExport() {
  const [state, setState] = useState<ExportState>({
    isExporting: false,
    error: null,
  });

  const exportToPDF = useCallback(
    async (
      _chartElement: HTMLElement | null,
      options: ExportOptions,
      title?: string,
      song?: AnySong,
      logoUrl?: string,
    ): Promise<void> => {
      if (!song) {
        setState({ isExporting: false, error: "No song data to export" });
        return;
      }

      setState({ isExporting: true, error: null });

      try {
        // Get full page dimensions
        const { width: pageWidthMm, height: pageHeightMm } =
          getPageDimensions(options);
        const pageWidthPx = pageWidthMm * MM_TO_PIXELS;
        const pageHeightPx = pageHeightMm * MM_TO_PIXELS;

        // Build content - this creates a full-page container with margin as padding
        const content = buildPDFContent(song, options, logoUrl);

        // Create offscreen container
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.left = "-9999px";
        container.style.top = "0";
        container.appendChild(content);

        document.body.appendChild(container);

        // Wait for images to load
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Capture at 2x for better quality
        const scale = 2;
        const canvas = await html2canvas(content, {
          scale: scale,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          width: pageWidthPx,
          height: pageHeightPx,
        });

        // Clean up
        document.body.removeChild(container);

        // Create PDF
        const pdf = new jsPDF({
          orientation: options.orientation,
          unit: "mm",
          format: options.paperSize,
        });

        // Add image covering the ENTIRE page (0,0 to full dimensions)
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, pageHeightMm);

        // Generate filename
        const safeTitle = (title || song?.title || "chord-chart")
          .replace(/[^a-zA-Z0-9-_ ]/g, "")
          .trim();
        const filename = `${safeTitle}.pdf`;

        pdf.save(filename);

        setState({ isExporting: false, error: null });
      } catch (error) {
        console.error("PDF export error:", error);
        const message =
          error instanceof Error ? error.message : "Export failed";
        setState({ isExporting: false, error: message });
        throw error;
      }
    },
    [],
  );

  // Export multiple songs to a single combined PDF
  const exportMultipleToPDF = useCallback(
    async (
      songs: AnySong[],
      options: ExportOptions,
      logoUrl?: string,
      filename?: string,
    ): Promise<void> => {
      if (!songs || songs.length === 0) {
        setState({ isExporting: false, error: "No songs to export" });
        return;
      }

      setState({ isExporting: true, error: null });

      try {
        const { width: pageWidthMm, height: pageHeightMm } =
          getPageDimensions(options);
        const pageWidthPx = pageWidthMm * MM_TO_PIXELS;
        const pageHeightPx = pageHeightMm * MM_TO_PIXELS;

        const pdf = new jsPDF({
          orientation: options.orientation,
          unit: "mm",
          format: options.paperSize,
        });

        for (let i = 0; i < songs.length; i++) {
          const song = songs[i];
          const content = buildPDFContent(song, options, logoUrl);

          // Create offscreen container
          const container = document.createElement("div");
          container.style.position = "absolute";
          container.style.left = "-9999px";
          container.style.top = "0";
          container.appendChild(content);
          document.body.appendChild(container);

          await new Promise((resolve) => setTimeout(resolve, 100));

          const canvas = await html2canvas(content, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            width: pageWidthPx,
            height: pageHeightPx,
          });

          document.body.removeChild(container);

          // Add new page for songs after the first
          if (i > 0) {
            pdf.addPage();
          }

          const imgData = canvas.toDataURL("image/png");
          pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, pageHeightMm);
        }

        const safeFilename = (filename || "songs")
          .replace(/[^a-zA-Z0-9-_ ]/g, "")
          .trim();
        pdf.save(`${safeFilename}.pdf`);

        setState({ isExporting: false, error: null });
      } catch (error) {
        console.error("Multi-PDF export error:", error);
        const message =
          error instanceof Error ? error.message : "Export failed";
        setState({ isExporting: false, error: message });
        throw error;
      }
    },
    [],
  );

  // Export multiple songs as separate PDFs in a zip file
  const exportSeparatePDFs = useCallback(
    async (
      songs: AnySong[],
      options: ExportOptions,
      logoUrl?: string,
      zipFilename?: string,
    ): Promise<void> => {
      if (!songs || songs.length === 0) {
        setState({ isExporting: false, error: "No songs to export" });
        return;
      }

      setState({ isExporting: true, error: null });

      try {
        const { width: pageWidthMm, height: pageHeightMm } =
          getPageDimensions(options);
        const pageWidthPx = pageWidthMm * MM_TO_PIXELS;
        const pageHeightPx = pageHeightMm * MM_TO_PIXELS;

        const zip = new JSZip();

        for (const song of songs) {
          const content = buildPDFContent(song, options, logoUrl);

          // Create offscreen container
          const container = document.createElement("div");
          container.style.position = "absolute";
          container.style.left = "-9999px";
          container.style.top = "0";
          container.appendChild(content);
          document.body.appendChild(container);

          await new Promise((resolve) => setTimeout(resolve, 100));

          const canvas = await html2canvas(content, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            width: pageWidthPx,
            height: pageHeightPx,
          });

          document.body.removeChild(container);

          const pdf = new jsPDF({
            orientation: options.orientation,
            unit: "mm",
            format: options.paperSize,
          });

          const imgData = canvas.toDataURL("image/png");
          pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, pageHeightMm);

          // Get PDF as blob and add to zip
          const pdfBlob = pdf.output("blob");
          const safeTitle = (song.title || "song")
            .replace(/[^a-zA-Z0-9-_ ]/g, "")
            .trim();
          zip.file(`${safeTitle}.pdf`, pdfBlob);
        }

        // Generate and download zip
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = url;
        const safeZipName = (zipFilename || "songs")
          .replace(/[^a-zA-Z0-9-_ ]/g, "")
          .trim();
        link.download = `${safeZipName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setState({ isExporting: false, error: null });
      } catch (error) {
        console.error("Separate PDFs export error:", error);
        const message =
          error instanceof Error ? error.message : "Export failed";
        setState({ isExporting: false, error: message });
        throw error;
      }
    },
    [],
  );

  return {
    ...state,
    exportToPDF,
    exportMultipleToPDF,
    exportSeparatePDFs,
  };
}
