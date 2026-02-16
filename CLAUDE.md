# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pulsar Songbook is a Progressive Web App for managing and displaying song lyrics with ChordPro chord annotations. It features a dual-app architecture with a modern React version and a legacy vanilla JavaScript version for iOS 12 compatibility.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Database:** Dexie (IndexedDB) + Firebase Firestore (cloud sync)
- **Authentication:** Firebase Auth (Google provider)
- **ChordPro:** chordsheetjs parser with custom rendering
- **Editor:** CodeMirror 6 for ChordPro editing
- **PWA:** vite-plugin-pwa (Workbox)
- **Styling:** Tailwind CSS
- **Routing:** React Router v7

## Development Commands

```bash
# Start dev server (http://localhost:5175)
npm run dev

# Build for production (outputs to dist/)
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Clean build
npm run clean:build
```

## Architecture

### Dual Data Layer

The app uses a hybrid data storage approach:

1. **IndexedDB (Primary)** - Local storage via Dexie
   - Database: `PulsarSongbook` (Schema v2)
   - Tables: `songs`, `settings`, `syncQueue`, `setLists`, `setListSongs`
   - Schema: `src/db/schema.ts`
   - Used by both modern and legacy apps (shared database)
   - **v2 Migration**: Added Set Lists feature (Feb 2026)

2. **Firebase Firestore (Cloud Sync)** - Optional cloud backup
   - Collections: `songs`, `setLists`, `setListSongs`
   - Service: `src/services/firestore.ts`
   - Only available when authenticated
   - Enables cross-device sync

### Dual App Architecture

The project supports two versions that share the same IndexedDB database:

1. **Modern App** (React 19, ES2022)
   - Main entry: `src/main.tsx`
   - Minimum: Safari 13.1+, Chrome 80+, Firefox 72+
   - Features: Full editing, PWA installation, offline mode
   - iOS 12 detection redirects to legacy version

2. **Legacy App** (Vanilla JS, ES5)
   - Location: `public/legacy/` (copied to `dist/legacy/` during build)
   - Files: `index.html`, `app.js`, `styles.css`
   - Minimum: Safari 12+ (iOS 12.5.7+)
   - Features: Read-only viewing, search, auto-scroll, font controls
   - No editing, filters, or PWA features

**Important:** Both apps read from the same IndexedDB database (`PulsarSongbook`), so songs added/edited in the modern app automatically appear in the legacy version.

### Authentication & Protected Routes

- **Authentication:** Firebase Auth with Google sign-in (`src/contexts/AuthContext.tsx`)
- **Protected Routes:** Editing requires authentication (`src/components/ProtectedRoute.tsx`)
- **Viewing:** All users can view songs (no auth required)
- **Editing:** Only authenticated users can edit/create songs

### ChordPro Processing

ChordPro parsing and rendering is handled in `src/lib/chordpro/`:
- `chordUtils.ts` - Chord parsing and validation
- `renderUtils.ts` - Rendering ChordPro to HTML
- `styleUtils.ts` - Styling and formatting
- `constants.ts` - ChordPro constants

### Key Components

**Songs:**
- `SongList.tsx` - Main song library with search/filters, create new song button
- `SongDisplay.tsx` - Song viewer with auto-scroll, keyboard shortcuts, brand logos
- `SongEdit.tsx` - Song editor with CodeMirror (60/40 split) and live preview
- `SongMetadataEditor.tsx` - Form for editing song metadata
- `GlobalSearch.tsx` - Header search component (slash shortcut works on all pages)

**Set Lists (Playlists):**
- `SetListList.tsx` - Browse and manage set lists
- `SetListDisplay.tsx` - View set list with ordered songs
- `SetListEdit.tsx` - Create/edit set lists, add/remove/reorder songs

**Other:**
- `Login.tsx` - Firebase authentication UI
- `ThemeContext.tsx` - Dark mode theme management

### Custom Hooks

