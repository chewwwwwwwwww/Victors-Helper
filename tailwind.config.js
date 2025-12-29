/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      colors: {
        chord: {
          light: "#2563eb", // blue-600
          dark: "#60a5fa", // blue-400
        },
      },
    },
  },
  plugins: [],
};
