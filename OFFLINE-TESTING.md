# Testing PWA Offline Functionality

## Step-by-Step Offline Testing Guide

### 1. First Visit (Installation Phase)

**With Internet:**
```bash
# Build the production app
npm run build

# Serve the production build
npm run preview
```

1. Open http://localhost:4173 in your browser
2. Browse around the app
3. Open **DevTools** → **Application** tab → **Service Workers**
4. You should see service worker registered and activated
5. Check **Cache Storage** → You should see cached files

### 2. Test Offline Functionality

**Simulate Offline:**

**Method A: DevTools Network Tab**
1. Keep the app open
2. **DevTools** → **Network** tab → Switch to "Offline"
3. Refresh the page → ✅ Should load from cache
4. Browse songs → ✅ Everything works
5. Yellow offline banner → ✅ Should appear

**Method B: Actually Disconnect**
1. Disconnect from WiFi
2. Turn off mobile data
3. Refresh the page → ✅ Should still work
4. Try all features → ✅ All functional

### 3. Test From Scratch Offline (Won't Work)

**To Prove First Visit Needs Internet:**
1. Clear all browser data (⚠️ This deletes the cache)
2. Disconnect from internet
3. Try to visit the site → ❌ Won't load
4. This is expected PWA behavior!

### 4. Install Prompt Testing

**On Desktop (Chrome/Edge):**
1. Build and preview: `npm run build && npm run preview`
2. Visit http://localhost:4173
3. Wait 30 seconds
4. Custom install prompt should slide up from bottom
5. Or look for install icon in address bar

**On Mobile:**
1. Deploy to real domain (Vercel/Netlify)
2. Visit on mobile browser
3. Chrome: Install banner appears automatically
4. Safari: Share → "Add to Home Screen"

### 5. Test Installed App

**After Installing:**
1. Close browser
2. Find app icon on desktop/home screen
3. Launch → Opens in standalone window (no browser UI!)
4. Test offline → Disconnect internet → Still works!

## What Gets Cached?

✅ **Automatically Cached by Service Worker:**
- All JavaScript bundles
- All CSS files
- HTML files
- Icons and images
- song__c.json (song data)

✅ **Stored in IndexedDB:**
- All parsed songs
- User settings (font size, scroll speed)
- Sync queue

## Troubleshooting

### Install Prompt Doesn't Appear?
- Only works over HTTPS or localhost
- Only appears once per domain
- Won't appear if dismissed recently
- Check DevTools → Application → Manifest

### Offline Doesn't Work?
- Did you visit the site at least once while online?
- Check DevTools → Application → Service Workers (should show "activated")
- Check Cache Storage (should have files)

### Clear Cache and Start Over?
1. DevTools → Application → Clear storage → "Clear site data"
2. Or: Chrome → Settings → Privacy → Clear browsing data
3. Close and reopen browser
4. Visit site while online to reinstall

## Expected Behavior Summary

| Scenario | Result |
|----------|--------|
| First visit, online | ✅ Loads, caches everything |
| First visit, offline | ❌ Won't load (no cache yet) |
| Second+ visit, online | ✅ Loads instantly from cache, updates in background |
| Second+ visit, offline | ✅ Loads perfectly from cache |
| Editing songs offline | ✅ Works, saved to IndexedDB |
| Sync when back online | ✅ Ready for backend (Phase 5) |

## Pro Tip: Lighthouse PWA Audit

Run a PWA audit:
1. DevTools → Lighthouse tab
2. Select "Progressive Web App"
3. Click "Generate report"
4. See your PWA score and suggestions!
