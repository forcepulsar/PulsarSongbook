/**
 * Pulsar Songbook - Legacy on-device self test
 *
 * Runs in the browser you open it with and reports what actually works. It
 * exists because the target device (an iPad on iOS 12.5.7) cannot be tested
 * from a development machine: jsdom executes the same ES5 source but is not
 * Safari 12's engine, and there is no iOS 12 simulator to hand.
 *
 * It also serves as the debugger of last resort. Safari 12 has no on-device
 * console, so without this a failure on the iPad is a blank screen with no
 * information. Every check reports its own outcome and the reason.
 *
 * Strict ES5, no dependencies, same constraints as the rest of public/legacy/.
 * Read-only: it performs the same GET the app does and writes nothing.
 */

(function() {
  'use strict';

  var results = [];
  var pending = 0;
  var startedAt = new Date().getTime();

  function record(name, passed, detail, isWarning) {
    results.push({
      name: name,
      passed: passed,
      detail: detail || '',
      isWarning: isWarning === true
    });
    render();
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function render() {
    var failures = 0;
    var warnings = 0;
    var html = '';

    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var cls, mark;

      // isWarning first: diagnostic rows are recorded with passed === true so
      // they never turn the banner red, which made the isWarning branch
      // unreachable when this was ordered the other way round.
      if (r.isWarning) {
        cls = 'warn';
        mark = 'INFO';
        warnings++;
      } else if (r.passed) {
        cls = 'pass';
        mark = 'PASS';
      } else {
        cls = 'fail';
        mark = 'FAIL';
        failures++;
      }

      html += '<li class="' + cls + '">' +
        '<span class="mark">' + mark + '</span>' +
        '<span class="name">' + escapeHtml(r.name) + '</span>' +
        (r.detail ? '<span class="detail">' + escapeHtml(r.detail) + '</span>' : '') +
      '</li>';
    }

    var banner;
    if (pending > 0) {
      banner = '<div class="banner running">Running' +
        (pending === 1 ? ' 1 check' : ' ' + pending + ' checks') + '...</div>';
    } else if (failures > 0) {
      banner = '<div class="banner bad">' + failures +
        (failures === 1 ? ' CHECK FAILED' : ' CHECKS FAILED') +
        '<small>Screenshot this page and send it over.</small></div>';
    } else {
      banner = '<div class="banner good">ALL CHECKS PASSED' +
        '<small>The songbook works on this device.</small></div>';
    }

    document.getElementById('results').innerHTML =
      banner + '<ul>' + html + '</ul>';
  }

  // ---------------------------------------------------------------------------
  // Environment
  // ---------------------------------------------------------------------------

  function checkEnvironment() {
    var ua = navigator.userAgent;
    record('User agent', true, ua, true);

    var iosMatch = ua.match(/OS (\d+)_(\d+)/);
    if (iosMatch) {
      var major = parseInt(iosMatch[1], 10);
      record(
        'iOS version detected',
        true,
        iosMatch[1] + '.' + iosMatch[2] + (major <= 12 ? ' (this is the target device)' : ''),
        true
      );
    } else {
      record('iOS version detected', true, 'not an iOS device - testing on a desktop browser', true);
    }

    // Confirms we really are on an old engine. Modern syntax must be probed
    // via eval, or this file would fail to parse on the very browser it tests.
    var supportsModern = true;
    try {
      // eval is the only way to probe syntax support: writing `null?.x`
      // directly would make THIS file unparseable on the browser it tests.
      eval('null?.x');
    } catch (e) {
      supportsModern = false;
    }
    record(
      'JS engine',
      true,
      supportsModern
        ? 'supports optional chaining - a modern engine, so this is NOT the iOS 12 path'
        : 'no optional chaining - an old engine, which is exactly why this app is ES5',
      true
    );
  }

  function checkPlatformApis() {
    record('XMLHttpRequest available', typeof XMLHttpRequest !== 'undefined',
      typeof XMLHttpRequest === 'undefined' ? 'the app cannot fetch songs without this' : '');

    record('JSON.parse available', typeof JSON !== 'undefined' && typeof JSON.parse === 'function', '');

    record('Object.keys available', typeof Object.keys === 'function', '');

    var storageWorks = false;
    var storageDetail = '';
    try {
      localStorage.setItem('pulsar-selftest', '1');
      storageWorks = localStorage.getItem('pulsar-selftest') === '1';
      localStorage.removeItem('pulsar-selftest');
    } catch (e) {
      storageDetail = 'blocked (Private Browsing?) - font size and scroll speed will not persist';
    }
    record('localStorage writable', storageWorks, storageDetail);

    // Not required any more, but its absence used to be the whole bug.
    record('IndexedDB present', true,
      window.indexedDB
        ? 'present but deliberately unused - songs come from Firestore now'
        : 'absent, which no longer matters',
      true);
  }

  function checkDomRendering() {
    try {
      var probe = document.createElement('div');
      probe.innerHTML = '<div class="song-item"><div class="song-title">x</div></div>';
      var ok = probe.getElementsByClassName('song-title').length === 1;
      record('DOM rendering (innerHTML + getElementsByClassName)', ok,
        ok ? '' : 'the app builds its entire UI this way');
    } catch (e) {
      record('DOM rendering (innerHTML + getElementsByClassName)', false, e.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Data layer
  // ---------------------------------------------------------------------------

  function checkDataLayerPresent() {
    var api = window.PulsarFirestoreREST;
    record('Data layer script loaded', !!api,
      api ? 'window.PulsarFirestoreREST is present' : '/legacy/firestore-rest.js did not load or failed to parse');
    return !!api;
  }

  function checkDataLayerShape() {
    var api = window.PulsarFirestoreREST;
    var url = api.buildUrl(null);

    record('Request is read-only and keyless', url.indexOf('key=') === -1,
      'no API key in the URL (reads are public by rule)');

    record('Request masks to rendered fields only',
      url.indexOf('mask.fieldPaths=title') !== -1,
      'avoids downloading learningResource HTML this app never shows');

    record('Request bypasses the browser cache', /[?&]_=/.test(url),
      'so a song edited on the desktop shows up here');
  }

  function checkLiveFetch() {
    var api = window.PulsarFirestoreREST;
    pending++;
    render();

    var fetchStarted = new Date().getTime();

    api.fetchAllSongs(
      function(songs) {
        var elapsed = new Date().getTime() - fetchStarted;
        pending--;

        record('Fetched songs from Firestore', songs.length > 0,
          songs.length + ' songs in ' + elapsed + 'ms');

        if (!songs.length) {
          render();
          return;
        }

        var withLyrics = 0;
        var withArtist = 0;
        for (var i = 0; i < songs.length; i++) {
          if (songs[i].chordProContent) withLyrics++;
          if (songs[i].artist) withArtist++;
        }

        record('Songs carry ChordPro content', withLyrics > 0,
          withLyrics + ' of ' + songs.length + ' have lyrics');

        record('Songs carry artist and title', withArtist > 0,
          'first: "' + songs[0].title + '" by ' + (songs[0].artist || 'unknown'));

        record('Sorted alphabetically by title',
          songs.length < 2 || songs[0].title.toLowerCase() <= songs[1].title.toLowerCase(),
          'starts at "' + songs[0].title + '"');

        record('Total time on this device', true,
          (new Date().getTime() - startedAt) + 'ms from page load', true);

        render();
      },
      function(message, kind) {
        pending--;
        record('Fetched songs from Firestore', false,
          '[' + (kind || 'unknown') + '] ' + message);
        render();
      }
    );
  }

  // ---------------------------------------------------------------------------

  function run() {
    checkEnvironment();
    checkPlatformApis();
    checkDomRendering();

    if (checkDataLayerPresent()) {
      checkDataLayerShape();
      checkLiveFetch();
    }

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