- `useAutoScroll.ts` - Auto-scroll with adjustable speed
- `useKeyboardShortcuts.ts` - Global keyboard shortcuts (Space, +/-, C, F, G, Y, S, /)
- `useFullscreen.ts` - Fullscreen mode management
- `useOnlineStatus.ts` - Network connectivity detection
- `useTheme.ts` - Access theme context (light/dark mode)

## Recent Features (February 2026)

### 1. Create New Song
- Route: `/song/new`
- "New Song" button in library (visible to authenticated users)
- Full create workflow with validation and Firestore sync

### 2. Keyboard Shortcuts Enhancement
- **/** (slash) - Focus search box on any page (including library)

### 3. UI Improvements
- Removed metadata badges from song display (cleaner interface)
- Editor width increased to 60/40 split (editor/preview) on desktop
- CodeMirror editor font size increased to 14px for better readability

### 4. Brand Logos
- Real Google, YouTube, Spotify logos (via `react-icons`)
- Proper brand colors: Google (#4285F4), YouTube (#FF0000), Spotify (#1DB954)
- Replaces previous emoji icons

### 5. Dark Mode (Full Implementation)
- Theme toggle button in header (🌙/☀️)
- Complete dark mode styling for all components
- CodeMirror switches between `githubLight` and `githubDark` themes
- Theme preference persists to IndexedDB
- Context: `src/contexts/ThemeContext.tsx`
- Enable with: `tailwind.config.js` has `darkMode: 'class'`

### 6. Set Lists (Playlists Feature)
- **Database**: Upgraded to v2 with `setLists` and `setListSongs` tables
- **Types**: `SetList`, `SetListSongMap`, `SetListWithSongs` in `src/types/song.ts`
- **Components**: `SetListList.tsx`, `SetListDisplay.tsx`, `SetListEdit.tsx`
- **Routes**:
  - `/setlists` - Browse all set lists
  - `/setlist/new` - Create new set list (protected)
  - `/setlist/:id` - View set list with songs
  - `/setlist/:id/edit` - Edit set list (protected)
- **Features**:
  - Create named playlists with descriptions
  - Add/remove songs from set lists
  - Reorder songs with ↑↓ buttons
  - Delete set lists (with confirmation)
  - Full Firestore sync support
  - Dark mode compatible

**Firestore Functions Added:**
- `getAllSetLists()`, `getSetList()`, `getSetListWithSongs()`
- `createSetList()`, `updateSetList()`, `deleteSetList()`
- `addSongToSetList()`, `removeSongFromSetList()`, `reorderSetListSongs()`

## Firebase Configuration

Firebase requires environment variables in `.env.local` (not committed):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Configuration is in `src/lib/firebase/config.ts`.

## PWA Configuration

PWA settings are in `vite.config.ts`:
- Service worker auto-updates
- Offline caching for all assets
- Google Fonts caching
- 3 MB maximum file size for caching (Firebase bundle is ~2.2 MB)

## Keyboard Shortcuts

### Global
- **/** (slash) - Focus search box (works on all pages including library)

### Song Display
- **Space** - Start/stop auto-scroll
- **[** / **]** - Decrease/increase scroll speed
- **+** / **-** - Increase/decrease font size
- **C** - Toggle chords visibility
- **F** - Toggle fullscreen
- **G** - Open Google search
- **Y** - Open YouTube search
- **S** - Open Spotify search
- **Escape** - Exit fullscreen or go back

## Development Notes

### Database Migration (v1 → v2)

**What Changed:**
- Schema version bumped from 1 to 2 in `src/db/schema.ts`
- Added two new tables: `setLists` and `setListSongs`
- Dexie handles automatic migration (no data loss)
- Existing tables (`songs`, `settings`, `syncQueue`) unchanged

**Migration is automatic** - just load the app and Dexie upgrades the schema. All existing data is preserved.

### iOS 12 Legacy Version

