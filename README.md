# Victor's Helper

A modern chord chart editor for musicians. Create, edit, transpose, and export professional chord charts with an intuitive visual interface.

## Features

- **Visual Chord Editing**: Click to place chords, drag to reposition, double-click to edit
- **Smart Transposition**: Transpose songs up/down with intelligent enharmonic spelling
- **AI Import**: Upload images or PDFs of chord charts and extract them automatically using Gemini 3 Pro
- **PDF Export**: Generate print-ready PDFs with customizable paper size and margins
- **Offline Persistence**: All songs saved locally in your browser
- **Adaptive Theme**: Follows your system's light/dark preference
- **Touch-Friendly**: Works great on both desktop and mobile devices

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Vercel Serverless Functions
- Gemini 3 Pro (multimodal AI for image extraction)
- html2canvas + jsPDF (PDF generation)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/victors-helper.git
cd victors-helper

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Environment Variables

For AI Import functionality, you need a Gemini API key:

```bash
# Create a .env file in the project root
GEMINI_API_KEY=your-api-key-here
```

Get your API key from [Google AI Studio](https://aistudio.google.com/).

## Usage

### Creating a Song

1. Click "New Song" to create a blank chart
2. Click on a lyric line to place a chord at that position
3. Double-click a chord to edit it
4. Drag chords to reposition them

### Keyboard Shortcuts

- **Arrow Left/Right**: Nudge selected chord by 1 character
- **Shift + Arrow**: Nudge by 5 characters
- **Delete/Backspace**: Remove selected chord
- **Ctrl/Cmd + Z**: Undo
- **Ctrl/Cmd + Shift + Z** or **Ctrl/Cmd + Y**: Redo

### Transposition

Use the transpose controls in the toolbar to shift all chords up or down by semitones. The app preserves the accidental style (sharps vs flats) from your original chords.

### AI Import

1. Click "Import" in the toolbar
2. Upload an image (PNG, JPG, WebP) or PDF of a chord chart
3. The AI will extract chords and lyrics automatically
4. Review and edit as needed

### PDF Export

1. Click "Export" in the toolbar
2. Choose paper size (Letter or A4)
3. Select orientation and margins
4. Download your print-ready PDF

## Project Structure

```
Victor'sHelper/
├── api/
│   └── import-chart.ts       # Gemini AI serverless function
├── src/
│   ├── components/           # React components
│   ├── contexts/             # React context (SongContext)
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # Core logic (parsing, transposition, layout)
│   └── types/                # TypeScript type definitions
├── tests/                    # Unit tests
└── public/
    └── fonts/                # JetBrains Mono font
```

## Testing

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add `GEMINI_API_KEY` to environment variables
4. Deploy

The `vercel.json` configuration is included for serverless function setup.

### Manual Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Data Model

Songs are stored in the following structure:

```typescript
interface Song {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  lines: Line[];
  transpositionOffset: number;
}

interface Line {
  id: string;
  lyrics: string;
  chords: Chord[];
}

interface Chord {
  id: string;
  chord: string; // e.g., "Am7", "F#m/C#"
  charIndex: number; // Position in lyrics (0-based)
}
```

## Bracket Notation

Internally, the app uses bracket notation for parsing/serialization:

```
[G]Amazing [D]grace how [C]sweet the [G]sound
```

The bracket appears immediately before the syllable it's positioned above.

## License

MIT
