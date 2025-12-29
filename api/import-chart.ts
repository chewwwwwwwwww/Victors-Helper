import type { VercelRequest, VercelResponse } from "@vercel/node";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Use Gemini 1.5 Pro for multimodal (image/PDF) support
const GEMINI_MODEL = "gemini-1.5-pro";

interface ImportRequest {
  fileData: string; // base64 encoded
  mimeType: string;
  filename: string;
}

interface ImportResponse {
  success: boolean;
  bracketNotation?: string;
  title?: string;
  metadata?: {
    songwriters?: string[];
    album?: string;
    recordedBy?: string;
    key?: string;
    tempo?: number;
    timeSignature?: string;
    ccliSongNumber?: string;
    publisher?: string;
    copyright?: string;
  };
  sections?: {
    header: string;
    isBarNotation: boolean;
    content: string;
  }[];
  confidence?: number;
  error?: string;
}

const EXTRACTION_PROMPT = `Analyze this chord chart image and extract ALL information into a structured JSON response.

CRITICAL REQUIREMENTS:
1. You MUST return a complete JSON object with ALL fields
2. You MUST extract metadata from the header area (top) and footer area (bottom) of the document
3. DO NOT include the song title in the bracketNotation - only in the "title" field

## METADATA EXTRACTION (REQUIRED):

Look at the TOP of the document for:
- Title: Large/bold text at the top (e.g., "My Number One")
- Songwriters: Names after "Writers:", "By:", or separated by "|" (e.g., "Beci Wakerley | David Wakerley")
- Album: Album name with year (e.g., "Tell The World (2007)")
- Recorded By: After "Recorded by:" or "Artist:" (e.g., "Hillsong Kids")
- Key: After "Key -" or "Key:" (e.g., "C", "G", "Am")
- Tempo: Number after "Tempo -" or "BPM:" (e.g., 182)
- Time Signature: After "Time -" (e.g., "4/4", "3/4", "6/8")

Look at the BOTTOM of the document for:
- CCLI Song Number: 6-7 digit number after "CCLI Song #" or "CCLI Song Number:"
- Publisher: Company name (e.g., "Hillsong Music Publishing", "Capitol CMG")
- Copyright: Year and holder (e.g., "© 2007 Hillsong Music")

## SECTION HEADERS:
INTRO, VERSE 1-4, CHORUS 1-2, PRE-CHORUS, BRIDGE 1-2, TURNAROUND, INTERLUDE, TAG, OUTRO, INSTRUMENTAL, ENDING

## BAR NOTATION:
Instrumental sections often have bar notation. Extract chords from bars:
- Input: ||:C |C |C |C :||
- Output: { "header": "INTRO", "isBarNotation": true, "content": "||:C |C |C |C :||" }

## BRACKET NOTATION FOR LYRICS:
Place chord in brackets before the syllable it appears above:
- [G]Amazing [G7]grace how [C]sweet the [G]sound

## REQUIRED JSON OUTPUT FORMAT:
{
  "title": "Song Title Here",
  "metadata": {
    "songwriters": ["Writer 1", "Writer 2"],
    "album": "Album Name (Year)",
    "recordedBy": "Artist Name",
    "key": "C",
    "tempo": 120,
    "timeSignature": "4/4",
    "ccliSongNumber": "1234567",
    "publisher": "Publisher Name",
    "copyright": "© Year Publisher"
  },
  "sections": [
    { "header": "INTRO", "isBarNotation": true, "content": "||:C |C |C |C :||" },
    { "header": "VERSE 1", "isBarNotation": false, "content": "[G]First line..." }
  ],
  "bracketNotation": "INTRO\\n||:C |C |C |C :||\\n\\nVERSE 1\\n[G]First line...",
  "confidence": 0.95
}

## RULES:
1. Use ASCII for accidentals: Bb not B♭, F# not F♯
2. The "metadata" object MUST be included - use null for missing values
3. The "sections" array MUST be included with isBarNotation correctly set
4. DO NOT put the title in bracketNotation - it goes ONLY in the "title" field
5. bracketNotation should start with the first section header (e.g., "INTRO"), not the title
6. Position chords precisely where they appear in the original

Return ONLY the JSON object, no markdown, no explanation.`;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Only allow POST
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  // Check API key
  if (!GEMINI_API_KEY) {
    res.status(500).json({
      success: false,
      error: "GEMINI_API_KEY not configured",
    });
    return;
  }

  try {
    const { fileData, mimeType, filename } = req.body as ImportRequest;

    if (!fileData || !mimeType) {
      res.status(400).json({
        success: false,
        error: "Missing fileData or mimeType",
      });
      return;
    }

    // Validate mime type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(mimeType)) {
      res.status(400).json({
        success: false,
        error: `Unsupported file type: ${mimeType}. Allowed: ${allowedTypes.join(", ")}`,
      });
      return;
    }

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: EXTRACTION_PROMPT,
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: fileData,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "The song title",
                },
                metadata: {
                  type: "object",
                  properties: {
                    songwriters: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of songwriter names",
                    },
                    album: {
                      type: "string",
                      description: "Album name with year",
                    },
                    recordedBy: {
                      type: "string",
                      description: "Artist who recorded the song",
                    },
                    key: {
                      type: "string",
                      description: "Musical key (e.g., C, G, Am)",
                    },
                    tempo: {
                      type: "number",
                      description: "BPM tempo",
                    },
                    timeSignature: {
                      type: "string",
                      description: "Time signature (e.g., 4/4)",
                    },
                    ccliSongNumber: {
                      type: "string",
                      description: "CCLI song number",
                    },
                    publisher: {
                      type: "string",
                      description: "Publisher name",
                    },
                    copyright: {
                      type: "string",
                      description: "Copyright information",
                    },
                  },
                },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      header: {
                        type: "string",
                        description: "Section name (e.g., VERSE 1, CHORUS)",
                      },
                      isBarNotation: {
                        type: "boolean",
                        description: "True if this section uses bar notation",
                      },
                      content: {
                        type: "string",
                        description: "Section content in bracket notation",
                      },
                    },
                    required: ["header", "isBarNotation", "content"],
                  },
                },
                bracketNotation: {
                  type: "string",
                  description: "Full song in bracket notation format",
                },
                confidence: {
                  type: "number",
                  description: "Confidence score 0-1",
                },
              },
              required: ["title", "metadata", "sections", "bracketNotation"],
            },
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      res.status(500).json({
        success: false,
        error: `Gemini API error: ${geminiResponse.status}`,
      });
      return;
    }

    const geminiResult = await geminiResponse.json();

    // Extract text from Gemini response
    const textContent = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text;

    // Log the raw response for debugging
    console.log("Gemini raw response:", JSON.stringify(geminiResult, null, 2));
    console.log("Extracted text content:", textContent?.substring(0, 500));

    if (!textContent) {
      console.error("No text content in Gemini response:", geminiResult);
      res.status(500).json({
        success: false,
        error: "No content returned from Gemini",
      });
      return;
    }

    // Parse the JSON response from Gemini
    let parsedResult: {
      title?: string;
      bracketNotation?: string;
      metadata?: {
        songwriters?: string[];
        album?: string;
        recordedBy?: string;
        key?: string;
        tempo?: number;
        timeSignature?: string;
        ccliSongNumber?: string;
        publisher?: string;
        copyright?: string;
      };
      sections?: {
        header: string;
        isBarNotation: boolean;
        content: string;
      }[];
      confidence?: number;
    };

    try {
      // Handle potential markdown code blocks
      let jsonText = textContent.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.slice(7);
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      console.log("Attempting to parse JSON:", jsonText.substring(0, 500));
      const rawParsed = JSON.parse(jsonText);
      console.log("Raw parsed keys:", Object.keys(rawParsed));

      // Normalize the response structure - Gemini might return slightly different formats
      parsedResult = {
        title: rawParsed.title,
        bracketNotation: rawParsed.bracketNotation,
        sections: rawParsed.sections,
        confidence: rawParsed.confidence,
        metadata: undefined,
      };

      // Extract metadata - handle both direct metadata object and top-level fields
      const meta = rawParsed.metadata || {};

      // Some fields might be at the top level instead of in metadata
      const extractedMetadata = {
        songwriters:
          meta.songwriters ||
          rawParsed.songwriters ||
          (rawParsed.writers ? [rawParsed.writers].flat() : undefined),
        album: meta.album || rawParsed.album,
        recordedBy: meta.recordedBy || rawParsed.recordedBy || rawParsed.artist,
        key: meta.key || rawParsed.key,
        tempo: meta.tempo || rawParsed.tempo || rawParsed.bpm,
        timeSignature:
          meta.timeSignature || rawParsed.timeSignature || rawParsed.time,
        ccliSongNumber:
          meta.ccliSongNumber ||
          rawParsed.ccliSongNumber ||
          rawParsed.ccli ||
          (rawParsed.ccliNumber ? String(rawParsed.ccliNumber) : undefined),
        publisher: meta.publisher || rawParsed.publisher,
        copyright: meta.copyright || rawParsed.copyright,
      };

      // Check if we have any actual metadata values
      const hasAnyMetadata = Object.values(extractedMetadata).some(
        (v) => v !== undefined && v !== null && v !== "",
      );

      if (hasAnyMetadata) {
        parsedResult.metadata = extractedMetadata;
        console.log("Extracted metadata:", extractedMetadata);
      } else {
        console.log("No metadata values found in response");
      }

      console.log(
        "Successfully parsed JSON. Has metadata:",
        !!parsedResult.metadata,
      );
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", textContent);
      console.error("Parse error:", parseError);
      // Try to extract bracket notation directly if JSON parsing fails
      parsedResult = {
        bracketNotation: textContent,
        confidence: 0.5,
      };
    }

    // Build bracket notation from sections if not provided directly
    if (!parsedResult.bracketNotation && parsedResult.sections) {
      parsedResult.bracketNotation = parsedResult.sections
        .map((section) => {
          return `${section.header}\n${section.content}`;
        })
        .join("\n\n");
    }

    if (!parsedResult.bracketNotation) {
      res.status(500).json({
        success: false,
        error: "No chord chart content could be extracted",
      });
      return;
    }

    const response: ImportResponse = {
      success: true,
      bracketNotation: parsedResult.bracketNotation,
      title: parsedResult.title,
      metadata: parsedResult.metadata,
      sections: parsedResult.sections,
      confidence: parsedResult.confidence || 0.8,
    };

    console.log("Sending response:", {
      success: response.success,
      title: response.title,
      hasMetadata: !!response.metadata,
      metadataKeys: response.metadata ? Object.keys(response.metadata) : [],
      hasSections: !!response.sections,
      sectionsCount: response.sections?.length,
    });

    res.status(200).json(response);
  } catch (error) {
    console.error("Import error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
