/**
 * End-to-end test of the legacy app in a DOM.
 *
 * Loads the two shipped ES5 scripts exactly as index.html does - no transpile,
 * no module wrapper - then drives the real init() path with a stubbed
 * XMLHttpRequest. This is the closest we can get to the iPad without the iPad:
 * it proves the scripts execute, the data layer hands songs to the UI, and the
 * list actually renders.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LEGACY_DIR = join(process.cwd(), 'public', 'legacy');
const DATA_LAYER_SRC = readFileSync(join(LEGACY_DIR, 'firestore-rest.js'), 'utf8');
const APP_SRC = readFileSync(join(LEGACY_DIR, 'app.js'), 'utf8');

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

function songDoc(id: string, title: string, artist: string, content = '[C]la') {
  return {
    name: `projects/p/databases/(default)/documents/songs/${id}`,
    fields: {
      title: { stringValue: title },
      artist: { stringValue: artist },
      chordProContent: { stringValue: content },
      language: { stringValue: 'English' },
      difficulty: { stringValue: 'Easy' },
    },
  };
}

/** Recreate index.html's DOM and script order, then boot the app. */
function bootLegacyApp() {
  document.body.innerHTML =
    '<div id="app"><div id="loading">Loading Pulsar Songbook...</div></div>';
  new Function(DATA_LAYER_SRC)();
  new Function(APP_SRC)();
}

/** Boot app.js alone, simulating firestore-rest.js failing to load. */
function bootAppWithoutDataLayer() {
  document.body.innerHTML =
    '<div id="app"><div id="loading">Loading Pulsar Songbook...</div></div>';
  delete (window as unknown as Record<string, unknown>).PulsarFirestoreREST;
  new Function(APP_SRC)();
}

