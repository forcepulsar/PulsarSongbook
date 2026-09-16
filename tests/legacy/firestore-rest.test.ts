/**
 * Unit tests for the legacy app's Firestore REST data layer.
 *
 * The real file is plain ES5 loaded via a <script> tag, so these tests execute
 * the shipped source verbatim (no transpile, no import) and then read the
 * global it installs. That way the tests exercise exactly what the iPad runs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = readFileSync(
  join(process.cwd(), 'public', 'legacy', 'firestore-rest.js'),
  'utf8'
);

interface LegacySong {
  id: string;
  title: string;
  artist: string;
  chordProContent: string;
  language: string;
  difficulty: string;
}

interface FirestoreRest {
  PROJECT_ID: string;
  PAGE_SIZE: number;
  buildUrl: (pageToken?: string | null) => string;
  unwrapValue: (value: unknown) => unknown;
  extractId: (name: string) => string;
  mapDocument: (doc: unknown) => LegacySong | null;
  sortByTitle: (songs: LegacySong[]) => LegacySong[];
  fetchAllSongs: (
    onSuccess: (songs: LegacySong[]) => void,
    onError: (message: string) => void
  ) => void;
}

type FakeResponse =
  | { status: number; body: string }
  | { status: number; json: unknown }
  | { timeout: true };

/** Minimal XMLHttpRequest stand-in that responds synchronously from a queue. */
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
    if (!next) {
      throw new Error(`FakeXHR: no queued response for ${this.url}`);
    }

    if ('timeout' in next) {
      this.readyState = 4;
      if (this.ontimeout) this.ontimeout();
      return;
    }

    this.status = next.status;
    this.responseText =
      'json' in next ? JSON.stringify(next.json) : next.body;
    this.readyState = 4;
    if (this.onreadystatechange) this.onreadystatechange();
  }
}

/** Build a Firestore REST document for a song. */
function doc(id: string, fields: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    mapped[key] = { stringValue: value };
  }
  return {
    name: `projects/p/databases/(default)/documents/songs/${id}`,
    fields: mapped,
  };
}

function loadDataLayer(): FirestoreRest {
  // The file ends with `})(window)`, so executing it installs the global.
  new Function(SOURCE)();
  const api = (window as unknown as { PulsarFirestoreREST?: FirestoreRest })
    .PulsarFirestoreREST;
  if (!api) throw new Error('firestore-rest.js did not install its global');
  return api;
}

let api: FirestoreRest;

