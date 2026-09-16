/**
 * Pulsar Songbook - Legacy Firestore REST data layer
 *
 * Reads songs straight from the Firestore REST API. No Firebase SDK, no
 * modules, no build step: this file is served verbatim and must parse as
 * strict ES5 so Safari 12 (iOS 12.5.7) can run it.
 *
 * WHY REST INSTEAD OF IndexedDB: the legacy app used to read the `songs`
 * store of the `PulsarSongbook` IndexedDB database, which the modern app
 * filled. The modern app now writes songs only to Firestore, and it cannot
 * run on iOS 12 anyway, so on a real iPad that store is never created. REST
 * is the only data path that works on the target device.
 *
 * WHY NO API KEY: firestore.rules grants `allow read: if true` on /songs, so
 * anonymous reads are permitted and Google does not require a key for them.
 * Only the project id is needed, and that is not a secret - it appears in
 * every Firestore request the modern app's browser already makes.
 *
 * READ-ONLY BY CONSTRUCTION: this file issues GET requests only. There is no
 * write path here, so the legacy app can never update or delete a song.
 */

(function(global) {
  'use strict';

  // Firestore project that holds the songs. Public by design (see header).
  var PROJECT_ID = 'pulsar-songbook-3a929';

  var BASE_URL = 'https://firestore.googleapis.com/v1/projects/' +
    PROJECT_ID + '/databases/(default)/documents/songs';

  // Firestore caps documents.list at 300 per page. Ask for the max so the
  // common case is a single round trip (the library is ~152 songs today).
  var PAGE_SIZE = 300;

  // Stop runaway pagination if the API ever returns a repeating token.
  var MAX_PAGES = 50;

  var REQUEST_TIMEOUT_MS = 30000;

  /**
   * Convert one Firestore typed value into a plain JS value.
   * Firestore returns { stringValue: "x" } rather than "x".
   */
  function unwrapValue(value) {
    if (!value || typeof value !== 'object') {
      return null;
    }

    if (typeof value.stringValue !== 'undefined') {
      return value.stringValue;
    }
    if (typeof value.booleanValue !== 'undefined') {
      return value.booleanValue;
    }
    if (typeof value.integerValue !== 'undefined') {
      // Firestore sends integers as strings to survive 64-bit precision.
      return parseInt(value.integerValue, 10);
    }
    if (typeof value.doubleValue !== 'undefined') {
      return value.doubleValue;
    }
    if (typeof value.timestampValue !== 'undefined') {
      return value.timestampValue;
    }
    if (typeof value.nullValue !== 'undefined') {
      return null;
    }

    if (value.arrayValue) {
      var raw = value.arrayValue.values || [];
      var out = [];
      for (var i = 0; i < raw.length; i++) {
        out.push(unwrapValue(raw[i]));
      }
      return out;
    }

    if (value.mapValue) {
      var fields = value.mapValue.fields || {};
      var map = {};
      var keys = Object.keys(fields);
      for (var k = 0; k < keys.length; k++) {
        map[keys[k]] = unwrapValue(fields[keys[k]]);
      }
      return map;
    }

    return null;
  }

  /**
   * Pull the document id out of a Firestore resource name.
   * "projects/p/databases/(default)/documents/songs/abc123" -> "abc123"
   */
  function extractId(name) {
    if (!name) {
      return '';
    }
    var parts = String(name).split('/');
    return parts[parts.length - 1];
  }

  /**
   * Map a Firestore document onto the song shape the legacy UI already uses.
   * Deliberately the same six fields the old IndexedDB mapper produced, with
   * the same fallbacks, so no rendering code needs to change.
   */
  function mapDocument(doc) {
    if (!doc) {
      return null;
    }

    var fields = doc.fields || {};

    function str(key) {
      var unwrapped = unwrapValue(fields[key]);
      return typeof unwrapped === 'string' ? unwrapped : '';
    }

    return {
      id: extractId(doc.name),
      title: str('title') || 'Untitled',
      artist: str('artist'),
      chordProContent: str('chordProContent'),
      language: str('language'),
      difficulty: str('difficulty')
    };
  }

  /** Case-insensitive title sort, matching the previous legacy behaviour. */
  function sortByTitle(songs) {
    songs.sort(function(a, b) {
      var titleA = a.title.toLowerCase();
      var titleB = b.title.toLowerCase();
      if (titleA < titleB) return -1;
      if (titleA > titleB) return 1;
      return 0;
    });
    return songs;
  }

  function buildUrl(pageToken) {
    var url = BASE_URL + '?pageSize=' + PAGE_SIZE;
    if (pageToken) {
      url += '&pageToken=' + encodeURIComponent(pageToken);
    }
    return url;
  }

  /**
   * GET one page. Calls onPage(parsedBody) or onError(message).
   */
  function fetchPage(pageToken, onPage, onError) {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', buildUrl(pageToken), true);

    // Safari 12 fires onreadystatechange reliably; onload/onerror coverage on
    // old WebKit is patchier, so drive everything from readyState.
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) {
        return;
      }

      // status 0 means the request never completed: offline, DNS, TLS, CORS.
      if (xhr.status === 0) {
        onError('Could not reach the song library. Check your internet connection and try again.');
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        onError('The song library returned an error (HTTP ' + xhr.status + '). Please try again later.');
        return;
      }

      var parsed;
      try {
        parsed = JSON.parse(xhr.responseText);
      } catch (e) {
        onError('The song library sent a response we could not read.');
        return;
      }

      if (parsed && parsed.error) {
        var message = parsed.error.message || 'Unknown error';
        onError('The song library refused the request: ' + message);
        return;
      }

      onPage(parsed || {});
    };

    if (typeof xhr.timeout !== 'undefined') {
      xhr.timeout = REQUEST_TIMEOUT_MS;
      xhr.ontimeout = function() {
        onError('The song library took too long to respond. Check your internet connection and try again.');
      };
    }

    try {
      xhr.send(null);
    } catch (sendError) {
      onError('Could not reach the song library. Check your internet connection and try again.');
    }
  }

  /**
   * Fetch every song, following pagination. Calls onSuccess(songsArray) or
   * onError(message). Results are sorted by title.
   */
  function fetchAllSongs(onSuccess, onError) {
    var songs = [];
    var pages = 0;

    function handlePage(body) {
      pages++;

      var docs = body.documents || [];
      for (var i = 0; i < docs.length; i++) {
        var song = mapDocument(docs[i]);
        if (song && song.id) {
          songs.push(song);
        }
      }

      if (body.nextPageToken && pages < MAX_PAGES) {
        fetchPage(body.nextPageToken, handlePage, onError);
        return;
      }

      onSuccess(sortByTitle(songs));
    }

    fetchPage(null, handlePage, onError);
  }

  global.PulsarFirestoreREST = {
    PROJECT_ID: PROJECT_ID,
    PAGE_SIZE: PAGE_SIZE,
    buildUrl: buildUrl,
    unwrapValue: unwrapValue,
    extractId: extractId,
    mapDocument: mapDocument,
    sortByTitle: sortByTitle,
    fetchAllSongs: fetchAllSongs
  };
})(window);
