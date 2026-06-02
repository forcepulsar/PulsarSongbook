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

echo ""
echo "✅ Build complete! Files are in dist/"
echo ""
echo "Next step — Upload to Bluehost:"
echo "  1. Login to https://my.bluehost.com → cPanel → File Manager"
echo "  2. Navigate to public_html/"
echo "  3. Upload all contents of dist/ (overwrite existing files)"
echo "  4. Keep .htaccess — do NOT delete it"
echo ""
