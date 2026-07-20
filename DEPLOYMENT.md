# Pulsar Songbook - Deployment Guide

This guide explains how to deploy the Pulsar Songbook PWA to Bluehost hosting.

## Table of Contents
- [Automated Deployment (Recommended)](#automated-deployment-recommended)
- [Manual Deployment Steps](#manual-deployment-steps)
- [Legacy Version for iOS 12](#legacy-version-for-ios-12)
- [Initial Setup (One-Time)](#initial-setup-one-time)
- [Firebase Configuration](#firebase-configuration)
- [Regular Updates](#regular-updates)
- [Troubleshooting](#troubleshooting)
- [Testing Checklist](#testing-checklist)

---

## Automated Deployment (Recommended)

The fastest path is the `site-deploy` tool, which builds (through `deploy.sh`) and
FTPS-uploads `dist/` to Bluehost in one command:

```bash
site-deploy songbook          # build + upload this site
site-deploy --dry-run songbook  # build + show what would upload, no upload
site-deploy --all             # deploy every configured site
```

`site-deploy` is a personal, machine-local tool. Its config (FTP credentials,
per-site `remoteDir`) lives **outside this repo** at
`~/.config/site-deploy/sites.json` (chmod 600). It is not part of this codebase,
so a fresh checkout won't have it — the manual steps below are the fallback.

> **⚠️ Prerequisite — `.env.local` must exist before building.**
> The Firebase web config is read from `.env.local` at build time (see
> [Firebase Configuration](#firebase-configuration)). If it's missing, Vite bakes
> `apiKey: undefined` into the bundle and the deployed app loads to a **blank
> page**. `deploy.sh` now aborts the build if the Firebase config is missing, but
> only after you've created `.env.local`. To recreate it from the Firebase project:
> ```bash
> firebase apps:sdkconfig WEB --project pulsar-songbook-3a929
> ```
> then write the six values into `.env.local` as `VITE_FIREBASE_*` keys.

---

## Manual Deployment Steps

### 1. Build Production Version

```bash
cd <project-root>        # e.g. ~/Developer/personal/pulsar-songbook
npm install              # if dependencies changed
bash deploy.sh           # build + safety checks (see below)
```

Use `bash deploy.sh` rather than a bare `npm run build`. It runs the production
build plus two guards that abort before you ship a broken bundle:
- **Dev auth bypass** must not leak into the bundle.
- **Firebase config** must be present (catches a missing `.env.local`).

**Output:** All deployable files are in the `dist/` folder — including
`.htaccess`, which is tracked in the repo (`public/.htaccess`) and copied into
`dist/` automatically by Vite. No manual server-side `.htaccess` step is needed.

---

### 2. Upload Files to Bluehost

#### Option A: cPanel File Manager (Recommended)

1. **Login to Bluehost**
   - Go to: https://my.bluehost.com
   - Login with your credentials
   - Click "Advanced" → "cPanel"

2. **Open File Manager**
   - In cPanel, find "Files" section
   - Click "File Manager"

3. **Navigate to Deployment Location**
   - Go to `public_html/` (for main domain)
   - OR `public_html/subdomain-name/` (for subdomain)

4. **Upload Files**
   - Click "Upload" button (top toolbar)
   - Drag ALL files from your local `dist/` folder
   - OR Click "Select Files" and choose all files
   - Wait for upload to complete (2-5 minutes)

5. **Verify Upload**
   - Refresh File Manager
   - Confirm all files are present:
     - `index.html`
     - `manifest.webmanifest`
     - `sw.js`
     - `registerSW.js`
     - `assets/` folder
     - `icons/` folder

#### Option B: FTP Upload

1. **Get FTP Credentials**
   - cPanel → "FTP Accounts"
   - Note: hostname, username, password

2. **Connect with FileZilla**
   ```
   Host: ftp.yourdomain.com
   Username: your-bluehost-username
   Password: your-password
   Port: 21
   ```

3. **Upload Files**
   - Local site (left): Navigate to `dist/` folder
   - Remote site (right): Navigate to `public_html/`
   - Select ALL files in `dist/`
   - Drag to right panel
   - Wait for transfer to complete

---

### 3. Verify Deployment

1. **Visit Your Site**
   ```
   https://yourdomain.com
   ```

2. **Clear Browser Cache**
   - Chrome: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
   - Select "Cached images and files"
   - Click "Clear data"

3. **Test Basic Functionality**
   - Homepage loads (Song Library)
   - Click a song → displays correctly
   - Navigation works (no 404 errors)
   - Edit song works
   - Filters work
   - Random song button works

4. **Test PWA Features**
   - Wait ~30 seconds on the site
   - PWA install prompt should appear
   - Install the app
   - Test offline mode (disconnect internet)

---

## Legacy Version for iOS 12

The app includes a legacy version at `/legacy/` for devices running iOS 12.5.7 (Safari 12), which don't support modern JavaScript features like optional chaining.

### What is the Legacy Version?

- **Purpose:** Provides read-only song viewing for iOS 12.5.7 devices
- **Location:** `https://yourdomain.com/legacy/`
- **Features:** Song list, search, song display, auto-scroll, font controls
- **Not included:** Editing, exporting, filters, PWA installation
- **Technology:** Vanilla JavaScript with ES5 syntax (no React, no modern libraries)
- **Auto-redirect:** iOS 12 devices automatically redirect from `/` to `/legacy/`

### Legacy Version File Structure

The legacy version is built with the main app and located in `dist/legacy/`:

```
dist/
├── index.html              (Modern app)
├── assets/                 (Modern app bundles)
└── legacy/                 (Legacy version for iOS 12)
    ├── index.html          (ES5-compatible shell)
    ├── app.js              (Vanilla JavaScript, ~20KB)
    └── styles.css          (Plain CSS, ~7KB)

Note: Both apps share the same IndexedDB database for songs
```

### Deploying the Legacy Version

**The legacy version is automatically included in the standard build and deployment process.**

When you run `npm run build`, both versions are built:
- Main app → `dist/`
- Legacy app → `dist/legacy/`

When you upload to Bluehost, upload the entire `dist/` folder contents including the `legacy/` subdirectory.

### Shared Data Between Main and Legacy Apps

**Important:** Both the main app and legacy version share the same IndexedDB database (`PulsarSongbook`). This means:

- ✅ **No data duplication** - Both apps read from the same source
- ✅ **Automatic sync** - Changes in main app immediately available to legacy app
- ✅ **No manual export needed** - Songs added/edited in main app appear in legacy version
- ✅ **Works offline** - IndexedDB persists data locally

**How it works:**
1. Use the main app to add/edit/import songs
2. Songs are stored in IndexedDB
3. Open legacy version (`/legacy/`) to view the same songs
4. No export or data copying required

**First-time setup:**
- Open the main app first to initialize the database
- Import your songs using the main app's import feature
- Then access legacy version - it will read from the same database

### Testing the Legacy Version

**On Modern Browsers:**
1. Visit `https://yourdomain.com/legacy/` directly
2. Verify song list loads
3. Test search and song display

**On iOS 12.5.7 (or simulator):**
1. Visit `https://yourdomain.com/`
2. Should auto-redirect to `/legacy/`
3. Verify no JavaScript errors in console
4. Test all features:
   - Song list displays
   - Search works
   - Songs open and display correctly
   - Auto-scroll works (Space key)
   - Font controls work (+/- buttons)

### Legacy Version Features

**Available:**
- ✅ Song list with artist/title
- ✅ Search by title/artist
- ✅ Song display with ChordPro rendering
- ✅ Auto-scroll (Space key to start/stop)
- ✅ Scroll speed controls ([ and ] keys)
- ✅ Font size controls (+/- keys or buttons)
- ✅ Back navigation

**Not Available:**
- ❌ Editing songs
- ❌ Exporting data
- ❌ Filters (language, difficulty, etc.)
- ❌ Random song
- ❌ External links (Google, YouTube, Spotify)
- ❌ PWA installation
- ❌ Offline mode

### Browser Compatibility

**Main App Requires:**
- Safari 13.1+ (iOS 13.4+, macOS Catalina 10.15.4+)
- Chrome 80+
- Firefox 72+
- Edge 80+

**Legacy App Supports:**
- Safari 12+ (iOS 12.5.7+)
- All browsers that support ES5 (2009+)

### Troubleshooting Legacy Version

**Issue: Legacy version shows "No songs found in database"**

**Solution:**
1. Open the main app first to initialize IndexedDB
2. Import songs using the main app's import feature
3. Verify IndexedDB is enabled in browser settings
4. Check browser console for errors
5. Try clearing browser data and re-importing songs

**Issue: iOS 12 not redirecting to legacy**

**Solution:**
1. Check that modern app's `index.html` includes redirect script
2. Verify iOS version detection in browser console
3. Test redirect manually by visiting `/legacy/` directly

**Issue: ChordPro not rendering correctly**

**Solution:**
1. Verify ChordPro syntax in songs.json
2. Check for special characters that need escaping
3. Test in modern app first to verify ChordPro is valid

---

## Initial Setup (One-Time)

These steps only need to be done once, unless you change domains or hosting.

### Enable HTTPS/SSL

**PWAs require HTTPS to function!**

1. **In Bluehost cPanel:**
   - Find "Security" section
   - Click "SSL/TLS Status" or "Let's Encrypt SSL"
   - Find your domain
   - Click "Run AutoSSL" or "Enable"

2. **Force HTTPS Redirect**
   - Already configured in `.htaccess` (see below)
   - Automatically redirects HTTP → HTTPS

### .htaccess (tracked in repo — no manual step)

The `.htaccess` is version-controlled at **`public/.htaccess`** and Vite copies it
into `dist/` on every build, so it ships automatically with each deploy. You do
**not** create or maintain it by hand in cPanel anymore.

It provides:
- **SPA fallback** — rewrites deep links (e.g. `/setlist/123`) to `index.html` so
  BrowserRouter routes don't 404 on refresh.
- **HTTP → HTTPS redirect** — required for PWA functionality.
- **CORS** headers for fonts, **gzip** compression, and **browser caching**.

To change these rules, edit `public/.htaccess` and redeploy — never edit the copy
on the server, or your change will be overwritten on the next upload.

### Firebase Configuration

The app's Firebase web config is read from **`.env.local`** at build time. This
file is gitignored (it must never be committed — the repo is public) and is **not**
present in a fresh checkout, so you must create it before the first build.

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=pulsar-songbook-3a929.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=pulsar-songbook-3a929
VITE_FIREBASE_STORAGE_BUCKET=pulsar-songbook-3a929.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1065767108207
VITE_FIREBASE_APP_ID=1:1065767108207:web:...
```

These are client-side public values (they ship in every browser bundle), not
secrets. If you lose `.env.local`, regenerate the values from the Firebase project:

```bash
firebase apps:sdkconfig WEB --project pulsar-songbook-3a929
```

> **If `.env.local` is missing when you build, the deployed app loads to a blank
> page** (Vite bakes `apiKey: undefined` and Firebase throws before React mounts).
> `deploy.sh` guards against this and aborts the build if the config is absent.

**Verify a build actually renders** (not just that files exist) before trusting a
deploy — a headless render catches a blank page that HTTP 200 checks miss:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --dump-dom https://songbook.julianvirguez.com/ | grep -c "Pulsar Songbook"
```

---

## Regular Updates

When you make changes to the app and want to deploy updates:

### Step 1: Make Your Changes

- Edit code as needed
- Test locally: `npm run dev`
- Verify everything works: `npm run preview`

### Step 2: Build & Deploy

**Recommended (one command):**
```bash
site-deploy songbook
```
This builds via `deploy.sh` (with the auth-bypass and Firebase-config guards) and
FTPS-uploads `dist/` to the server.

**Manual fallback:**
```bash
bash deploy.sh
```
then upload the contents of `dist/` to `public_html/`, overwriting existing files.
Since `.htaccess` now ships inside `dist/`, overwriting is safe — there's nothing
to preserve by hand.

### Step 4: Clear Cache

**For you (developer):**
- Browser: Ctrl+Shift+Delete
- Clear "Cached images and files"
- Hard refresh: Ctrl+Shift+R

**For users:**
- Service worker auto-updates within 24 hours
- Users can force update by closing all tabs and reopening
- Or wait for automatic update

---

## Troubleshooting

### Issue: 404 Error on Page Refresh

**Symptom:** Direct URL like `/song/123` gives 404 error

**Solution:**
1. Check `.htaccess` file exists
2. Verify `.htaccess` has rewrite rules
3. Ensure `mod_rewrite` is enabled (contact Bluehost if not)

### Issue: PWA Won't Install

**Symptom:** No install prompt appears

**Causes & Solutions:**
1. **Not using HTTPS**
   - Verify URL shows 🔒 lock icon
   - Enable SSL in cPanel

2. **Already installed**
   - Check `chrome://apps`
   - Uninstall and try again

3. **Too soon**
   - Wait 30-60 seconds on the page
   - Visit multiple pages

4. **Browser cache**
   - Clear cache and try again

### Issue: Old Version Showing

**Symptom:** Changes not visible after deployment

**Solutions:**
1. **Clear browser cache**
   - Ctrl+Shift+Delete → Clear cached files

2. **Hard refresh**
   - Ctrl+Shift+R (Cmd+Shift+R on Mac)

3. **Check service worker**
   - F12 → Application → Service Workers
   - Click "Update" or "Unregister"
   - Refresh page

4. **Force reload**
   - F12 → Application → Storage → Clear site data
   - Close all tabs for the site
   - Reopen

### Issue: Assets Not Loading

**Symptom:** Broken styles, missing images, JS errors

**Solutions:**
1. **Check file permissions**
   - Files should be: 644
   - Folders should be: 755
   - In cPanel: Select files → Change Permissions

2. **Verify upload completed**
   - Check all files in `assets/` folder uploaded
   - Re-upload missing files

3. **Check CORS**
   - Ensure `.htaccess` has CORS rules for fonts

### Issue: Can't Login/Access Bluehost

**Solution:**
1. Go to https://my.bluehost.com
2. Use "Forgot Password" if needed
3. Contact Bluehost support: 1-888-401-4678

---

## Testing Checklist

After deployment, verify these features:

### Basic Functionality
- [ ] Homepage loads (Song Library)
- [ ] Song list displays all songs
- [ ] Search works
- [ ] Filters work (Language, Difficulty, Status, Priority)
- [ ] Click song → Opens song display page
- [ ] Song content displays correctly (ChordPro formatted)
- [ ] Edit button works
- [ ] Random button works
- [ ] Back button works

### Song Display Features
- [ ] Auto-scroll works (Space key)
- [ ] Scroll speed controls work ([ and ])
- [ ] Font size controls work (+ and -)
- [ ] Toggle chords works (C key)
- [ ] Fullscreen works (F key)
- [ ] Quick access links work (Google, YouTube, Spotify)
- [ ] Keyboard shortcuts work (G, Y, S)

### Edit Features
- [ ] Edit page loads
- [ ] CodeMirror editor works
- [ ] Live preview updates
- [ ] Metadata fields editable
- [ ] WYSIWYG editor for Learning Resource works
- [ ] Save button works
- [ ] Changes persist after save

### PWA Features
- [ ] Install prompt appears (after ~30 seconds)
- [ ] App installs successfully
- [ ] App opens from home screen/desktop
- [ ] App works offline (disconnect internet)
- [ ] Data persists offline (IndexedDB)

### Mobile Testing
- [ ] Test on mobile browser
- [ ] Responsive layout works
- [ ] Touch controls work
- [ ] Install on mobile device
- [ ] Test offline on mobile

---

## PWA Offline Testing

### How to test offline mode

1. Run `npm run build && npm run preview` (must use preview, not dev)
2. Visit `http://localhost:4173` and browse a few songs (this warms the cache)
3. DevTools → Network tab → change dropdown to **"Offline"**
4. Refresh — app should still load with a yellow offline banner

### Manual install via DevTools

1. DevTools → Application tab → Manifest → click **"Install"**
2. Or wait ~30 seconds for the custom install prompt to appear

### Expected offline behaviour

| Scenario | Result |
|---|---|
| First visit, online | Loads + caches everything |
| First visit, offline | ❌ Won't load (no cache yet) |
| Return visit, offline | ✅ Loads from cache |
| Edit songs offline | ✅ Saves to IndexedDB, syncs when back online |

### Service worker not showing?

- Must be on `localhost:4173` (preview), not `localhost:5175` (dev) — service worker doesn't run in dev mode
- DevTools → Application → Service Workers → should show "activated and is running"
- If stuck: Application → Storage → Clear site data, then revisit

---

## File Structure on Server

```
public_html/
├── .htaccess                 (from dist/ — tracked at public/.htaccess)
├── index.html                (from dist/)
├── manifest.webmanifest      (from dist/)
├── sw.js                     (from dist/)
├── registerSW.js             (from dist/)
├── assets/                   (from dist/)
│   ├── index-[hash].js
│   ├── index-[hash].css
│   ├── index.es-[hash].js
│   └── ...
├── icons/                    (from dist/)
│   └── icon.svg
└── legacy/                   (from dist/legacy/ - iOS 12 support)
    ├── index.html            (ES5-compatible shell)
    ├── app.js                (Vanilla JavaScript - reads from IndexedDB)
    └── styles.css            (Plain CSS)
```

**Important:**
- `.htaccess` - ships from `dist/` on every deploy (tracked at `public/.htaccess`); don't hand-edit it on the server
- Everything else - Overwrite with each deployment

---

## Deployment Frequency

**When to deploy:**
- After adding new features
- After fixing bugs
- After updating song data
- After changing app settings/config

**How users get updates:**
- Service worker checks for updates every 24 hours
- Users get updates automatically on next visit
- No action required from users

---

## Backup Strategy

### Before Deploying

1. **Backup current production**
   ```bash
   # In cPanel File Manager:
   # 1. Select all files in public_html/
   # 2. Click "Compress"
   # 3. Create archive: backup-YYYY-MM-DD.zip
   # 4. Download the zip file
   ```

2. **Keep local build**
   ```bash
   # On your computer, keep the dist/ folder
   # Or zip it:
   zip -r dist-backup-$(date +%Y%m%d).zip dist/
   ```

### Rollback If Needed

1. Delete current files
2. Upload previous backup
3. Extract in `public_html/`

---

## Quick Reference Commands

```bash
# Build production version
npm run build

# Test locally before deployment
npm run preview

# Check for errors
npm run build && npm run preview

# Check TypeScript types
npm run build
```

---

## Support & Resources

- **Bluehost Support:** 1-888-401-4678
- **Bluehost Knowledge Base:** https://my.bluehost.com/hosting/help
- **Project Repository:** https://github.com/forcepulsar/PulsarSongbook (public)
- **This Documentation:** `DEPLOYMENT.md`

---

## Changelog

Track your deployments here:

### [DATE] - v1.0.0
- Initial deployment
- All core features working
- PWA installation functional

### [DATE] - v1.1.0
- Added keyboard shortcuts for Google/YouTube/Spotify (G, Y, S)
- Fixed scroll position on song navigation
- Mobile optimization for song library

---

## Notes

- Always test locally before deploying (`npm run preview`)
- `.htaccess` is tracked in the repo (`public/.htaccess`) and ships with each build — don't hand-edit it on the server
- `.env.local` (Firebase config) must exist before building, or the app deploys as a blank page
- HTTPS is required for PWA functionality
- Service worker caches everything - users get updates within 24 hours
- IndexedDB stores all data locally - no backend needed

---

**Last Updated:** 2026-07-20
