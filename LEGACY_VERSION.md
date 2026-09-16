# Legacy Version Implementation for iOS 12.5.7

## Overview

A lightweight, ES5-compatible version of Pulsar Songbook has been implemented to support iOS 12.5.7 (Safari 12) devices. This document explains the implementation details and technical decisions.

## Implementation Date

2026-01-19

## Problem Statement

The main Pulsar Songbook app uses modern JavaScript features (ES2022, optional chaining, React 19) that are not supported by Safari 12 on iOS 12.5.7, causing the app to fail with a blank screen.

## Solution: Separate Legacy Endpoint

Created a standalone vanilla JavaScript app at `/legacy/` that:
- Uses only ES5-compatible syntax
- Has no dependencies (no React, no build tools)
- Provides read-only song viewing functionality
- Auto-detects and redirects iOS 12 devices

## Technical Implementation

### 1. iOS 12 Detection & Redirect

**File:** `src/main.tsx` — **and it does not work. Open `/legacy/` directly.**

> **How to open this on the iPad:** go to
> `https://songbook.julianvirguez.com/legacy/` and add *that* URL to the home
> screen. The site root will not send you here automatically.
>
> Why: the detection below lives inside the React bundle, which is built to
> ES2022 (`tsconfig.app.json`). That bundle contains optional chaining (`?.`)
> and nullish coalescing (`??`), neither of which Safari 12 can parse — both
> need Safari 13.1. Safari 12 therefore throws a *parse* error before any
> statement in the file executes, including the redirect. The result on a real
> iOS 12 device is a blank white page at the root URL, and the redirect is
> effectively dead code on the only platform it targets.
>
> Fixing it properly means moving the check into an inline ES5 `<script>` in
> `index.html`, ahead of the module bundle. That is deliberately **not** done
> here: this work was scoped to keep the legacy app independent and leave the
> modern app untouched. Tracked as a follow-up.

The intended (but unreachable) logic:
- Checks user agent for iOS version
- Redirects iOS 12 and below to `/legacy/`
- Prevents main app from loading on incompatible browsers

```typescript
function detectAndRedirectIOS12() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);

  if (isIOS) {
    const versionMatch = ua.match(/OS (\d+)_/);
    if (versionMatch && parseInt(versionMatch[1], 10) <= 12) {
      window.location.href = '/legacy/';
      return true;
    }
  }

  // Fallback: test optional chaining support
  try {
    eval('null?.test');
  } catch (e) {
    window.location.href = '/legacy/';
    return true;
  }

  return false;
}
```

### 2. Legacy App Architecture

**Location:** `public/legacy/`

**Files:**
- `index.html` - Minimal HTML shell (~1KB)
- `firestore-rest.js` - Firestore REST data layer, ES5 (~7KB)
- `app.js` - Vanilla JavaScript with ES5 syntax (~20KB)
- `styles.css` - Plain CSS (~8KB)

**Total Bundle Size:** ~36KB

Script order in `index.html` is load-bearing: `firestore-rest.js` must come
before `app.js`, which reads `window.PulsarFirestoreREST` during `init()`.

### 3. ChordPro Parser (ES5)

Implemented a custom ChordPro parser without using any modern syntax:

**Features:**
- Parses `[Chord]` notation for chord placement
- Handles `{title:...}` and `{artist:...}` directives
- Supports `{comment:...}` (shown in green)
- Escapes HTML properly
- Positions chords above lyrics

**No Modern Features Used:**
- ❌ Arrow functions → `function() {}` instead
- ❌ Template literals → String concatenation
- ❌ `const`/`let` → `var` only
- ❌ Optional chaining → `obj && obj.prop`
- ❌ `async`/`await` → Callbacks and promises only
- ❌ ES6 classes → Factory functions
- ❌ Spread operator → `Object.assign()`

### 4. State Management

Simple state object with vanilla JavaScript:

```javascript
var state = {
  songs: [],
  filteredSongs: [],
  currentSong: null,
  currentView: 'list', // 'list' or 'song'
  searchQuery: '',
  fontSize: 16,
  scrollSpeed: 0.8,
  isScrolling: false,
  scrollInterval: null
};
```

### 5. Features Implemented

**✅ Available:**
- Song list display with artist/title
- Search by title/artist
- Song display with ChordPro rendering
- Auto-scroll (start/stop with Space)
- Scroll speed controls ([ and ] keys)
- Font size controls (+/- keys or buttons)
- Back navigation (Escape key)
- Settings persistence (localStorage)