beforeEach(() => {
  FakeXHR.queue = [];
  FakeXHR.requests = [];
  vi.stubGlobal('XMLHttpRequest', FakeXHR);
  localStorage.clear();
  // init() logs on boot; keep the suite output readable.
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('legacy app boot', () => {
  it('renders the song list from Firestore REST data', () => {
    FakeXHR.queue.push({
      status: 200,
      json: {
        documents: [
          songDoc('s2', 'Wish You Were Here', 'Pink Floyd'),
          songDoc('s1', 'Bad Moon Rising', 'CCR'),
        ],
      },
    });

    bootLegacyApp();

    const html = document.body.innerHTML;
    expect(html).toContain('Bad Moon Rising');
    expect(html).toContain('Wish You Were Here');
    expect(html).toContain('Pink Floyd');

    // Sorted by title, so CCR's song comes first.
    expect(html.indexOf('Bad Moon Rising')).toBeLessThan(
      html.indexOf('Wish You Were Here')
    );

    // The loading placeholder is gone and the real list is mounted.
    expect(document.getElementById('loading')).toBeNull();
    expect(document.querySelectorAll('.song-item')).toHaveLength(2);
  });

  it('requests songs from Firestore, not IndexedDB', () => {
    FakeXHR.queue.push({ status: 200, json: { documents: [] } });

    bootLegacyApp();

    expect(FakeXHR.requests).toHaveLength(1);
    expect(FakeXHR.requests[0]).toContain('firestore.googleapis.com');
    expect(FakeXHR.requests[0]).toContain('/documents/songs');
  });

  it('never opens the old IndexedDB database', () => {
    // The previous data path opened 'PulsarSongbook' and dead-ended on the
    // iPad because the modern app can never run there to create it.
    const open = vi.fn();
    vi.stubGlobal('indexedDB', { open });
    FakeXHR.queue.push({ status: 200, json: { documents: [] } });

    bootLegacyApp();

    expect(open).not.toHaveBeenCalled();
  });

  it('shows a connection error with a retry button when offline', () => {
    FakeXHR.queue.push({ status: 0, body: '' });

    bootLegacyApp();

    const html = document.body.innerHTML;
    expect(html).toContain('Error Loading Songs');
    expect(html).toMatch(/internet connection/i);

    const retry = document.getElementById('retry-load');
    expect(retry).not.toBeNull();
  });

  it('recovers when the retry button succeeds', () => {
    FakeXHR.queue.push({ status: 0, body: '' });
    bootLegacyApp();
    expect(document.body.innerHTML).toContain('Error Loading Songs');

    FakeXHR.queue.push({
      status: 200,
      json: { documents: [songDoc('s1', 'Comeback Kid', 'The Retries')] },
    });

    (document.getElementById('retry-load') as HTMLButtonElement).click();

    expect(document.body.innerHTML).toContain('Comeback Kid');
    expect(document.getElementById('retry-load')).toBeNull();
  });

  it('no longer tells the user to open the main app', () => {
    // That advice was unreachable on iOS 12 - the modern bundle cannot parse
    // there, so the link led to a blank page.
    FakeXHR.queue.push({ status: 0, body: '' });

    bootLegacyApp();

    expect(document.body.innerHTML).not.toMatch(/Open Main App/i);
  });

  it('reports an empty library without claiming an error state', () => {
    FakeXHR.queue.push({ status: 200, json: { documents: [] } });

    bootLegacyApp();

    expect(document.body.innerHTML).toMatch(/No songs found/i);
  });

  it('opens a song when its row is tapped', () => {
    FakeXHR.queue.push({
      status: 200,
      json: {
        documents: [songDoc('s1', 'Bad Moon Rising', 'CCR', '[D]I see a bad moon')],
      },
    });

    bootLegacyApp();

    const row = document.querySelector('.song-item') as HTMLElement;
    row.click();

    // Song view replaces the list and renders the ChordPro body.
    expect(document.querySelectorAll('.song-item')).toHaveLength(0);
    expect(document.body.innerHTML).toContain('Bad Moon Rising');
  });

  it('does not blame the network for a server or rules error', () => {
    // A tightened firestore.rules used to tell the user to go check their
    // Wi-Fi, sending them to chase a router problem that does not exist.
    FakeXHR.queue.push({
      status: 200,
      json: {
        error: { status: 'PERMISSION_DENIED', message: 'Missing permissions' },
      },
    });

    bootLegacyApp();

    const html = document.body.innerHTML;
    expect(html).toContain('Missing permissions');
    expect(html).toMatch(/problem with the song library, not your connection/i);
    expect(html).not.toMatch(/check your wi-?fi/i);
  });

  it('does not blame the network for an HTTP error either', () => {
    FakeXHR.queue.push({ status: 503, body: 'unavailable' });

    bootLegacyApp();

    expect(document.body.innerHTML).toContain('HTTP 503');
    expect(document.body.innerHTML).not.toMatch(/check your wi-?fi/i);
  });

  it('does not blame the network for an empty library', () => {
    FakeXHR.queue.push({ status: 200, json: { documents: [] } });

    bootLegacyApp();

    expect(document.body.innerHTML).toMatch(/loaded, but it is empty/i);
    expect(document.body.innerHTML).not.toMatch(/check your wi-?fi/i);
  });

  it('offers Reload, not a dead Try Again, when the data layer is missing', () => {
    // Retrying cannot succeed here: the script that does the fetching is the
    // thing that failed to load, so a retry loops on the same error forever.
    bootAppWithoutDataLayer();

    const button = document.getElementById('retry-load');
    expect(button?.textContent).toBe('Reload');
    expect(document.body.innerHTML).toMatch(/loaded incompletely/i);

    // And it never attempted a fetch, so nothing is pending.
    expect(FakeXHR.requests).toHaveLength(0);
  });

  it('escapes quotes so the search box cannot break out of its attribute', () => {
    // escapeHtml is textContent -> innerHTML, which escapes & < > but NOT
    // quotes - and the search value and song id are interpolated into
    // double-quoted attributes. A bare " escaped into tag context.
    FakeXHR.queue.push({
      status: 200,
      json: { documents: [songDoc('s1', 'Normal Song', 'Someone')] },
    });

    bootLegacyApp();

    const search = document.getElementById('search-input') as HTMLInputElement;
    search.value = '" onfocus="window.__pwned=1" x="';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    const rerendered = document.getElementById(
      'search-input'
    ) as HTMLInputElement;

    // The payload survives as a literal value, with no injected attribute.
    expect(rerendered.getAttribute('onfocus')).toBeNull();
    expect(rerendered.value).toContain('onfocus');
    expect(
      (window as unknown as { __pwned?: number }).__pwned
    ).toBeUndefined();
  });

  it('escapes quotes in a song id used as an attribute value', () => {
    // Firestore auto-ids are alphanumeric, but document ids do permit quotes.
    FakeXHR.queue.push({
      status: 200,
      json: {
        documents: [
          {
            name:
              'projects/p/databases/(default)/documents/songs/' +
              'x" onclick="window.__pwned=1" y="',
            fields: { title: { stringValue: 'Sneaky' } },
          },
        ],
      },
    });

    bootLegacyApp();

    const row = document.querySelector('.song-item');
    expect(row?.getAttribute('onclick')).toBeNull();
    expect(
      (window as unknown as { __pwned?: number }).__pwned
    ).toBeUndefined();
  });

  it('escapes HTML coming from Firestore instead of injecting it', () => {
    // The data source changed, so re-verify the escaping contract end to end.
    // Song docs are writable by approved users, but a stray < in a title
    // should never become markup either way.
    FakeXHR.queue.push({
      status: 200,
      json: {
        documents: [
          songDoc(
            'x1',
            '<img src=x onerror="window.__pwned=1">',
            '<b>Bold Artist</b>',
            '[C]<script>window.__pwned=2</script>'
          ),
        ],
      },
    });

    bootLegacyApp();

    expect(document.querySelector('.song-item img')).toBeNull();
    expect(document.querySelector('.song-item b')).toBeNull();
    expect(
      (window as unknown as { __pwned?: number }).__pwned
    ).toBeUndefined();

    // The raw text is still shown to the user, just inert.
    expect(document.body.textContent).toContain('<img src=x');

    // And the same holds once the song view renders the ChordPro body.
    (document.querySelector('.song-item') as HTMLElement).click();
    expect(document.querySelector('.chord-sheet script')).toBeNull();
    expect(
      (window as unknown as { __pwned?: number }).__pwned
    ).toBeUndefined();
  });

  it('filters the list from the search box', () => {
    FakeXHR.queue.push({
      status: 200,
      json: {
        documents: [
          songDoc('s1', 'Bad Moon Rising', 'CCR'),
          songDoc('s2', 'Wish You Were Here', 'Pink Floyd'),
        ],
      },
    });

    bootLegacyApp();

    const search = document.getElementById('search-input') as HTMLInputElement;
    search.value = 'floyd';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    const html = document.body.innerHTML;
    expect(html).toContain('Wish You Were Here');
    expect(html).not.toContain('Bad Moon Rising');
  });
});
