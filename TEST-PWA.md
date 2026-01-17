# Quick PWA Testing Guide

## ✅ Immediate Test (No Waiting)

### 1. Manual Install via DevTools

**Currently at: http://localhost:4173/**

1. Press **F12** to open DevTools
2. Click **"Application"** tab (top menu)
3. Left sidebar → Click **"Manifest"**
4. Scroll down → Click **"Install"** button
5. Browser dialog appears → Click "Install"
6. **Done!** App icon should appear on your desktop/dock

### 2. Verify Service Worker

In DevTools → **Application** tab:

- Click **"Service Workers"** in left sidebar
- Should show: **"activated and is running"**
- Shows: `sw.js` from localhost:4173

### 3. Test Offline

**While still in http://localhost:4173/**

1. Browse a few songs (this caches them)
2. DevTools → **Network** tab
3. Dropdown: Change to **"Offline"**
4. Press **Cmd+R** (Mac) or **Ctrl+R** (Windows) to refresh
5. ✅ **Page should still load!**
6. ✅ **Yellow banner appears**: "You're offline..."
7. ✅ **Browse songs** - they all work!
8. ✅ **All features work**: scroll, search, font size, etc.

### 4. Check Cache

DevTools → **Application** tab:

- **Cache Storage** → Click the arrow
  - You should see multiple caches
  - Click each to see cached files (HTML, CSS, JS, images)
- **IndexedDB** → Expand "PulsarSongbook"
  - Click "songs" → See all your songs stored locally
  - Click "settings" → See your preferences

### 5. Launch Installed App

1. **Close your browser** completely
2. Find **"Pulsar Songbook"** icon:
   - **Mac**: Applications folder or Dock
   - **Windows**: Start Menu or Desktop
   - **Linux**: Applications menu
3. **Click to launch**
4. ✅ Opens in **standalone window** (no address bar!)
5. ✅ Disconnect WiFi → **Still works perfectly!**

## 🎯 Expected Results

| Test | Expected Result |
|------|----------------|
| Open http://localhost:4173 | ✅ App loads instantly |
| Service Worker status | ✅ "activated and is running" |
| Go offline and refresh | ✅ App still loads from cache |
| Offline banner | ✅ Yellow banner appears |
| Browse songs offline | ✅ All songs work |
| Install via DevTools | ✅ Browser install dialog appears |
| Launch installed app | ✅ Opens in standalone mode |
| Installed app offline | ✅ Works without internet |

## 🐛 Troubleshooting

### "Install" button is grayed out?
- Refresh the page once
- Make sure you're on localhost:4173 (not 5173)
- Check that manifest shows properly in DevTools

### Service Worker not showing?
- Wait 5 seconds and refresh
- Check Console tab for errors
- Try closing and reopening DevTools

### Offline doesn't work on first try?
- You MUST browse songs first (to cache them)
- Then go offline
- Then refresh

### Can't find installed app?
- **Mac**: Check `/Applications` folder
- **Windows**: Search for "Pulsar Songbook" in Start Menu
- **Chrome**: Type `chrome://apps` in address bar

## 📱 About the Automatic Install Prompt

Our custom sliding prompt (with 🎸 and "Install" button) will appear when:

- Browser decides user has engaged enough
- User hasn't dismissed it before
- Could take multiple visits over several days

**BUT:** You don't need it! Manual install via DevTools works perfectly.

## ✨ Pro Tips

1. **Test with Chrome DevTools**: Most reliable for PWA testing
2. **Check Lighthouse score**: DevTools → Lighthouse → Run PWA audit
3. **Clear everything**: Application → Storage → "Clear site data" to start fresh
4. **Mobile testing**: Deploy to real URL (Vercel/Netlify) for mobile testing

## 🚀 Deploy for Real Testing

To test on your phone or share with others:

```bash
# Deploy to Vercel (free)
npm i -g vercel
vercel

# Or Netlify
npm i -g netlify-cli
netlify deploy --prod
```

Then visit the URL on your phone → Install prompt more likely to appear!