When editing the legacy version:
1. Files are in `public/legacy/` (not in `src/`)
2. No build step - vanilla ES5 JavaScript
3. Test at `http://localhost:5175/legacy/`
4. Must be compatible with Safari 12 (no modern JS features)
5. Reads from the same IndexedDB as modern app
6. **Note**: Legacy version does NOT support Set Lists (v2 tables)

### Working with Songs

Songs are stored with these key fields:
- `title` (required)
- `artist`
- `chordProContent` (ChordPro format)
- `language` (English, Spanish, Other)
- `difficulty` (Easy, Medium, Hard, Expert)
- `myLevel` (Learning, Play Okay, Play Well)
- `priority` (High, Medium, Low)
- `learningResource` (HTML content)
- `editingNotes` (plain text)

### ChordPro Format

Songs use ChordPro format:
```
{title: Song Title}
{artist: Artist Name}

[C]Lyrics with [G]chords [Am]above [F]them
```

Supported directives: `{title:}`, `{artist:}`, `{comment:}`

## Deployment

See `DEPLOYMENT.md` for full deployment instructions to Bluehost.

**Key points:**
- Build: `npm run build` (outputs to `dist/`)
- Upload entire `dist/` folder contents to `public_html/`
- Requires `.htaccess` for React Router (see DEPLOYMENT.md)
- Requires HTTPS for PWA functionality
- Legacy version automatically included in build (`dist/legacy/`)

## Testing

### Modern App Testing
1. Test in Chrome/Safari 13.1+
2. Test PWA installation
3. Test offline mode (disconnect network)
4. Test editing (requires auth)
5. Test keyboard shortcuts

### Legacy App Testing
1. Visit `http://localhost:5175/legacy/` directly
2. Or use iOS 12 device/simulator (auto-redirects)
3. Test song viewing, search, auto-scroll
4. Verify it reads from same IndexedDB as modern app

## Common Tasks

### Adding a new song field
1. Update `src/types/song.ts` (Song interface)
2. Update `src/db/schema.ts` (IndexedDB schema)
3. Update `src/services/firestore.ts` (if syncing to Firestore)
4. Update `src/components/SongMetadataEditor.tsx` (editing UI)

### Modifying ChordPro rendering
1. Edit `src/lib/chordpro/renderUtils.ts` for rendering logic
2. Edit `src/lib/chordpro/chordUtils.ts` for chord parsing
3. Test with various ChordPro formats

### Adding keyboard shortcuts
1. Update `src/hooks/useKeyboardShortcuts.ts`
2. Update README.md keyboard shortcuts section

### Working with Set Lists
1. **Database**: Use `db.setLists` and `db.setListSongs` from `src/db/schema.ts`
2. **Firestore**: Functions in `src/services/firestore.ts` (see "Recent Features" section)
3. **Types**: Import from `src/types/song.ts` - `SetList`, `SetListWithSongs`
4. **Junction Table**: `setListSongs` maps songs to set lists with position ordering

## Code Patterns

### Fetching songs from IndexedDB
```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';

const songs = useLiveQuery(() => db.songs.toArray());
```

### Using Firebase Firestore
```typescript
import { getAllSongs, updateSong } from '../services/firestore';

// Only works when user is authenticated
const songs = await getAllSongs();
await updateSong(songId, updates);
```

### Protected editing
Wrap edit routes with `<ProtectedRoute>` to require authentication.

### Using Dark Mode
```typescript
import { useTheme } from '../contexts/ThemeContext';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="bg-white dark:bg-gray-800">
      <button onClick={toggleTheme}>
        {theme === 'light' ? 'Dark' : 'Light'} Mode
      </button>
    </div>
  );
}
```

### Working with Set Lists
```typescript
import { getAllSetLists, getSetListWithSongs, addSongToSetList } from '../services/firestore';

// Get all set lists
const setLists = await getAllSetLists();

// Get set list with songs populated
const setListWithSongs = await getSetListWithSongs(setListId);

// Add song to set list (appends to end)
await addSongToSetList(setListId, songId);
```
