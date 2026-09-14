// Pre-build guard for CI hosts (Cloudflare Workers builds).
//
// deploy.sh performs these checks against .env.local, which only exists on a
// dev machine. In CI the same two misconfigurations fail *silently*: the build
// exits 0 and ships a bundle with `undefined` Firebase config, which throws
// before React mounts -> BLANK PAGE. Verified: building with .env.local absent
// succeeds but emits no real config into dist/assets/.
//
// Reads process.env only, so it works both locally (Vite loads .env.local into
// the build, but npm exposes nothing here) and in CI. Skips when no CI-style
// env is present so local `npm run build` is unaffected.

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

if (process.env.VITE_DEV_BYPASS_AUTH === 'true') {
  console.error('❌ VITE_DEV_BYPASS_AUTH=true is set in the build environment.');
  console.error('   This bakes an auth bypass into the production bundle. Remove it.');
  process.exit(1);
}

const missing = REQUIRED.filter((k) => !process.env[k]?.trim());

if (missing.length === REQUIRED.length) {
  // Nothing set at all: almost certainly a local build where Vite will read
  // .env.local itself. deploy.sh covers that path.
  console.log('ℹ️  No VITE_FIREBASE_* in process.env - assuming local build via .env.local.');
  process.exit(0);
}

if (missing.length > 0) {
  console.error(`❌ Firebase config incomplete. Missing/empty:\n   ${missing.join('\n   ')}`);
  console.error('   A partial config still builds, then loads to a BLANK PAGE.');
  console.error('   Set all 6 VITE_FIREBASE_* vars in the build environment.');
  process.exit(1);
}

console.log('✅ Firebase config complete (all 6 VITE_FIREBASE_* present).');
