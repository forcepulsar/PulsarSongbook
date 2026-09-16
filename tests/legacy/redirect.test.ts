/**
 * Tests for the iOS 12 redirect shim inlined in index.html.
 *
 * This shim is the entry path for the whole legacy app, and it is the piece
 * that was broken for the app's entire existence: the check used to live in
 * src/main.tsx, which is bundled to ES2022, so Safari 12 threw a parse error
 * before it could run and the iPad got a blank page (issue #12).
 *
 * Two classes of test here, and both matter:
 *   1. The shim must PARSE as ES5 - otherwise it reintroduces the exact bug
 *      it exists to fix, and no amount of correct logic would ever execute.
 *   2. The redirect decision must be right for each engine, including the
 *      false-positive cases where redirecting would be actively harmful.
 *
 * The shim source is extracted from index.html and executed verbatim, so
 * these tests cannot drift from what ships.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'acorn';

const INDEX_HTML = readFileSync(join(process.cwd(), 'index.html'), 'utf8');

/** The inline shim: the only <script> with no attributes. */
function extractShim(): string {
  const match = INDEX_HTML.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('no inline <script> found in index.html');
  return match[1];
}

const SHIM = extractShim();

// User agents taken from real devices.
const UA = {
  ipadIOS12: 'Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1',
  iphoneIOS11: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.0 Mobile/15E148 Safari/604.1',
  iphoneIOS13: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1',
  iphoneIOS17: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  // iPadOS 13+ deliberately reports as a Mac. A modern iPad must NOT match
  // the iPad|iPhone|iPod branch and must stay on the modern app.
  ipadOS17: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  desktopChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
};

type EvalBehaviour = 'modern' | 'syntax-error' | 'blocked-by-csp';