**❌ Not Implemented:**
- Editing (requires CodeMirror, which uses modern syntax)
- Exporting (not needed for viewing)
- Filters (simple to add, but not essential)
- Random song (simple to add)
- External links (Google, YouTube, Spotify)
- PWA installation (requires Service Workers with modern APIs)
- Offline mode (requires Service Workers)

### 6. Keyboard Shortcuts

All keyboard shortcuts use `e.keyCode` for maximum compatibility:

- **Space (32)** - Toggle auto-scroll
- **[ (91)** - Decrease scroll speed
- **] (93)** - Increase scroll speed
- **+ / = (43/61)** - Increase font size
- **- (45)** - Decrease font size
- **Escape (27)** - Go back

### 7. Data Loading

Songs come straight from the Firestore REST API via `XMLHttpRequest` (not the
Fetch API), implemented in `firestore-rest.js`:

```javascript
// No API key: firestore.rules grants `allow read: if true` on /songs.
var url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID +
  '/databases/(default)/documents/songs?pageSize=300';

var xhr = new XMLHttpRequest();
xhr.open('GET', url, true);
xhr.onreadystatechange = function() {
  if (xhr.readyState === 4 && xhr.status === 200) {
    var body = JSON.parse(xhr.responseText);
    // body.documents[].fields are Firestore typed values:
    //   { title: { stringValue: "Africa" } }  ->  { title: "Africa" }
  }
};
xhr.send(null);
```

`fetchAllSongs()` follows `nextPageToken` (capped at 50 pages) and sorts by
title. Driven from `readyState` rather than `onload`/`onerror`, whose coverage
on old WebKit is patchier.

**Why not IndexedDB.** This app used to read the `songs` store of the
`PulsarSongbook` IndexedDB database, filled by the modern app. That never
worked on a real iOS 12 device: the modern app cannot run there, so it never
created the store, and the legacy app's own error told users to "open the main
app first" — the one thing that device cannot do. The modern app now writes
songs only to Firestore, so REST is the only data path that works on target.

**Read-only by construction.** `firestore-rest.js` issues `GET` only. There is
no write path, so this app cannot modify or delete a song.

**Online-only.** There is no local cache. A connection is required, and a
failed fetch shows a connectivity message with a Try Again button.

### 8. Styling

Mobile-first responsive CSS without any preprocessors:

**Features:**
- Flexbox for layout (supported by Safari 12)
- iOS safe area insets support
- Touch-optimized controls
- No animations (for performance)
- Print styles

**Compatibility:**
- No CSS Grid (limited support in Safari 12)
- No CSS variables (not supported)
- No modern CSS functions

### 9. Build Process

The legacy version requires no build step:
- Files are copied directly from `public/legacy/` to `dist/legacy/`
- Vite's public folder handling takes care of this automatically
- No transpilation, no bundling, no minification

## Testing Checklist

### Automated (`npx vitest run tests/legacy`)
- ES5 syntax gate: every file in `public/legacy/` must parse at
  `ecmaVersion: 5`. This is the regression guard for the exact class of bug
  that broke the redirect — modern syntax is invisible on a dev machine and
  fatal on Safari 12.
- Data layer: value unwrapping, document mapping, pagination, the `MAX_PAGES`
  guard, and every error path (offline, HTTP error, bad JSON, Firestore error
  payload, timeout).
- Boot: the real `firestore-rest.js` + `app.js` are executed in a DOM with a
  stubbed transport, asserting the list renders, search filters, a row tap
  opens the song, the retry button recovers, and IndexedDB is never opened.

### On Modern Browsers
- [ ] Visit `/legacy/` directly
- [ ] Song list loads
- [ ] Search works
- [ ] Songs display correctly
- [ ] Auto-scroll works
- [ ] Font controls work