beforeEach(() => {
  FakeXHR.queue = [];
  FakeXHR.requests = [];
  vi.stubGlobal('XMLHttpRequest', FakeXHR);
  api = loadDataLayer();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('unwrapValue', () => {
  it('unwraps each Firestore scalar type', () => {
    expect(api.unwrapValue({ stringValue: 'hello' })).toBe('hello');
    expect(api.unwrapValue({ booleanValue: true })).toBe(true);
    expect(api.unwrapValue({ doubleValue: 1.5 })).toBe(1.5);
    expect(api.unwrapValue({ timestampValue: '2026-01-01T00:00:00Z' })).toBe(
      '2026-01-01T00:00:00Z'
    );
    expect(api.unwrapValue({ nullValue: null })).toBeNull();
  });

  it('parses integers, which Firestore sends as strings', () => {
    expect(api.unwrapValue({ integerValue: '42' })).toBe(42);
  });

  it('preserves empty strings rather than coercing them away', () => {
    // An empty artist must stay '' and not become null, or the UI would print
    // "null" under the title.
    expect(api.unwrapValue({ stringValue: '' })).toBe('');
  });

  it('unwraps arrays and maps recursively', () => {
    expect(
      api.unwrapValue({
        arrayValue: { values: [{ stringValue: 'a' }, { integerValue: '2' }] },
      })
    ).toEqual(['a', 2]);

    expect(
      api.unwrapValue({
        mapValue: { fields: { nested: { stringValue: 'deep' } } },
      })
    ).toEqual({ nested: 'deep' });
  });

  it('returns null for missing or unknown values', () => {
    expect(api.unwrapValue(undefined)).toBeNull();
    expect(api.unwrapValue({})).toBeNull();
    expect(api.unwrapValue({ geoPointValue: {} })).toBeNull();
  });
});

describe('extractId', () => {
  it('takes the last segment of a resource name', () => {
    expect(
      api.extractId('projects/p/databases/(default)/documents/songs/abc123')
    ).toBe('abc123');
  });

  it('returns an empty string for a missing name', () => {
    expect(api.extractId('')).toBe('');
  });
});

describe('mapDocument', () => {
  it('maps a full document to the legacy song shape', () => {
    const song = api.mapDocument(
      doc('s1', {
        title: 'Bad Moon Rising',
        artist: 'CCR',
        chordProContent: '[D]I see a bad moon',
        language: 'English',
        difficulty: 'Easy',
      })
    );

    expect(song).toEqual({
      id: 's1',
      title: 'Bad Moon Rising',
      artist: 'CCR',
      chordProContent: '[D]I see a bad moon',
      language: 'English',
      difficulty: 'Easy',
    });
  });

  it('falls back to Untitled and empty strings, matching the old mapper', () => {
    const song = api.mapDocument({
      name: 'projects/p/databases/(default)/documents/songs/s2',
    });

    expect(song).toEqual({
      id: 's2',
      title: 'Untitled',
      artist: '',
      chordProContent: '',
      language: '',
      difficulty: '',
    });
  });

  it('ignores extra fields the legacy UI does not render', () => {
    const song = api.mapDocument(
      doc('s3', { title: 'X', myLevel: 'Learning', priority: 'High' })
    );

    expect(Object.keys(song as object).sort()).toEqual([
      'artist',
      'chordProContent',
      'difficulty',
      'id',
      'language',
      'title',
    ]);
  });

  it('coerces a non-string title into the Untitled fallback', () => {
    const song = api.mapDocument({
      name: 'projects/p/databases/(default)/documents/songs/s4',
      fields: { title: { integerValue: '7' } },
    });

    expect(song?.title).toBe('Untitled');
  });

  it('returns null for a null document', () => {
    expect(api.mapDocument(null)).toBeNull();
  });
});

describe('buildUrl', () => {
  it('targets the songs collection with the max page size', () => {
    const url = api.buildUrl(null);
    expect(url).toContain(`/projects/${api.PROJECT_ID}/databases/(default)/documents/songs`);
    expect(url).toContain(`pageSize=${api.PAGE_SIZE}`);
  });

  it('sends no API key, relying on public read rules', () => {
    // firestore.rules grants `allow read: if true` on /songs. Keeping the key
    // out means there is no credential to rotate or leak in a static file.
    expect(api.buildUrl(null)).not.toContain('key=');
  });

  it('url-encodes the page token', () => {
    expect(api.buildUrl('a b/c+d')).toContain('pageToken=a%20b%2Fc%2Bd');
  });
});

describe('sortByTitle', () => {
  it('sorts case-insensitively', () => {
    const sorted = api.sortByTitle([
      { title: 'zebra' },
      { title: 'Apple' },
      { title: 'banana' },
    ] as LegacySong[]);

    expect(sorted.map((s) => s.title)).toEqual(['Apple', 'banana', 'zebra']);
  });
});

describe('fetchAllSongs', () => {
  it('maps and sorts a single page', () => {
    FakeXHR.queue.push({
      status: 200,
      json: {
        documents: [
          doc('b', { title: 'Wish You Were Here' }),
          doc('a', { title: 'Another Brick' }),
        ],
      },
    });

    const onSuccess = vi.fn();
    const onError = vi.fn();
    api.fetchAllSongs(onSuccess, onError);

    expect(onError).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess.mock.calls[0][0].map((s: LegacySong) => s.title)).toEqual([
      'Another Brick',
      'Wish You Were Here',
    ]);
  });

  it('follows nextPageToken and concatenates every page', () => {
    FakeXHR.queue.push({
      status: 200,
      json: {
        documents: [doc('a', { title: 'A' })],
        nextPageToken: 'page-2',
      },
    });
    FakeXHR.queue.push({
      status: 200,
      json: { documents: [doc('b', { title: 'B' })] },
    });

    const onSuccess = vi.fn();
    api.fetchAllSongs(onSuccess, vi.fn());

    expect(FakeXHR.requests).toHaveLength(2);
    expect(FakeXHR.requests[1]).toContain('pageToken=page-2');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess.mock.calls[0][0]).toHaveLength(2);
  });

  it('stops after MAX_PAGES if the API keeps returning a token', () => {
    // Guards against a repeating token pinning the browser in a fetch loop.
    for (let i = 0; i < 60; i++) {
      FakeXHR.queue.push({
        status: 200,
        json: {
          documents: [doc(`s${i}`, { title: `Song ${i}` })],
          nextPageToken: 'always-more',
        },
      });
    }

    const onSuccess = vi.fn();
    api.fetchAllSongs(onSuccess, vi.fn());

    expect(FakeXHR.requests).toHaveLength(50);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('skips documents with no id instead of rendering blanks', () => {
    FakeXHR.queue.push({
      status: 200,
      json: {
        documents: [
          { fields: { title: { stringValue: 'Orphan' } } },
          doc('good', { title: 'Real Song' }),
        ],
      },
    });

    const onSuccess = vi.fn();
    api.fetchAllSongs(onSuccess, vi.fn());

    expect(onSuccess.mock.calls[0][0].map((s: LegacySong) => s.title)).toEqual([
      'Real Song',
    ]);
  });

  it('reports an empty library as success, not an error', () => {
    FakeXHR.queue.push({ status: 200, json: {} });

    const onSuccess = vi.fn();
    const onError = vi.fn();
    api.fetchAllSongs(onSuccess, onError);

    expect(onError).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith([]);
  });

  it('treats status 0 as a connectivity problem', () => {
    // Safari reports offline / DNS / TLS / CORS failures as status 0.
    FakeXHR.queue.push({ status: 0, body: '' });

    const onError = vi.fn();
    api.fetchAllSongs(vi.fn(), onError);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatch(/internet connection/i);
  });

  it('surfaces an HTTP error with its status', () => {
    FakeXHR.queue.push({ status: 503, body: 'unavailable' });

    const onError = vi.fn();
    api.fetchAllSongs(vi.fn(), onError);

    expect(onError.mock.calls[0][0]).toContain('HTTP 503');
  });

  it('handles a body that is not valid JSON', () => {
    FakeXHR.queue.push({ status: 200, body: '<html>nope</html>' });

    const onError = vi.fn();
    api.fetchAllSongs(vi.fn(), onError);

    expect(onError.mock.calls[0][0]).toMatch(/could not read/i);
  });

  it('surfaces a Firestore error payload returned with a 200', () => {
    FakeXHR.queue.push({
      status: 200,
      json: { error: { status: 'PERMISSION_DENIED', message: 'Missing permissions' } },
    });

    const onError = vi.fn();
    api.fetchAllSongs(vi.fn(), onError);

    expect(onError.mock.calls[0][0]).toContain('Missing permissions');
  });

  it('reports a timeout distinctly', () => {
    FakeXHR.queue.push({ timeout: true });

    const onError = vi.fn();
    api.fetchAllSongs(vi.fn(), onError);

    expect(onError.mock.calls[0][0]).toMatch(/too long/i);
  });

  it('stops paginating when a later page fails', () => {
    FakeXHR.queue.push({
      status: 200,
      json: { documents: [doc('a', { title: 'A' })], nextPageToken: 'page-2' },
    });
    FakeXHR.queue.push({ status: 500, body: 'boom' });

    const onSuccess = vi.fn();
    const onError = vi.fn();
    api.fetchAllSongs(onSuccess, onError);

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('issues only GET requests, so it can never write', () => {
    FakeXHR.queue.push({ status: 200, json: { documents: [] } });

    const methods: string[] = [];
    class RecordingXHR extends FakeXHR {
      open(method: string, url: string) {
        methods.push(method);
        super.open(method, url);
      }
    }
    vi.stubGlobal('XMLHttpRequest', RecordingXHR);

    api.fetchAllSongs(vi.fn(), vi.fn());

    expect(methods).toEqual(['GET']);
  });
});
