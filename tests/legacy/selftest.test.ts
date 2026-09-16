/**
 * Tests for the on-device self test.
 *
 * The self test is the debugger of last resort for an iPad with no console:
 * if it reports a false PASS, or crashes, it is worse than not existing. So it
 * gets the same treatment as the app - the shipped ES5 is executed verbatim.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LEGACY_DIR = join(process.cwd(), 'public', 'legacy');
const DATA_LAYER_SRC = readFileSync(join(LEGACY_DIR, 'firestore-rest.js'), 'utf8');
const SELFTEST_SRC = readFileSync(join(LEGACY_DIR, 'selftest.js'), 'utf8');

type FakeResponse = { status: number; json?: unknown; body?: string };

class FakeXHR {
  static queue: FakeResponse[] = [];
  static requests: string[] = [];

  url = '';
  method = '';
  status = 0;
  responseText = '';
  readyState = 0;
  timeout = 0;
  onreadystatechange: (() => void) | null = null;
  ontimeout: (() => void) | null = null;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  send() {
    FakeXHR.requests.push(this.url);
    const next = FakeXHR.queue.shift();
    if (!next) throw new Error(`FakeXHR: no queued response for ${this.url}`);
    this.status = next.status;
    this.responseText =
      next.json !== undefined ? JSON.stringify(next.json) : next.body ?? '';
    this.readyState = 4;
    if (this.onreadystatechange) this.onreadystatechange();
  }
}

function songDoc(id: string, title: string, artist: string) {
  return {
    name: `projects/p/databases/(default)/documents/songs/${id}`,
    fields: {
      title: { stringValue: title },
      artist: { stringValue: artist },
      chordProContent: { stringValue: '[C]la la' },
      language: { stringValue: 'English' },
      difficulty: { stringValue: 'Easy' },
    },
  };
}

/** Recreate selftest.html's DOM and script order. */
function bootSelfTest(withDataLayer = true) {
  document.head.innerHTML = '';
  document.body.innerHTML =
    '<div id="results"><div class="banner running">Starting...</div></div>';

  delete (window as unknown as Record<string, unknown>).PulsarFirestoreREST;
  if (withDataLayer) new Function(DATA_LAYER_SRC)();
  new Function(SELFTEST_SRC)();
}

function resultsText() {
  return document.getElementById('results')?.textContent ?? '';
}

function rowsBy(cls: string) {
  return Array.from(document.querySelectorAll(`li.${cls}`)).map(
    (li) => li.querySelector('.name')?.textContent ?? ''
  );
}

beforeEach(() => {
  FakeXHR.queue = [];
  FakeXHR.requests = [];
  vi.stubGlobal('XMLHttpRequest', FakeXHR);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

describe('legacy self test', () => {
  it('reports all checks passed when everything works', () => {
    FakeXHR.queue.push({
      status: 200,
      json: {
        documents: [
          songDoc('a', 'Africa', 'Toto'),
          songDoc('z', 'Zebra', 'Someone'),
        ],
      },
    });

    bootSelfTest();

    expect(resultsText()).toContain('ALL CHECKS PASSED');
    expect(rowsBy('fail')).toEqual([]);
    expect(resultsText()).toContain('2 songs in');
  });

  it('never reports a pass when the fetch fails', () => {
    // The failure mode that matters most: a green banner on a broken app
    // would send Julian chasing the wrong thing on a device he cannot debug.
    FakeXHR.queue.push({ status: 0, body: '' });

    bootSelfTest();

    expect(resultsText()).not.toContain('ALL CHECKS PASSED');
    expect(resultsText()).toContain('CHECK');
    expect(rowsBy('fail')).toContain('Fetched songs from Firestore');
  });

  it('surfaces the error kind and message so the layer is identifiable', () => {
    FakeXHR.queue.push({
      status: 200,
      json: { error: { status: 'PERMISSION_DENIED', message: 'Missing permissions' } },
    });

    bootSelfTest();

    expect(resultsText()).toContain('Missing permissions');
    expect(resultsText()).toContain('server');
  });

  it('identifies a missing data layer rather than blaming the network', () => {
    bootSelfTest(false);

    expect(rowsBy('fail')).toContain('Data layer script loaded');
    expect(resultsText()).toMatch(/did not load or failed to parse/i);

    // And it must not have attempted a fetch it cannot make.
    expect(FakeXHR.requests).toHaveLength(0);
  });

  it('reports an empty library as a failure, not a pass', () => {
    FakeXHR.queue.push({ status: 200, json: { documents: [] } });

    bootSelfTest();

    expect(resultsText()).not.toContain('ALL CHECKS PASSED');
    expect(rowsBy('fail')).toContain('Fetched songs from Firestore');
  });

  it('records the user agent and engine as info, not as failures', () => {
    FakeXHR.queue.push({
      status: 200,
      json: { documents: [songDoc('a', 'Africa', 'Toto')] },
    });

    bootSelfTest();

    // These are diagnostics. If they counted as failures the banner would be
    // red on a perfectly healthy device.
    expect(rowsBy('warn')).toContain('User agent');
    expect(rowsBy('warn')).toContain('JS engine');
    expect(resultsText()).toContain('ALL CHECKS PASSED');
  });

  it('escapes diagnostic text instead of injecting it', () => {
    // The user agent is attacker-influenced in principle and is rendered
    // verbatim; it must not become markup.
    Object.defineProperty(window.navigator, 'userAgent', {
      value: '<img src=x onerror="window.__pwned=1">',
      configurable: true,
    });
    FakeXHR.queue.push({
      status: 200,
      json: { documents: [songDoc('a', 'Africa', 'Toto')] },
    });

    bootSelfTest();

    expect(document.querySelector('#results img')).toBeNull();
    expect(
      (window as unknown as { __pwned?: number }).__pwned
    ).toBeUndefined();
  });

  it('asserts the request is keyless, masked and cache-busted', () => {
    FakeXHR.queue.push({
      status: 200,
      json: { documents: [songDoc('a', 'Africa', 'Toto')] },
    });

    bootSelfTest();

    const names = rowsBy('pass');
    expect(names).toContain('Request is read-only and keyless');
    expect(names).toContain('Request masks to rendered fields only');
    expect(names).toContain('Request bypasses the browser cache');
  });

  it('issues only a GET, so the self test cannot mutate anything', () => {
    FakeXHR.queue.push({
      status: 200,
      json: { documents: [songDoc('a', 'Africa', 'Toto')] },
    });

    const methods: string[] = [];
    class RecordingXHR extends FakeXHR {
      open(method: string, url: string) {
        methods.push(method);
        super.open(method, url);
      }
    }
    vi.stubGlobal('XMLHttpRequest', RecordingXHR);

    bootSelfTest();

    expect(methods).toEqual(['GET']);
  });

  it('is wired up correctly in selftest.html', () => {
    const html = readFileSync(join(LEGACY_DIR, 'selftest.html'), 'utf8');

    const dataLayerAt = html.indexOf('src="/legacy/firestore-rest.js"');
    const selfTestAt = html.indexOf('src="/legacy/selftest.js"');

    expect(dataLayerAt).toBeGreaterThan(-1);
    expect(selfTestAt).toBeGreaterThan(dataLayerAt);
    expect(html).toContain('id="results"');

    // Styles are inlined on purpose: if the app's stylesheet were the broken
    // thing, this page still has to be legible enough to say so. So it must
    // pull in no external stylesheet of its own.
    expect(html).not.toMatch(/<link[^>]+stylesheet/i);
    expect(html).not.toMatch(/type=["']module["']/);
  });
});
