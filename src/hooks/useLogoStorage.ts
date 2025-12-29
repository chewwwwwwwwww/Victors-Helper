import { useState, useEffect, useCallback } from "react";

const LOGO_STORAGE_KEY = "victors-helper-logo";
const MAX_FILE_SIZE = 500 * 1024; // 500KB
const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
];

interface UseLogoStorageReturn {
  /** Base64 encoded logo data URL, or null if no custom logo */
  logo: string | null;
  /** Upload a new logo from a File */
  setLogo: (file: File) => Promise<void>;
  /** Clear the custom logo */
  clearLogo: () => void;
  /** Whether a logo upload is in progress */
  isUploading: boolean;
  /** Error message from last operation */
  error: string | null;
}

export function useLogoStorage(): UseLogoStorageReturn {
  const [logo, setLogoState] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load logo from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOGO_STORAGE_KEY);
      if (stored) {
        setLogoState(stored);
      }
    } catch (e) {
      console.error("Failed to load logo from storage:", e);
    }
  }, []);

  // Set a new logo
  const setLogo = useCallback(async (file: File): Promise<void> => {
    setError(null);
    setIsUploading(true);

    try {
      // Validate file type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        throw new Error(
          `Invalid file type. Accepted types: PNG, JPEG, SVG, WebP`,
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(
          `File too large. Maximum size: ${MAX_FILE_SIZE / 1024}KB`,
        );
      }

      // Read file as data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to read file"));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      // Save to localStorage
      localStorage.setItem(LOGO_STORAGE_KEY, dataUrl);
      setLogoState(dataUrl);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to upload logo";
      setError(message);
      throw e;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Clear the logo
  const clearLogo = useCallback(() => {
    setError(null);
    try {
      localStorage.removeItem(LOGO_STORAGE_KEY);
      setLogoState(null);
    } catch (e) {
      console.error("Failed to clear logo from storage:", e);
      setError("Failed to clear logo");
    }
  }, []);

  return {
    logo,
    setLogo,
    clearLogo,
    isUploading,
    error,
  };
}
