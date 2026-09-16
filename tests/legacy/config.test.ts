/**
 * Guards the one piece of configuration the legacy app duplicates.
 *
 * `firestore-rest.js` hardcodes the Firestore project id, because the legacy
 * app is deliberately self-contained: no build step, no env injection, nothing
 * shared with the modern app's pipeline. The cost of that independence is that
 * the value can silently drift from `VITE_FIREBASE_PROJECT_ID`. If it does,
 * the modern app keeps working while the legacy app 404s or 403s - a failure
 * that only shows up on the iPad, which is the worst place to discover it.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const LEGACY_SRC = readFileSync(
  join(process.cwd(), 'public', 'legacy', 'firestore-rest.js'),
  'utf8'
);

function hardcodedProjectId(): string | null {
  const match = LEGACY_SRC.match(/var PROJECT_ID = '([^']+)'/);
  return match ? match[1] : null;
}

function envProjectId(): string | null {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return null;

  const match = readFileSync(envPath, 'utf8').match(
    /^VITE_FIREBASE_PROJECT_ID=(.*)$/m
  );
  if (!match) return null;

  return match[1].trim().replace(/^["']|["']$/g, '') || null;
}

describe('legacy Firestore config', () => {
  it('declares a project id', () => {
    expect(hardcodedProjectId()).toBeTruthy();
  });

  it('matches VITE_FIREBASE_PROJECT_ID when a local env file is present', () => {
    const fromEnv = envProjectId();

    if (!fromEnv) {
      // CI has no .env.local (the six VITE_ vars are Worker build variables),
      // so there is nothing to compare against there. Skipping is correct:
      // the check exists to catch drift on the machine where it is edited.
      expect(hardcodedProjectId()).toBeTruthy();
      return;
    }

    expect(hardcodedProjectId()).toBe(fromEnv);
  });

  it('ships no API key or other credential', () => {
    // Reads are anonymous by design (firestore.rules: `allow read: if true`).
    // A key here would be a credential committed to a public static file for
    // no benefit.
    expect(LEGACY_SRC).not.toMatch(/AIza[0-9A-Za-z_-]{10,}/);
    expect(LEGACY_SRC).not.toMatch(/[?&]key=/);
    expect(LEGACY_SRC).not.toMatch(/apiKey/i);
  });

  it('never references a write verb', () => {
    // The legacy app must not be able to mutate the library, whatever else
    // changes in here.
    expect(LEGACY_SRC).not.toMatch(/'(POST|PATCH|PUT|DELETE)'/);
    expect(LEGACY_SRC).not.toMatch(/:commit|:batchWrite/);
  });
});
