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

# Safety check: abort if the Firebase web config is incomplete. Vite inlines
# these at build time; ANY missing var bakes `undefined` into the bundle and the
# app loads to a BLANK PAGE (Firebase throws before React mounts). Validate the
# source of truth (.env.local) rather than a minifier-specific bundle string, so
# the check survives minifier/Vite changes and catches partially-missing configs.
FIREBASE_VARS="VITE_FIREBASE_API_KEY VITE_FIREBASE_AUTH_DOMAIN VITE_FIREBASE_PROJECT_ID VITE_FIREBASE_STORAGE_BUCKET VITE_FIREBASE_MESSAGING_SENDER_ID VITE_FIREBASE_APP_ID"
missing=""
for var in $FIREBASE_VARS; do
  # require `VAR=<non-empty, non-whitespace>` somewhere in .env.local
  if ! grep -qE "^[[:space:]]*${var}[[:space:]]*=[[:space:]]*[^[:space:]]" .env.local 2>/dev/null; then
    missing="${missing} ${var}"
  fi
done
if [ -n "$missing" ]; then
  echo "❌ Firebase config incomplete in .env.local. Missing/empty:${missing}"
  echo "   The app would deploy to a BLANK PAGE (Firebase init throws on load)."
  echo "   Regenerate:  firebase apps:sdkconfig WEB --project pulsar-songbook-3a929"
  echo "   then set the VITE_FIREBASE_* values in .env.local"
  echo "   (see CLAUDE.md / DEPLOYMENT.md 'Firebase Configuration')."
  exit 1
fi
echo "✅ Firebase config complete (all 6 VITE_FIREBASE_* set)"

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

echo ""
echo "✅ Build complete! Files are in dist/"
echo ""
echo "Next step — deploy:"
echo "  Easiest:  site-deploy songbook   (builds + FTPS-uploads automatically)"
echo ""
echo "  Manual (cPanel File Manager):"
echo "    1. Login to https://my.bluehost.com → cPanel → File Manager"
echo "    2. Settings → enable 'Show Hidden Files (dotfiles)'  ← required for .htaccess"
echo "    3. Navigate to public_html/"
echo "    4. Upload ALL contents of dist/ — including .htaccess — overwriting existing"
echo "       (.htaccess ships inside dist/ now; do NOT hand-preserve the server copy,"
echo "        or edits to public/.htaccess will never take effect in production)"
echo ""
