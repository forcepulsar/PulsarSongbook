# Pulsar Songbook

A Progressive Web App (PWA) for managing and displaying song lyrics with chord annotations in ChordPro format.

## Features

### Song Management
- **Song Library**: Browse all songs with search and filtering
- **ChordPro Support**: Full support for ChordPro format with chord positioning
- **Edit Mode**: Edit songs with live preview using CodeMirror
- **Rich Metadata**: Track language, difficulty, learning status, priority, and notes
- **Import/Export**: Import from Salesforce format, export to JSON

### Display Features
- **Auto-scroll**: Automatic scrolling with adjustable speed
- **Font Controls**: Adjustable font size (10-30px)
- **Chord Toggle**: Show/hide chords
- **Fullscreen Mode**: Distraction-free viewing
- **Keyboard Shortcuts**: Quick access to all features

### PWA Features
- **Offline Support**: Works without internet connection
- **Installable**: Add to home screen on mobile/desktop
- **IndexedDB Storage**: Local data persistence
- **Service Worker**: Fast loading and caching

## Browser Compatibility

### Main App (Modern Version)

**Minimum Requirements:**
- **Safari 13.1+** (iOS 13.4+, macOS Catalina 10.15.4+)
- **Chrome 80+**
- **Firefox 72+**
- **Edge 80+**

**Required Features:**
- ES2022 JavaScript
- Optional chaining (`?.`)
- React 19
- Modern Web APIs (Service Workers, IndexedDB)

### Legacy Version (iOS 12 Support)

For older devices, a legacy version is available at `/legacy/`:

**Supported:**
- **Safari 12+** (iOS 12.5.7+)
- All ES5-compatible browsers (2009+)

**Features:**
- ✅ Song list with search
- ✅ Song display with ChordPro rendering
- ✅ Auto-scroll with speed controls
- ✅ Font size adjustment
- ✅ Keyboard shortcuts

**Not Available:**
- ❌ Editing
- ❌ Filters
- ❌ PWA installation
- ❌ Offline mode

**Auto-Redirect:** iOS 12 devices automatically redirect to the legacy version.

**Data Sharing:** Both main and legacy apps share the same IndexedDB database (`PulsarSongbook`), so songs added/edited in the main app automatically appear in the legacy version. No manual export or data sync required.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Database:** Dexie (IndexedDB wrapper)
- **ChordPro Parser:** chordsheetjs
- **Editor:** CodeMirror 6
- **WYSIWYG:** Quill
- **PWA:** vite-plugin-pwa (Workbox)
- **Styling:** Tailwind CSS
- **Routing:** React Router v7

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Install dependencies
npm install
```

### Development Server

```bash
# Start dev server (http://localhost:5173)
npm run dev
```

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing Legacy Version Locally

```bash
# Start dev server
npm run dev

# 1. First open http://localhost:5173/ (main app)
# 2. Import your songs using the import feature
# 3. Then visit http://localhost:5173/legacy/
# The legacy version reads from the same IndexedDB database
```

## Project Structure

```
pulsar-songbook/
├── src/
│   ├── components/         # React components
│   ├── db/                 # IndexedDB schema and helpers
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and libraries
│   │   └── chordpro/       # ChordPro parsing and rendering
│   ├── pages/              # Page components
│   ├── types/              # TypeScript types
│   ├── App.tsx             # Main app component
│   └── main.tsx            # App entry point (includes iOS 12 detection)
├── public/
│   ├── icons/              # PWA icons
│   └── legacy/             # Legacy version for iOS 12
│       ├── index.html      # HTML shell
│       ├── app.js          # Vanilla JavaScript (ES5, reads from IndexedDB)
│       └── styles.css      # Plain CSS
├── dist/                   # Production build output
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── DEPLOYMENT.md           # Deployment instructions
└── README.md               # This file
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to Bluehost.

### Quick Steps

1. **Build:**
   ```bash
   npm run build
   ```

2. **Upload:** Upload contents of `dist/` folder to `public_html/` on Bluehost

3. **Test:** Visit your domain and verify functionality

## Keyboard Shortcuts

### Song Display
- **Space** - Start/stop auto-scroll
- **[** - Decrease scroll speed
- **]** - Increase scroll speed
- **+** or **=** - Increase font size
- **-** - Decrease font size
- **C** - Toggle chords visibility
- **F** - Toggle fullscreen
- **G** - Open Google search for song
- **Y** - Open YouTube search for song
- **S** - Open Spotify search for song
- **Escape** - Exit fullscreen or go back

### Song List
- Type to search

## ChordPro Format

Songs use ChordPro format for chord annotations:

```chordpro
{title: Amazing Grace}
{artist: John Newton}

[G]Amazing [G7]grace how [C]sweet the [G]sound
That saved a wretch like [D]me
I [G]once was [G7]lost but [C]now I'm [G]found
Was [Em]blind but [D]now I [G]see
```

**Supported Directives:**
- `{title: ...}` - Song title
- `{artist: ...}` - Artist name
- `{comment: ...}` - Comments (shown in green)

**Chord Notation:**
- `[ChordName]` - Chord positioned above following lyrics
- Supports all standard chord notations: `C`, `Dm`, `G7`, `Amaj7`, `F#m`, etc.

## Data Format

Songs are stored in IndexedDB and can be exported in Salesforce format:

```json
{
  "records": [
    {
      "attributes": {
        "type": "song__c",
        "referenceId": "song__cRef1"
      },
      "Song__c": "Song Title",
      "Artist__c": "Artist Name",
      "Language__c": "English",
      "ChordPro_Content__c": "{title: Song}\n[C]Lyrics",
      "Difficulty__c": "Easy",
      "My_Level__c": "Play Well",
      "Priority__c": "High",
      "Learning_resource__c": "https://...",
      "Editing_Notes__c": "Notes..."
    }
  ]
}
```

## Legacy Version Development

The legacy version is a standalone vanilla JavaScript app for iOS 12 compatibility:

**Location:** `public/legacy/`

**Files:**
- `index.html` - HTML shell (no modern features)
- `app.js` - Vanilla JavaScript with ES5 syntax (uses IndexedDB)
- `styles.css` - Plain CSS (no preprocessors)

**Development:**
1. Edit files in `public/legacy/`
2. No build step required (vanilla JS)
3. Test at `http://localhost:5173/legacy/`

**Data Source:**
- Reads from the same IndexedDB database as main app (`PulsarSongbook`)
- No manual export/import needed
- Changes in main app immediately available to legacy version

## License

Private project - All rights reserved

## Support

For deployment or technical issues, see [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section.

---

**Last Updated:** 2026-01-19
