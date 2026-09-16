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

### Data Layer

**Firestore is the only store for content.** Dexie/IndexedDB is now settings
only. Do not design against the old "IndexedDB primary, cloud optional" model,
which this file described until 2026-09-16.

1. **Firebase Firestore (primary, and the only source of songs)**
   - Collections: `songs`, `setLists`, `setListSongs`
   - Service: `src/services/firestore.ts`
   - Reads are **public** (`firestore.rules`: `allow read: if true`); writes
     require an approved user. So viewing needs no auth, and an anonymous
     client can read the library over the REST API with no key.
   - Offline is handled by the SDK's own persistent cache
     (`persistentLocalCache()` in `src/lib/firebase/config.ts`), which is a
     *separate* IndexedDB database from the Dexie one below. Every page load
     calls `getAllSongs()`, so one visit caches the whole library.

2. **IndexedDB via Dexie — settings only**
   - Database: `PulsarSongbook` (Schema v2)
   - Schema still declares `songs`, `syncQueue`, `setLists`, `setListSongs`,
     but **nothing writes to them**. Only `settings` is live, read via
     `getSettings`/`updateSettings` from `src/components/SongDisplay.tsx`,
     `src/components/SongEdit.tsx` and `src/contexts/ThemeContext.tsx`.
   - The unused tables are harmless but are not a data source. If you need
     song data, use `src/services/firestore.ts`.

### Dual App Architecture

Two independent apps. They share **no code** - only the Firestore data.

