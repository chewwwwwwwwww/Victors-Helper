/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import type { Plugin } from "vite";

// Plugin to handle API routes in development
function apiDevPlugin(): Plugin {
  return {
    name: "api-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === "/api/import-chart" && req.method === "POST") {
          const env = loadEnv("development", process.cwd(), "");
          const GEMINI_API_KEY = env.GEMINI_API_KEY;

          if (!GEMINI_API_KEY) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: false,
                error: "GEMINI_API_KEY not configured",
              }),
            );
            return;
          }

          let body = "";
          req.on("data", (chunk) => {
            body += chunk.toString();
          });

          req.on("end", async () => {
            try {
              const { fileData, mimeType } = JSON.parse(body);

              const EXTRACTION_PROMPT = `You are analyzing an image or PDF of a chord chart (sheet music with chord symbols and lyrics).

Your task is to extract the content and convert it to bracket notation format.

Bracket notation rules:
- Place chord symbols in square brackets [ChordName] immediately before the syllable they appear above
- Keep all lyrics as plain text
- Preserve line breaks
- Use standard chord notation (e.g., Am, F#m7, Bb/D, Cmaj7, Dsus4)
- If there's a title, include it on the first line without brackets

Example output:
Amazing Grace
[G]Amazing [G7]grace how [C]sweet the [G]sound
That [G]saved a [Em]wretch like [D]me

Instructions:
1. Extract the song title if visible
2. For each line, identify chord symbols and their positions relative to lyrics
3. Convert to bracket notation where [Chord] appears right before the syllable it's positioned above
4. Maintain the exact lyrics and line structure
5. Use proper chord spelling (e.g., Bb not B♭, F# not F♯)

Return your response in this exact JSON format:
{
  "title": "Song Title Here",
  "bracketNotation": "The bracket notation content...",
  "confidence": 0.95
}

Only return the JSON object, no other text.`;

              const geminiResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${GEMINI_API_KEY}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [
                      {
                        parts: [
                          { text: EXTRACTION_PROMPT },
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
                    },
                  }),
                },
              );

              if (!geminiResponse.ok) {
                const errorText = await geminiResponse.text();
                console.error("Gemini API error:", errorText);
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: false,
                    error: `Gemini API error: ${geminiResponse.status}`,
                  }),
                );
                return;
              }

              const geminiResult = (await geminiResponse.json()) as {
                candidates?: Array<{
                  content?: { parts?: Array<{ text?: string }> };
                }>;
              };
              const textContent =
                geminiResult.candidates?.[0]?.content?.parts?.[0]?.text;

              if (!textContent) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: false,
                    error: "No content returned from Gemini",
                  }),
                );
                return;
              }

              // Parse JSON from Gemini response
              let parsedResult: {
                title?: string;
                bracketNotation?: string;
                confidence?: number;
              };
              try {
                let jsonText = textContent.trim();
                if (jsonText.startsWith("```json"))
                  jsonText = jsonText.slice(7);
                else if (jsonText.startsWith("```"))
                  jsonText = jsonText.slice(3);
                if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);
                parsedResult = JSON.parse(jsonText.trim());
              } catch {
                parsedResult = {
                  bracketNotation: textContent,
                  confidence: 0.5,
                };
              }

              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: true,
                  bracketNotation: parsedResult.bracketNotation,
                  title: parsedResult.title,
                  confidence: parsedResult.confidence || 0.8,
                }),
              );
            } catch (error) {
              console.error("Import error:", error);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: false,
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                }),
              );
            }
          });
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevPlugin()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
