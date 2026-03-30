#!/bin/bash
# Pulsar Songbook - Production Build Script
# Run this before uploading dist/ to Bluehost
#
# What it does:
#   1. Disables dev auth bypass (VITE_DEV_BYPASS_AUTH) so it's NOT in the production bundle
#   2. Runs npm run build
#   3. Re-enables the bypass so local dev still works
#   4. Reminds you to upload dist/ to Bluehost

set -e

ENV_FILE=".env.local"
BACKUP_VALUE=""

echo "🏗️  Pulsar Songbook — Production Build"
echo "======================================="

# Step 1: Disable dev auth bypass
if grep -q "VITE_DEV_BYPASS_AUTH" "$ENV_FILE" 2>/dev/null; then
  BACKUP_VALUE=$(grep "VITE_DEV_BYPASS_AUTH" "$ENV_FILE" | cut -d'=' -f2)
  sed -i '' 's/VITE_DEV_BYPASS_AUTH=.*/VITE_DEV_BYPASS_AUTH=false/' "$ENV_FILE"
  echo "✅ Dev auth bypass disabled in $ENV_FILE"
else
  echo "ℹ️  VITE_DEV_BYPASS_AUTH not found in $ENV_FILE — skipping"
fi

# Step 2: Build
echo ""
echo "📦 Building production bundle..."
npm run build

BUILD_EXIT=$?

# Step 3: Restore dev auth bypass
if [ -n "$BACKUP_VALUE" ] && [ "$BACKUP_VALUE" != "false" ]; then
  sed -i '' "s/VITE_DEV_BYPASS_AUTH=.*/VITE_DEV_BYPASS_AUTH=${BACKUP_VALUE}/" "$ENV_FILE"
  echo ""
  echo "✅ Dev auth bypass restored to: VITE_DEV_BYPASS_AUTH=${BACKUP_VALUE}"
fi

# Step 4: Summary
if [ $BUILD_EXIT -eq 0 ]; then
  echo ""
  echo "✅ Build complete! Files are in dist/"
  echo ""
  echo "Next step — Upload to Bluehost:"
  echo "  1. Login to https://my.bluehost.com → cPanel → File Manager"
  echo "  2. Navigate to public_html/"
  echo "  3. Upload all contents of dist/ (overwrite existing files)"
  echo "  4. Keep .htaccess — do NOT delete it"
  echo ""
else
  echo ""
  echo "❌ Build failed. Check errors above."
  exit 1
fi