1. **Modern App** (React 19, ES2022)
   - Main entry: `src/main.tsx`
   - Minimum: Safari 13.1+, Chrome 80+, Firefox 72+
   - Features: Full editing, PWA installation, offline mode
   - The iOS 12 redirect is an **inline ES5 script in `index.html`**, not in
     `src/main.tsx`. It must stay inline, stay ES5, and stay ahead of the
     module script: the bundle is ES2022, so Safari 12 cannot parse it and
     anything placed there never runs. That was a real bug (issue #12) that
     left the iPad on a blank page. Guarded by `tests/legacy/redirect.test.ts`.

2. **Legacy App** (Vanilla JS, ES5)
   - Location: `public/legacy/` (copied to `dist/legacy/` during build)
   - Files: `index.html`, `firestore-rest.js`, `app.js`, `styles.css`, plus
     `selftest.html`/`selftest.js`
   - Minimum: Safari 12+ (iOS 12.5.7+)
   - Features: Read-only viewing, search, auto-scroll, font controls
   - No editing, filters, set lists, or PWA features
   - Reads songs from the **Firestore REST API** (`firestore-rest.js`), keyless
     and `GET`-only. Online-only: no local cache.
   - See `LEGACY_VERSION.md`. Editing rules in "iOS 12 Legacy Version" below.

**Important:** the legacy app does *not* read the Dexie database. It used to,
which meant it never worked on a real iPad - the modern app is what filled that
store, and it cannot run on iOS 12.

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

### Dexie schema (historical)

The Dexie database is at schema v2 and declares `songs`, `settings`,
`syncQueue`, `setLists`, `setListSongs`. **Only `settings` is live.** The rest
are leftovers from when IndexedDB was the primary store; content moved to
Firestore and nothing writes to them any more.

They are left in place because dropping a table in Dexie means another version
bump and migration for no benefit. Treat them as inert - see "Data Layer".

There used to be an IndexedDB-to-Firestore migration tool
(`src/services/migration.ts`, plus a button in Settings). It was a no-op long
before it was removed on 2026-09-16; the git history has it if ever needed.

### iOS 12 Legacy Version

When editing the legacy version:
1. Files are in `public/legacy/` (not in `src/`)
2. **No build step** - served verbatim, so the source IS the artifact
3. Test at `http://localhost:5175/legacy/`
4. **Run `npx vitest run tests/legacy` after every change.** Two failure modes
   are invisible on a dev machine and fatal on Safari 12: modern *syntax* is a
   parse error that blanks the page, and modern *library APIs*
   (`Array.includes`, `Object.assign`, `Promise`, `fetch`) parse fine and then
   throw. The suite gates both, the second by enumerating every API the code
   touches against a reviewed allowlist.
5. Reads songs from the **Firestore REST API** (`public/legacy/firestore-rest.js`),
   keyless and `GET`-only. Not from Dexie.
6. Online-only - there is no local cache and no service worker.
7. **Note**: Legacy version does NOT support Set Lists
8. `/legacy/selftest` is an on-device diagnostics page - open it on the iPad
   when something is wrong, since Safari 12 has no console.
9. Full detail in `LEGACY_VERSION.md`.

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

See `DEPLOYMENT.md` for the full guide. Hosting is **Cloudflare Workers static
assets**; Bluehost was retired 2026-09-14.

**Deploying = merging to `main`.** Cloudflare Workers Builds runs
`npm run build:cf` then `npx wrangler deploy`. There is no manual upload step and
no `deploy.sh` (deleted).

**Config lives in the repo:**
- `wrangler.jsonc` — Worker name `pulsarsongbook` (must match what CI derives
  from the repo name), assets from `./dist`, and
  `not_found_handling: "single-page-application"` for BrowserRouter deep links.
  Also `workers_dev: false` / `preview_urls: false`, and the custom domain pinned
  in `routes`.
- `public/_headers` — CORS and cache control. **Never give `/assets/*` a long
  `max-age` or `immutable`:** SPA fallback returns `index.html` with `200` for
  any unmatched path including `.js`, so a request for a deleted code-split chunk
  would cache HTML at a JS URL for a year.
- `.npmrc` — `legacy-peer-deps=true`; CI's `npm clean-install` fails without it.

**Build variables (dashboard, not in the repo):** the six `VITE_FIREBASE_*` vars
must be set on the Worker. Vite inlines them at build time and CI has no
`.env.local`, so a missing one produces a green build that loads to a blank page.
`scripts/check-build-env.mjs` (run by `build:cf`) fails the build instead.

**`build:cf` is the CI gate**, in this order:

```
check-build-env  ->  lint  ->  build  ->  test:run
```

A lint error or a failing test therefore blocks the deploy. Build runs before
the tests on purpose: one test asserts the iOS 12 redirect shim is still ES5 in
the *built* `dist/index.html`, which needs `dist/` to exist.

Lint is at zero errors. Five warnings remain on purpose (see
`eslint.config.js`) - do not add new ones.

**Key points:**
- Routing is owned by `wrangler.jsonc`: in CI, wrangler deploys with
  `override_scope`, so a custom domain added only in the dashboard can be
  silently dropped by a later deploy.
- Requires HTTPS for PWA functionality (zone setting: Always Use HTTPS).
- Legacy version automatically included in build (`dist/legacy/`).
- Verifying a deploy: a `200` is not enough — check `server: cloudflare`, a
  `cf-ray` ending `-SYD`, and `colo=SYD`.

## Testing

```bash
npm test              # vitest, watch mode
npm run test:run      # single pass
npx vitest run tests/legacy    # legacy app + iOS 12 redirect only
```

Tests live in `src/__tests__/` (modern app) and `tests/legacy/` (legacy app and
the `index.html` redirect shim). The legacy tests execute the shipped ES5
verbatim rather than importing it, so they cannot drift from what ships.

### Modern App Testing
1. Test in Chrome/Safari 13.1+
2. Test PWA installation
3. Test offline mode (disconnect network)
4. Test editing (requires auth)
5. Test keyboard shortcuts

### Legacy App Testing
1. Visit `http://localhost:5175/legacy/` directly
2. Or `/legacy/selftest` for on-device diagnostics
3. Test song viewing, search, auto-scroll
4. On a real iPad: check the search box keeps the keyboard up while typing
   (rebuilding the header destroys the focused input and dismisses it)

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
1. **Store**: Firestore collections `setLists` and `setListSongs`. The Dexie
   tables of the same name are dead - do not use them.
2. **Firestore**: Functions in `src/services/firestore.ts` (see "Recent Features" section)
3. **Types**: Import from `src/types/song.ts` - `SetList`, `SetListWithSongs`
4. **Junction Table**: `setListSongs` maps songs to set lists with position ordering

## Code Patterns

### Fetching songs

Songs come from Firestore, not Dexie. `db.songs` exists in the schema but
nothing writes to it.

```typescript
import { getAllSongs } from '../services/firestore';

const [songs, setSongs] = useState<Song[]>([]);
useEffect(() => {
  getAllSongs().then(setSongs).catch(console.error);
}, []);
```

Dexie is only for settings:

```typescript
import { getSettings, updateSettings } from '../db/schema';
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
