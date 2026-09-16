/**
 * Guard rail for the iOS 12 legacy app.
 *
 * The legacy app is served verbatim from public/legacy/ with no build step and
 * no transpilation, so any modern syntax that lands in these files is a *parse*
 * error on Safari 12 - which means nothing at all runs and the iPad shows a
 * blank page. That failure is invisible on a modern browser, so it needs a test
 * rather than a code review.
 *
 * This is how the original bug shipped: the iOS 12 redirect lived inside the
 * ES2022 React bundle, so it could never execute on the one device it targeted.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'acorn';

const LEGACY_DIR = join(process.cwd(), 'public', 'legacy');

const jsFiles = readdirSync(LEGACY_DIR).filter((file) => file.endsWith('.js'));

describe('legacy app ES5 compatibility', () => {
  it('finds legacy scripts to check', () => {
    // If someone renames or moves the directory, fail loudly instead of
    // silently passing a suite with zero cases.
    expect(jsFiles).toContain('app.js');
    expect(jsFiles).toContain('firestore-rest.js');
  });

  it.each(jsFiles)('%s parses as strict ES5', (file) => {
    const source = readFileSync(join(LEGACY_DIR, file), 'utf8');

    expect(() =>
      parse(source, { ecmaVersion: 5, sourceType: 'script' })
    ).not.toThrow();
  });

  it('rejects modern syntax, proving the gate actually bites', () => {
    // Sanity check on the check: if acorn ever stopped enforcing ecmaVersion 5
    // the suite above would pass unconditionally and be worthless.
    expect(() =>
      parse('const greet = () => `hi`;', { ecmaVersion: 5, sourceType: 'script' })
    ).toThrow();
  });

  // The acorn gate above only sees syntax. `[].includes(x)` or
  // `Object.assign({}, y)` parse perfectly as ES5 and then throw
  // "not a function" on Safari 12, which is just as fatal and even harder to
  // spot. Scan for the post-ES5 library APIs most likely to be reached for.
  const POST_ES5_APIS = [
    /\.includes\s*\(/,
    /\.find\s*\(/,
    /\.findIndex\s*\(/,
    /\.flat\s*\(/,
    /\.flatMap\s*\(/,
    /\.padStart\s*\(/,
    /\.padEnd\s*\(/,
    /\.trimStart\s*\(/,
    /\.trimEnd\s*\(/,
    /\.repeat\s*\(/,
    /\bObject\.assign\b/,
    /\bObject\.entries\b/,
    /\bObject\.values\b/,
    /\bObject\.fromEntries\b/,
    /\bArray\.from\b/,
    /\bPromise\b/,
    /\bSymbol\b/,
    /\bfetch\s*\(/,
    /\bnew\s+Map\s*\(/,
    /\bnew\s+Set\s*\(/,
  ];

  it.each(jsFiles)('%s uses no post-ES5 runtime APIs', (file) => {
    const source = readFileSync(join(LEGACY_DIR, file), 'utf8');

    const found = POST_ES5_APIS.filter((pattern) => pattern.test(source)).map(
      (pattern) => pattern.source
    );

    expect(found).toEqual([]);
  });

  it('loads the data layer before the app in index.html', () => {
    // app.js reads window.PulsarFirestoreREST during init(), so script order is
    // load-bearing. Classic scripts execute in document order.
    const html = readFileSync(join(LEGACY_DIR, 'index.html'), 'utf8');

    // Match the src attributes, not bare filenames: comments in the file
    // mention app.js too, which would make a naive indexOf lie.
    const dataLayerAt = html.indexOf('src="/legacy/firestore-rest.js"');
    const appAt = html.indexOf('src="/legacy/app.js"');

    expect(dataLayerAt).toBeGreaterThan(-1);
    expect(appAt).toBeGreaterThan(-1);
    expect(dataLayerAt).toBeLessThan(appAt);
  });

  it('uses no ES module syntax in the legacy scripts', () => {
    // type="module" would 404 the app on Safari 12 in a different way, and
    // sourceType:'script' above already rejects import/export - but assert the
    // HTML never opts into modules either.
    const html = readFileSync(join(LEGACY_DIR, 'index.html'), 'utf8');
    expect(html).not.toMatch(/type=["']module["']/);
  });
});