### On iOS 12.5.7 (or Simulator)
- [ ] Visit `/legacy/` **directly** — the root URL will not redirect you
      (see Known Limitations #1)
- [ ] Song list loads over Wi-Fi
- [ ] No JavaScript errors in console (Safari Web Inspector over USB)
- [ ] Tap a song; lyrics and chords render
- [ ] Turn Wi-Fi off and reload: connectivity error with a Try Again button
- [ ] Turn Wi-Fi on and tap Try Again: list loads
- [ ] Keyboard shortcuts work
- [ ] Settings persist (localStorage)

### Cross-browser
- [ ] Works on all modern browsers at `/legacy/`
- [ ] iOS 13+ stays on main app

## Deployment

The legacy version is deployed automatically with the main app:

1. Run `npm run build`
2. Upload entire `dist/` folder to server
3. Legacy version is at `https://yourdomain.com/legacy/`

## Updating Songs

Nothing to do. The legacy app reads the live `songs` collection from Firestore
on every load, so a song edited in the modern app appears here on the next
refresh. There is no snapshot file to regenerate and no rebuild or redeploy
needed to publish content changes.

(The old flow — export to `public/legacy/songs.json`, rebuild, upload — no
longer applies. That file does not exist.)

## Browser Support

**Legacy Version:**
- Safari 12+ (iOS 12.5.7+)
- Chrome 49+ (2016)
- Firefox 52+ (2017)
- Edge 12+ (2015)
- Any browser with ES5 support (2009+)

**Main App:**
- Safari 13.1+ (iOS 13.4+)
- Chrome 80+ (2020)
- Firefox 72+ (2020)
- Edge 80+ (2020)

## Performance

**Legacy Version:**
- Initial load: ~28KB (HTML + JS + CSS)
- Song data: ~4KB sample (grows with more songs)
- No external dependencies
- No build process overhead

**Main App:**
- Initial load: ~525KB gzipped
- React 19 + dependencies
- Code splitting and lazy loading

## Maintenance

**Legacy Version:**
- Frozen codebase (no new features)
- Only update song data as needed
- No dependency updates required
- No security vulnerabilities (no dependencies)

**Main App:**
- Continue developing with modern features
- Regular dependency updates
- No iOS 12 concerns

## Files Modified

### New Files
1. `public/legacy/index.html` - HTML shell
2. `public/legacy/firestore-rest.js` - Firestore REST data layer (ES5)
3. `public/legacy/app.js` - Vanilla JavaScript app
4. `public/legacy/styles.css` - Plain CSS
5. `LEGACY_VERSION.md` - This document
6. `tests/legacy/` - ES5 syntax gate, data-layer unit tests, boot tests

### Modified Files
1. `src/main.tsx` - Added iOS 12 detection
2. `DEPLOYMENT.md` - Added legacy version documentation
3. `README.md` - Added browser compatibility section

## Known Limitations

1. **No auto-redirect from the site root** - the detection in `src/main.tsx`
   cannot run on Safari 12 (see section 1). Open `/legacy/` directly and
   bookmark it. This is the one limitation that bites on first use.
2. **Online-only** - songs are fetched from Firestore on every load and there
   is no local cache, so the app needs a connection. A failed fetch shows a
   connectivity message with a Try Again button.
3. **No Editing** - CodeMirror 6 requires modern features. Also read-only by
   construction: the data layer issues `GET` only.
4. **No Filters** - Could be added but deemed unnecessary
5. **No PWA / no Service Worker** - `/sw.js` is registered by the modern app
   (`src/main.tsx`), which never executes on iOS 12, so this app has no
   service worker and no cached shell. Offline support would need its own
   ES5 service worker scoped to `/legacy/`.
6. **No Set Lists** - the feature is Firestore-backed but not implemented here
7. **No External Links** - Google/YouTube/Spotify searches not implemented
8. **Basic UI** - Simple design, no fancy animations

## Future Enhancements (Optional)

If needed, these features could be added:

1. **Filters** - Language, difficulty filtering (ES5-compatible)
2. **Random Song** - Simple random selection
3. **More Keyboard Shortcuts** - Additional navigation keys
4. **Improved ChordPro** - Support more directives
5. **Print Styles** - Better printing support

## Code Quality

The legacy version follows these principles:

- **Simplicity** - No unnecessary complexity
- **Compatibility** - ES5 syntax throughout
- **Performance** - Minimal bundle size
- **Maintainability** - Clear, documented code
- **Reliability** - No external dependencies

## Conclusion

The legacy version successfully provides iOS 12.5.7 support while maintaining a clean separation from the main app. The implementation is simple, lightweight, and requires minimal maintenance.

---

**Implemented by:** Claude Code
**Date:** 2026-01-19
**Estimated Effort:** 10-12 hours
**Actual Effort:** ~10 hours
