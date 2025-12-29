import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { EditableSongMetadata } from "../types";

// Common musical keys
const MUSICAL_KEYS = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
  "Cm",
  "C#m",
  "Dm",
  "D#m",
  "Ebm",
  "Em",
  "Fm",
  "F#m",
  "Gm",
  "G#m",
  "Am",
  "A#m",
  "Bbm",
  "Bm",
];

// Common time signatures
const TIME_SIGNATURES = ["2/4", "3/4", "4/4", "5/4", "6/8", "7/8", "12/8"];

interface MetadataPanelProps {
  metadata: EditableSongMetadata;
  onChange: (updates: Partial<EditableSongMetadata>) => void;
  showFooterFields?: boolean;
}

export function MetadataPanel({
  metadata,
  onChange,
  showFooterFields = false,
}: MetadataPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle songwriters input (comma-separated string to array)
  const handleSongwritersChange = useCallback(
    (value: string) => {
      const songwriters = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      onChange({
        songwriters: songwriters.length > 0 ? songwriters : undefined,
      });
    },
    [onChange],
  );

  // Format songwriters array to string for display
  const songwritersDisplay = metadata.songwriters?.join(", ") || "";

  return (
    <div className="metadata-panel">
      {/* Always visible: Title and Key/Tempo/Time */}
      <div className="mb-2">
        {/* Title - large and bold */}
        <input
          type="text"
          value={metadata.title || ""}
          onChange={(e) => onChange({ title: e.target.value || undefined })}
          placeholder="Song Title"
          className="w-full text-2xl font-bold italic border-none bg-transparent focus:outline-none focus:ring-0 placeholder-gray-400"
          style={{ color: "#1f2937" }}
        />

        {/* Key | Tempo | Time on single line */}
        <div className="flex items-center gap-2 text-sm font-semibold mt-1">
          <span className="text-gray-700">Key -</span>
          <select
            value={metadata.key || ""}
            onChange={(e) => onChange({ key: e.target.value || undefined })}
            className="border-none bg-transparent focus:outline-none focus:ring-0 font-semibold"
            style={{ color: "#1f2937" }}
          >
            <option value="">-</option>
            {MUSICAL_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <span className="text-gray-400">|</span>

          <span className="text-gray-700">Tempo -</span>
          <input
            type="number"
            min={40}
            max={240}
            value={metadata.tempo || ""}
            onChange={(e) =>
              onChange({
                tempo: e.target.value
                  ? parseInt(e.target.value, 10)
                  : undefined,
              })
            }
            placeholder="-"
            className="w-16 border-none bg-transparent focus:outline-none focus:ring-0 font-semibold"
            style={{ color: "#1f2937" }}
          />

          <span className="text-gray-400">|</span>

          <span className="text-gray-700">Time -</span>
          <select
            value={metadata.timeSignature || ""}
            onChange={(e) =>
              onChange({ timeSignature: e.target.value || undefined })
            }
            className="border-none bg-transparent focus:outline-none focus:ring-0 font-semibold"
            style={{ color: "#1f2937" }}
          >
            <option value="">-</option>
            {TIME_SIGNATURES.map((ts) => (
              <option key={ts} value={ts}>
                {ts}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expand/Collapse button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2"
      >
        {isExpanded ? (
          <>
            <ChevronUp size={14} />
            Hide details
          </>
        ) : (
          <>
            <ChevronDown size={14} />
            Show details
          </>
        )}
      </button>

      {/* Expandable section */}
      {isExpanded && (
        <div className="space-y-2 text-sm border-t border-gray-200 pt-2">
          {/* Songwriters */}
          <div className="flex items-center gap-2">
            <label className="w-24 text-gray-600 shrink-0">Songwriters:</label>
            <input
              type="text"
              value={songwritersDisplay}
              onChange={(e) => handleSongwritersChange(e.target.value)}
              placeholder="Songwriter 1, Songwriter 2"
              className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Album */}
          <div className="flex items-center gap-2">
            <label className="w-24 text-gray-600 shrink-0">Album:</label>
            <input
              type="text"
              value={metadata.album || ""}
              onChange={(e) => onChange({ album: e.target.value || undefined })}
              placeholder="Album Name (Year)"
              className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Recorded By */}
          <div className="flex items-center gap-2">
            <label className="w-24 text-gray-600 shrink-0">Recorded by:</label>
            <input
              type="text"
              value={metadata.recordedBy || ""}
              onChange={(e) =>
                onChange({ recordedBy: e.target.value || undefined })
              }
              placeholder="Artist Name"
              className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Footer fields (CCLI, Publisher, Copyright) - optional */}
          {showFooterFields && (
            <>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <span className="text-xs text-gray-500 font-medium">
                  Footer Information
                </span>
              </div>

              {/* CCLI Song Number */}
              <div className="flex items-center gap-2">
                <label className="w-24 text-gray-600 shrink-0">CCLI #:</label>
                <input
                  type="text"
                  value={metadata.ccliSongNumber || ""}
                  onChange={(e) =>
                    onChange({ ccliSongNumber: e.target.value || undefined })
                  }
                  placeholder="1234567"
                  className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Publisher */}
              <div className="flex items-center gap-2">
                <label className="w-24 text-gray-600 shrink-0">
                  Publisher:
                </label>
                <input
                  type="text"
                  value={metadata.publisher || ""}
                  onChange={(e) =>
                    onChange({ publisher: e.target.value || undefined })
                  }
                  placeholder="Publisher Name"
                  className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Copyright */}
              <div className="flex items-center gap-2">
                <label className="w-24 text-gray-600 shrink-0">
                  Copyright:
                </label>
                <input
                  type="text"
                  value={metadata.copyright || ""}
                  onChange={(e) =>
                    onChange({ copyright: e.target.value || undefined })
                  }
                  placeholder="Copyright notice"
                  className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
