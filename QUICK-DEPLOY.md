# Quick Deployment Guide

Fast reference for deploying Pulsar Songbook to Bluehost.

## 🚀 3-Step Deployment

### 1. Build
```bash
cd /Users/julianvirguez/Documents/dev/SF/PulsarSongbook/pulsar-songbook
npm run build
```

### 2. Upload
- Login: https://my.bluehost.com → cPanel → File Manager
- Go to: `public_html/`
- Upload ALL files from `dist/` folder
- Overwrite existing files (except `.htaccess`)

### 3. Test
- Visit: https://yourdomain.com
- Clear cache: Ctrl+Shift+Delete
- Test: Browse songs, edit, random, filters
- PWA: Wait 30 sec for install prompt

---

## ⚡ Even Faster

```bash
# One command to build and remind you
npm run build && echo "✅ Build complete! Now upload dist/ to Bluehost"
```

---

## 🔧 Common Issues

| Issue | Fix |
|-------|-----|
| 404 on refresh | Check `.htaccess` exists with rewrite rules |
| No install prompt | Verify HTTPS enabled (🔒 in address bar) |
| Old version showing | Clear browser cache (Ctrl+Shift+Delete) |
| Styles broken | Re-upload all files from `dist/` |

---

## 📋 Quick Checklist

- [ ] Run `npm run build`
- [ ] Upload `dist/` contents to `public_html/`
- [ ] Keep `.htaccess` file (don't delete it)
- [ ] Visit site and clear cache
- [ ] Test song display, edit, navigation
- [ ] Wait 30 sec for PWA install prompt

---

## 📞 Emergency

**Bluehost Support:** 1-888-401-4678

**Full Documentation:** See `DEPLOYMENT.md`

---

**Deploy date:** ___________
**Version:** ___________
**Notes:** ___________
