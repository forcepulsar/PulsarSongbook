# Pulsar Songbook - Deployment Guide

This guide explains how to deploy the Pulsar Songbook PWA.

Hosting is **Cloudflare Workers static assets**. Deployment is automatic: push to
`main` and Cloudflare Workers Builds builds and deploys. There is no manual
upload step.

Bluehost was retired on 2026-09-14 and there is no longer any path back to it:
`deploy.sh`, the `site-deploy songbook` FTPS entry, `public/.htaccess` and
`public/.assetsignore` have all been removed. To roll back a bad deploy, see
[Backup Strategy](#backup-strategy).

## Table of Contents
- [Cloudflare Workers Hosting](#cloudflare-workers-hosting)
- [Deploying Changes](#deploying-changes)
- [Verifying a Deployment](#verifying-a-deployment)
- [Legacy Version for iOS 12](#legacy-version-for-ios-12)
- [Initial Setup (One-Time)](#initial-setup-one-time)
- [Firebase Configuration](#firebase-configuration)
- [Regular Updates](#regular-updates)
- [Troubleshooting](#troubleshooting)
- [Testing Checklist](#testing-checklist)

---

## Cloudflare Workers Hosting

`songbook.julianvirguez.com` is served by **Workers static assets** (not the
legacy Pages product). The repo config is `wrangler.jsonc`; the deploy itself is
run by Cloudflare Workers Builds on every push to `main`.

### Worker settings (dashboard)

Compute → Workers & Pages → the `pulsarsongbook` Worker
(`https://pulsarsongbook.pulsarlight.workers.dev`):

| Setting | Value | Notes |
|---|---|---|
| Build command | `npm run build:cf` | ⚠️ not `npm run build` — that skips the Firebase config guard and can deploy a blank page |
| Deploy command | `npx wrangler deploy` | |
| Production branch | `main` | |

### Required build variables

⚠️ **Without these the build still exits 0 and the site loads to a blank page.**
Vite inlines `VITE_FIREBASE_*` at build time; Cloudflare's builder has no
`.env.local`, so a missing var bakes `undefined` into the bundle and Firebase
throws before React mounts.

Set all six under **Settings → Build → Variables and Secrets**:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

`npm run build:cf` runs `scripts/check-build-env.mjs` first, which fails the
build loudly if any are missing in CI (rather than shipping a blank page). These
are Firebase *web* config values — public by design, not secrets.

### Routing

`not_found_handling: "single-page-application"` serves `index.html` with `200`
for unmatched paths, which is required for `BrowserRouter` deep links
(`/song/:id`, `/setlist/:id/edit`). Real files take precedence, so the iOS 12
app at `/legacy/` is unaffected.

**Do not add a long `max-age`/`immutable` rule for `/assets/*` in `_headers`.**
SPA fallback returns HTML for *any* unmatched path including `.js`, so after a
deploy an open tab requesting a deleted code-split chunk would cache HTML at a
JS URL — for a year, if `immutable` were set. See the note in `public/_headers`.

### Zone settings

- **SSL/TLS → Edge Certificates → Always Use HTTPS: ON.** Required for PWA and
  service-worker registration. There is no in-repo equivalent — this is the only
  thing enforcing the HTTP → HTTPS redirect, so do not turn it off.

### How this was set up

The cutover from Bluehost happened on 2026-09-14 and is complete. For the record:
the Worker was created from the GitHub repo, the old `songbook` A record was
deleted from the zone, and the custom domain was attached to the Worker (Cloudflare
refuses to attach while a conflicting A record exists, so those two steps had to
be back to back). The zone's **Always Use HTTPS** replaced the Apache redirect.

### Routing is owned by wrangler.jsonc, not the dashboard

Cutover completed **2026-09-14**. `workers_dev` and `preview_urls` are now
`false`, and the custom domain is pinned in `wrangler.jsonc`.

⚠️ **Do not add a custom domain in the dashboard alone.** In CI (non-TTY)
wrangler deploys with `override_scope` / `override_existing_origin` set, which
makes the config file authoritative for this Worker's custom domains. A domain
added only in the dashboard can be **silently dropped** by a later CI deploy.
Add it to the `routes` array in `wrangler.jsonc` instead.

For the same reason `workers_dev: false` is enough to retire the
`workers.dev` URL — the next deploy disables the subdomain route. No dashboard
step is needed. `preview_urls: false` closes the matching versioned preview
hostnames; Workers Builds preview branches still build, the preview link just
does not route.

Note on failure mode: triggers are applied *after* the new version is uploaded
and activated. If the trigger step fails you get a red build, but the new code
is already live on the custom domain — it does **not** roll back to the previous
version.


## Deploying Changes

```bash
git checkout -b my-change
# ...edit, test with `npm run dev`...
npm run test:run && npm run lint
git commit -am "..." && git push -u origin my-change
gh pr create --fill
```

Merging to `main` is the deploy. Cloudflare Workers Builds then runs
`npm run build:cf` followed by `npx wrangler deploy`. Watch it under the Worker →
**Deployments**.

Nothing needs to be built or uploaded by hand, and `.env.local` is **not** used
by the deploy — CI reads the `VITE_FIREBASE_*` build variables instead (see
[Required build variables](#required-build-variables)). You still need
`.env.local` for local `npm run dev`/`npm run build`.

The legacy iOS 12 app at `dist/legacy/` is part of the same build and deploys
with it.

---

## Verifying a Deployment

A `200` is not sufficient — local DNS or a stale service worker can make the old
site look like a successful deploy. Confirm *who* served it and *which* build:

```bash
H=songbook.julianvirguez.com

# 1. Cloudflare served it, from the Sydney edge
curl -sI https://$H/ | grep -iE "^server|^cf-ray"     # want: cloudflare, cf-ray ...-SYD
curl -s https://$H/cdn-cgi/trace | grep -E "^colo="   # want: colo=SYD

# 2. Deep links work (BrowserRouter routes, not just /)
for u in / /setlists /song/abc /setlist/x/edit /legacy/; do
  printf "%s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' https://$H$u)"
done

# 3. The Firebase config actually made it into the bundle.
#    A build with missing variables exits 0 and ships `apiKey:void 0`.
CH=$(curl -s https://$H/ | grep -o 'assets/config-[A-Za-z0-9_-]*\.js' | head -1)
curl -s "https://$H/$CH" | grep -c firebaseapp.com   # want: 1 or more
```

If `server` is anything other than `cloudflare`, that is stale local DNS, not a
failed deploy:

```bash
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```

Then in a browser: the song library loads, a song opens, and Google login works.
Login only works on the real domain — never on a `workers.dev` hostname, which
is not an authorised Firebase domain (and is disabled anyway).

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

The whole `dist/` tree, including `legacy/`, is uploaded by `wrangler deploy` in
CI. Requests to `/legacy`, `/legacy/` and `/legacy/index.html` all resolve to the
legacy app — real files take precedence over the SPA fallback.

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

**PWAs require HTTPS to function.**

Both parts are Cloudflare zone settings, already enabled:

- **Certificate** — issued automatically when the custom domain was attached to
  the Worker, and auto-renews. Covers `songbook.julianvirguez.com`.
- **HTTP → HTTPS redirect** — zone `julianvirguez.com` → SSL/TLS → Edge
  Certificates → **Always Use HTTPS**. This replaced the Apache `R=301`
  redirect that used to live in `.htaccess`.

Verify: `curl -sI http://songbook.julianvirguez.com/` should return `301` to
`https://`.

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

> **If the Firebase config is missing when you build, the app loads to a blank
> page** (Vite bakes `apiKey: undefined` and Firebase throws before React mounts).
> Two separate places must have it: `.env.local` for local builds, and the
> Worker's **build variables** for CI. `scripts/check-build-env.mjs` (run by
> `npm run build:cf`) aborts a CI build when any are absent — but it deliberately
> allows an all-empty local environment, where Vite reads `.env.local` itself.

**Verify a build actually renders** (not just that files exist) before trusting a
deploy — a headless render catches a blank page that HTTP 200 checks miss. Check
that React actually mounted into `#root` (which is empty in the static shell), and
give the JS time to run with `--virtual-time-budget`. Do **not** grep for the page
`<title>` or "Pulsar Songbook" — those live in the static HTML and match even on a
blank page:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --virtual-time-budget=8000 \
  --dump-dom https://songbook.julianvirguez.com/ \
  | tr -d '\n' | grep -qE 'id="root"><[a-zA-Z]' \
  && echo "✅ app rendered" || echo "❌ BLANK PAGE — do not trust this deploy"
```

---

## Regular Updates

When you make changes to the app and want to deploy updates:

### Step 1: Make Your Changes

- Edit code as needed
- Test locally: `npm run dev`
- Verify everything works: `npm run preview`

### Step 2: Open a PR and merge it

```bash
git push -u origin my-change && gh pr create --fill
```

Merging to `main` deploys. The auth-bypass and Firebase-config guards that used
to live in `deploy.sh` now run in CI via `npm run build:cf`
(`scripts/check-build-env.mjs`), so a misconfigured build fails loudly instead of
shipping a blank page.

### Step 3: Clear Cache

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

**Solution:** this is `not_found_handling` in `wrangler.jsonc`, which must be
`"single-page-application"` so unmatched paths return `index.html` with `200`.

```bash
grep not_found_handling wrangler.jsonc
```

### Issue: PWA Won't Install

**Symptom:** No install prompt appears

**Causes & Solutions:**
1. **Not using HTTPS**
   - Verify URL shows 🔒 lock icon
   - Zone → SSL/TLS → Edge Certificates → **Always Use HTTPS**

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
1. **Check the deploy actually uploaded them**
   - Worker → Deployments → the build log lists every uploaded asset
   - File permissions are not a thing on Workers

2. **Check CORS**
   - CORS headers come from `public/_headers`
   - `wrangler dev` logs `Parsed N valid header rules` if the file is valid

3. **Check for a stale chunk request**
   - A request for a deleted code-split chunk returns `index.html` with `200`
     (SPA fallback), which shows up as a JS syntax error in the console
   - Expected after a deploy with a tab left open; a reload fixes it. This is
     why `/assets/*` must never be given a long `max-age`/`immutable` —
     see [Routing](#routing)

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

## File Structure Deployed

`wrangler deploy` uploads the contents of `dist/`:

```
dist/
├── _headers                  (parsed by Workers, never served)
├── index.html
├── manifest.webmanifest
├── sw.js
├── registerSW.js
├── assets/                   (content-hashed; safe to replace wholesale)
│   ├── index-[hash].js
│   ├── index-[hash].css
│   ├── index.es-[hash].js
│   └── ...
├── icons/
│   └── icon.svg
└── legacy/                   (iOS 12 support)
    ├── index.html            (ES5-compatible shell)
    ├── app.js                (Vanilla JavaScript - reads from IndexedDB)
    └── styles.css            (Plain CSS)
```

**Important:** each deploy replaces the asset set; there is nothing to preserve
by hand. `_headers` is read and applied by Workers but never served as a file.

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

No manual backup step. Cloudflare keeps every deployed version, and `main` is the
source of truth.

### Rolling back a bad deploy

Fastest — Worker → **Deployments** → pick the previous version → **Rollback**.
Takes effect immediately, no rebuild.

Or revert the commit and let CI redeploy:

```bash
git revert <sha> && git push
```

Note that triggers are applied *after* a new version is activated, so a build
that goes red at the trigger step has **already** put new code live — check the
site rather than assuming it rolled back.

There is no Bluehost fallback any more — that path was removed on 2026-09-15.

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

- **Cloudflare Workers static assets:** https://developers.cloudflare.com/workers/static-assets/
- **`_headers` / `_redirects`:** https://developers.cloudflare.com/workers/static-assets/headers/
- **Workers Builds (CI):** https://developers.cloudflare.com/workers/ci-cd/builds/
- **Project Repository:** https://github.com/forcepulsar/PulsarSongbook (public)
- **This Documentation:** `DEPLOYMENT.md`

---

## Changelog

The commit history is the source of truth for what shipped and when:

```bash
git log --oneline
```

See the [GitHub commit history](https://github.com/forcepulsar/PulsarSongbook/commits/main)
for the same online.

---

## Notes

- Always test locally before merging (`npm run preview`)
- Routing and headers live in `wrangler.jsonc` and `public/_headers`
- The six `VITE_FIREBASE_*` **build variables** must be set on the Worker, or the
  build succeeds and the app deploys as a blank page. `npm run build:cf` guards
  this in CI; `.env.local` only covers local builds
- HTTPS is required for PWA functionality
- Service worker caches everything - users get updates within 24 hours
- IndexedDB stores all data locally - no backend needed

---

**Last Updated:** 2026-09-15