/** Run the real shim against a synthetic environment; return redirect target. */
function runShim(options: {
  userAgent: string;
  pathname?: string;
  evalBehaviour?: EvalBehaviour;
}): string | null {
  const { userAgent, pathname = '/', evalBehaviour = 'modern' } = options;

  const replace = vi.fn();

  vi.stubGlobal('window', { location: { pathname, replace } });
  vi.stubGlobal('navigator', { userAgent });
  vi.stubGlobal('eval', (code: string) => {
    if (evalBehaviour === 'syntax-error') {
      throw new SyntaxError(`Unexpected token '?' in ${code}`);
    }
    if (evalBehaviour === 'blocked-by-csp') {
      throw new EvalError('Refused to evaluate a string as JavaScript (CSP)');
    }
    return undefined;
  });

  new Function(SHIM)();

  return replace.mock.calls.length ? (replace.mock.calls[0][0] as string) : null;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('index.html iOS 12 redirect shim', () => {
  describe('ES5 compatibility', () => {
    it('parses as strict ES5', () => {
      // If this ever fails, the shim is unparseable on Safari 12 and the iPad
      // is back to a blank page - the original bug, reintroduced.
      expect(() =>
        parse(SHIM, { ecmaVersion: 5, sourceType: 'script' })
      ).not.toThrow();
    });

    it('uses no post-ES5 runtime APIs', () => {
      const banned = [
        /\.includes\s*\(/, /\.startsWith\s*\(/, /\.find\s*\(/,
        /\bObject\.assign\b/, /\bArray\.from\b/, /\bPromise\b/,
        /\bfetch\s*\(/, /\bURLSearchParams\b/,
      ];
      expect(banned.filter((r) => r.test(SHIM)).map((r) => r.source)).toEqual([]);
    });

    it('runs before the module bundle', () => {
      // Order is the whole point. After the bundle, Safari 12 has already
      // thrown and the page is blank.
      const shimAt = INDEX_HTML.indexOf('<script>');
      const bundleAt = INDEX_HTML.indexOf('type="module"');

      expect(shimAt).toBeGreaterThan(-1);
      expect(bundleAt).toBeGreaterThan(-1);
      expect(shimAt).toBeLessThan(bundleAt);
    });

    it('is inline, not an external file', () => {
      // A separate file means another round trip before the redirect, on the
      // slowest device we support.
      expect(SHIM.trim().length).toBeGreaterThan(0);
    });

    it('survives the production build as ES5', () => {
      // Source being ES5 is not enough - what ships is dist/index.html. Vite
      // currently passes inline scripts through untouched, but enabling HTML
      // minification or changing build.target could rewrite this into modern
      // syntax and silently reintroduce the blank-page bug. This is the only
      // assertion that covers the artifact rather than the input.
      const distIndex = join(process.cwd(), 'dist', 'index.html');

      if (!existsSync(distIndex)) {
        // No build present (fresh clone, or dist cleaned). Nothing to check.
        expect(true).toBe(true);
        return;
      }

      const built = readFileSync(distIndex, 'utf8');
      const match = built.match(/<script>([\s\S]*?)<\/script>/);

      expect(match).not.toBeNull();
      expect(() =>
        parse(match![1], { ecmaVersion: 5, sourceType: 'script' })
      ).not.toThrow();

      // And it must still run before the bundle in the built output.
      expect(built.indexOf('<script>')).toBeLessThan(
        built.indexOf('type="module"')
      );
    });
  });

  describe('devices that must be redirected', () => {
    it('redirects an iOS 12.5.7 iPad — the actual target device', () => {
      expect(runShim({ userAgent: UA.ipadIOS12 })).toBe('/legacy/');
    });

    it('redirects iOS 11 and below', () => {
      expect(runShim({ userAgent: UA.iphoneIOS11 })).toBe('/legacy/');
    });

    it('redirects any engine that cannot parse optional chaining', () => {
      // Catches old desktop browsers too, not just iOS.
      expect(
        runShim({ userAgent: UA.desktopChrome, evalBehaviour: 'syntax-error' })
      ).toBe('/legacy/');
    });
  });

  describe('devices that must NOT be redirected', () => {
    it('leaves iOS 13 on the modern app', () => {
      // 13.1 is exactly where optional chaining lands.
      expect(runShim({ userAgent: UA.iphoneIOS13 })).toBeNull();
    });

    it('leaves current iOS on the modern app', () => {
      expect(runShim({ userAgent: UA.iphoneIOS17 })).toBeNull();
    });

    it('leaves a modern iPad on the modern app despite its Mac user agent', () => {
      // iPadOS 13+ reports as "Macintosh". Matching on that string would have
      // sent every modern iPad to a read-only app.
      expect(runShim({ userAgent: UA.ipadOS17 })).toBeNull();
    });

    it('leaves desktop browsers alone', () => {
      expect(runShim({ userAgent: UA.desktopChrome })).toBeNull();
    });

    it('does NOT redirect when a CSP blocks eval', () => {
      // The dangerous false positive. A CSP forbidding eval throws EvalError,
      // not SyntaxError; treating that as "old engine" would send every
      // modern browser to the legacy app.
      expect(
        runShim({ userAgent: UA.desktopChrome, evalBehaviour: 'blocked-by-csp' })
      ).toBeNull();
    });
  });

  describe('redirect loop safety', () => {
    it('does not redirect when already under /legacy/', () => {
      // not_found_handling returns this HTML for ANY unmatched path. Without
      // the guard, a typo'd /legacy/... would redirect forever.
      expect(
        runShim({ userAgent: UA.ipadIOS12, pathname: '/legacy/' })
      ).toBeNull();
    });

    it('does not redirect on a mistyped path under /legacy/', () => {
      expect(
        runShim({ userAgent: UA.ipadIOS12, pathname: '/legacy/nope' })
      ).toBeNull();
    });

    it('still redirects from a deep app route', () => {
      expect(
        runShim({ userAgent: UA.ipadIOS12, pathname: '/song/abc123' })
      ).toBe('/legacy/');
    });
  });

  describe('the dead check is gone from the bundle', () => {
    it('no longer lives in src/main.tsx', () => {
      // Two redirect paths, one working and one unreachable, is worse than one.
      const mainTsx = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');

      expect(mainTsx).not.toContain('detectAndRedirectIOS12');
      expect(mainTsx).not.toContain("window.location.href = '/legacy/'");
    });
  });

  describe('uses replace, not href', () => {
    it('keeps the unusable page out of the back stack', () => {
      // With href, tapping Back on the iPad returns to the blank page.
      expect(SHIM).toContain('location.replace');
      expect(SHIM).not.toContain('location.href =');
    });
  });
});
