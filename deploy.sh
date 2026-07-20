#!/bin/bash
# Pulsar Songbook - Production Build Script
# Run this before uploading dist/ to Bluehost
#
# VITE_DEV_BYPASS_AUTH lives in .env.development.local, which Vite only
# reads during `npm run dev` — it is never included in production builds.
# This script adds a safety check to catch any accidental misconfiguration.

set -e

echo "🏗️  Pulsar Songbook — Production Build"
echo "======================================="

# Safety check: abort if dev auth bypass would leak into the bundle
if grep -q "VITE_DEV_BYPASS_AUTH=true" .env.local 2>/dev/null; then
  echo "❌ VITE_DEV_BYPASS_AUTH=true found in .env.local"
  echo "   This would be baked into the production bundle."
  echo "   Move it to .env.development.local instead, then re-run."
  exit 1
fi
echo "✅ No dev auth bypass in .env.local"

# Build
echo ""
echo "📦 Building production bundle..."
npm run build

# Verify bypass did not leak into bundle
if grep -qr "dev@localhost" dist/assets/*.js dist/assets/*.mjs 2>/dev/null; then
  echo ""
  echo "❌ dev@localhost found in bundle — do NOT deploy this build."
  echo "   Check your .env files for VITE_DEV_BYPASS_AUTH=true."
  exit 1
fi
echo "✅ Bundle verified — no dev auth bypass present"

# Verify Firebase config was embedded. If .env.local is missing, Vite bakes
# `apiKey:void 0` into the bundle and the app crashes to a blank page on load.
if grep -qr "apiKey:void 0" dist/assets/*.js 2>/dev/null; then
  echo ""
  echo "❌ Firebase config missing from bundle (apiKey is undefined)."
  echo "   The app would load to a BLANK PAGE. Do NOT deploy this build."
  echo "   Cause: no .env.local with VITE_FIREBASE_* values at build time."
  echo "   Fix:   firebase apps:sdkconfig WEB --project pulsar-songbook-3a929"
  echo "          then create .env.local (see CLAUDE.md 'Firebase Configuration')."
  exit 1
fi
echo "✅ Bundle verified — Firebase config present"

echo ""
echo "✅ Build complete! Files are in dist/"
echo ""
echo "Next step — Upload to Bluehost:"
echo "  1. Login to https://my.bluehost.com → cPanel → File Manager"
echo "  2. Navigate to public_html/"
echo "  3. Upload all contents of dist/ (overwrite existing files)"
echo "  4. Keep .htaccess — do NOT delete it"
echo ""
