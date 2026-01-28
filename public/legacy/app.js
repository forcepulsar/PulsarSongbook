/**
 * Pulsar Songbook - Legacy Version for iOS 12.5.7
 * ES5-compatible vanilla JavaScript
 */

(function() {
  'use strict';

  // =============================================================================
  // STATE MANAGEMENT
  // =============================================================================

  var state = {
    songs: [],
    filteredSongs: [],
    currentSong: null,
    currentView: 'list', // 'list' or 'song'
    searchQuery: '',
    fontSize: 16,
    scrollSpeed: 0.8,
    isScrolling: false,
    scrollInterval: null
  };

  // =============================================================================
  // CONSTANTS
  // =============================================================================

  var CONSTANTS = {
    SCROLL_INTERVAL_MS: 50,
    MIN_FONT_SIZE: 10,
    MAX_FONT_SIZE: 30,
    FONT_STEP: 1,
    MIN_SCROLL_SPEED: 0.1,
    MAX_SCROLL_SPEED: 3,
    SCROLL_SPEED_STEP: 0.2,
    CHORD_FIXES: {
      'Asus': 'Asus4',
      'Esus': 'Esus4',
      'Dsus': 'Dsus4',
      'A2': 'Asus2',
      'E2': 'Esus2',
      'D2': 'Dsus2'
    }
  };

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function getElement(id) {
    return document.getElementById(id);
  }

  function createElement(tag, className, content) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (content) el.textContent = content;
    return el;
  }

  function saveSettings() {
    try {
      localStorage.setItem('pulsar-legacy-fontSize', state.fontSize);
      localStorage.setItem('pulsar-legacy-scrollSpeed', state.scrollSpeed);
    } catch (e) {
      console.warn('Could not save settings to localStorage');
    }
  }

  function loadSettings() {
    try {
      var fontSize = localStorage.getItem('pulsar-legacy-fontSize');
      var scrollSpeed = localStorage.getItem('pulsar-legacy-scrollSpeed');

      if (fontSize) state.fontSize = parseInt(fontSize, 10);
      if (scrollSpeed) state.scrollSpeed = parseFloat(scrollSpeed);
    } catch (e) {
      console.warn('Could not load settings from localStorage');
    }
  }

  // =============================================================================
  // CHORDPRO PARSER
  // =============================================================================

  /**
   * Parse ChordPro content and convert to HTML
   * Handles: [Chord] for chords, {directive:value} for metadata
   */
  function parseChordPro(content) {
    if (!content) return { html: '', title: '', artist: '' };

    var title = '';
    var artist = '';
    var lines = content.split('\n');
    var htmlLines = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      // Handle directives {title:...} {artist:...} etc.
      if (trimmed.indexOf('{') === 0 && trimmed.indexOf('}') > 0) {
        var directiveMatch = trimmed.match(/\{([^:]+):(.+)\}/);
        if (directiveMatch) {
          var directive = directiveMatch[1].toLowerCase().trim();
          var value = directiveMatch[2].trim();

          if (directive === 'title' || directive === 't') {
            title = value;
          } else if (directive === 'artist' || directive === 'a') {
            artist = value;
          } else if (directive === 'comment' || directive === 'c') {
            htmlLines.push('<div class="comment">' + escapeHtml(value) + '</div>');
          }
        }
        continue;
      }

      // Skip comment lines
      if (trimmed.indexOf('#') === 0) continue;

      // Empty lines
      if (trimmed === '') {
        htmlLines.push('<div class="row empty-row"></div>');
        continue;
      }

      // Parse line with chords
      var parsedLine = parseLineWithChords(line);
      htmlLines.push(parsedLine);
    }

    return {
      html: htmlLines.join('\n'),
      title: title,
      artist: artist
    };
  }

  /**
   * Parse a single line, extracting chords [C] [Am] etc and positioning them above lyrics
   */
  function parseLineWithChords(line) {
    var columns = [];
    var currentPos = 0;
    var chordRegex = /\[([^\]]+)\]/g;
    var match;
    var lastIndex = 0;

    // Find all chords in the line
    var chords = [];
    while ((match = chordRegex.exec(line)) !== null) {
      chords.push({
        chord: match[1],
        position: match.index,
        length: match[0].length
      });
    }

    // If no chords, return plain lyrics
    if (chords.length === 0) {
      var escapedLine = escapeHtml(line).replace(/\\#/g, '#');
      return '<div class="row"><div class="column"><div class="lyrics">' +
             escapedLine + '</div></div></div>';
    }

    // Build columns with chords and lyrics
    for (var i = 0; i < chords.length; i++) {
      var chordInfo = chords[i];

      // Get lyrics before this chord
      var lyricsBefore = line.substring(lastIndex, chordInfo.position);

      // Add previous lyrics as a column if not empty
      if (lyricsBefore) {
        columns.push({
          chord: '',
          lyrics: lyricsBefore
        });
      }

      // Determine lyrics for this chord column
      var nextChordPos = (i + 1 < chords.length) ? chords[i + 1].position : line.length;
      var lyricsAfterChord = line.substring(
        chordInfo.position + chordInfo.length,
        nextChordPos
      );

      columns.push({
        chord: chordInfo.chord,
        lyrics: lyricsAfterChord
      });

      lastIndex = nextChordPos;
    }

    // Build HTML for the row
    var rowHtml = '<div class="row">';
    for (var j = 0; j < columns.length; j++) {
      var col = columns[j];
      var chordHtml = col.chord ?
        '<div class="chord">' + escapeHtml(fixChordName(col.chord)) + '</div>' : '';
      var lyricsText = escapeHtml(col.lyrics).replace(/\\#/g, '#');
      var lyricsHtml = '<div class="lyrics">' + (lyricsText || '&nbsp;') + '</div>';

      rowHtml += '<div class="column">' + chordHtml + lyricsHtml + '</div>';
    }
    rowHtml += '</div>';

    return rowHtml;
  }

  /**
   * Fix common chord name issues
   */
  function fixChordName(chord) {
    // Fix maj7 variations
    var maj7Regex = /^([A-G](?:#|b)?m?)ma7$/i;
    if (maj7Regex.test(chord)) {
      chord = chord.replace(/ma7$/i, 'maj7');
    }

    // Apply explicit fixes
    if (CONSTANTS.CHORD_FIXES[chord]) {
      return CONSTANTS.CHORD_FIXES[chord];
    }

    return chord;
  }

  // =============================================================================
  // RENDERING FUNCTIONS
  // =============================================================================

  /**
   * Render the main app layout
   */
  function renderApp() {
    var app = getElement('app');

    var html = '<div id="header"></div>' +
               '<div id="main"></div>' +
               '<div id="controls"></div>';

    app.innerHTML = html;

    // Render based on current view
    if (state.currentView === 'list') {
      renderSongList();
    } else if (state.currentView === 'song') {
      renderSongView();
    }
  }

  /**
   * Render the song list view
   */
  function renderSongList() {
    var header = getElement('header');
    var main = getElement('main');
    var controls = getElement('controls');

    // Header with search
    header.innerHTML =
      '<div class="header-content">' +
        '<h1 class="app-title">Pulsar Songbook</h1>' +
        '<input type="text" id="search-input" class="search-input" ' +
               'placeholder="Search songs..." value="' + escapeHtml(state.searchQuery) + '">' +
      '</div>';

    // Song list
    var listHtml = '<div class="song-list">';

    if (state.filteredSongs.length === 0) {
      listHtml += '<div class="empty-state">No songs found</div>';
    } else {
      for (var i = 0; i < state.filteredSongs.length; i++) {
        var song = state.filteredSongs[i];
        var artist = song.artist || 'Unknown Artist';

        listHtml +=
          '<div class="song-item" data-song-id="' + escapeHtml(song.id) + '">' +
            '<div class="song-title">' + escapeHtml(song.title) + '</div>' +
            '<div class="song-artist">' + escapeHtml(artist) + '</div>' +
          '</div>';
      }
    }

    listHtml += '</div>';
    main.innerHTML = listHtml;

    // Controls
    controls.innerHTML =
      '<div class="controls-content">' +
        '<div class="song-count">' + state.filteredSongs.length + ' songs</div>' +
      '</div>';

    // Attach event listeners
    var searchInput = getElement('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', handleSearch);
      searchInput.addEventListener('keyup', handleSearch);
    }

    var songItems = document.querySelectorAll('.song-item');
    for (var j = 0; j < songItems.length; j++) {
      songItems[j].addEventListener('click', handleSongClick);
    }
  }

  /**
   * Render the song view
   */
  function renderSongView() {
    if (!state.currentSong) {
      state.currentView = 'list';
      renderApp();
      return;
    }

    var header = getElement('header');
    var main = getElement('main');
    var controls = getElement('controls');

    // Parse ChordPro content
    var parsed = parseChordPro(state.currentSong.chordProContent);

    // Header with back button
    var title = parsed.title || state.currentSong.title;
    var artist = parsed.artist || state.currentSong.artist || '';

    header.innerHTML =
      '<div class="header-content song-header">' +
        '<button id="back-btn" class="back-btn">&larr; Back</button>' +
        '<div class="song-info">' +
          '<h1 class="song-title-header">' + escapeHtml(title) + '</h1>' +
          (artist ? '<div class="song-artist-header">' + escapeHtml(artist) + '</div>' : '') +
        '</div>' +
      '</div>';

    // Main content
    main.innerHTML =
      '<div id="song-container" class="song-container">' +
        '<div class="chord-sheet">' + parsed.html + '</div>' +
      '</div>';

    // Apply font size to all elements
    applySongStyles();

    // Controls
    var scrollBtnText = state.isScrolling ? 'Stop (Space)' : 'Scroll (Space)';
    controls.innerHTML =
      '<div class="controls-content song-controls">' +
        '<button id="scroll-btn" class="control-btn">' + scrollBtnText + '</button>' +
        '<button id="font-minus" class="control-btn">A-</button>' +
        '<button id="font-plus" class="control-btn">A+</button>' +
        '<div class="control-info">' +
          'Speed: [/] | Font: ' + state.fontSize + 'px' +
        '</div>' +
      '</div>';

    // Attach event listeners
    var backBtn = getElement('back-btn');
    if (backBtn) backBtn.addEventListener('click', handleBackClick);

    var scrollBtn = getElement('scroll-btn');
    if (scrollBtn) scrollBtn.addEventListener('click', toggleScroll);

    var fontMinus = getElement('font-minus');
    if (fontMinus) fontMinus.addEventListener('click', decreaseFontSize);

    var fontPlus = getElement('font-plus');
    if (fontPlus) fontPlus.addEventListener('click', increaseFontSize);
  }

  /**
   * Apply styling to the rendered song
   */
  function applySongStyles() {
    var container = getElement('song-container');
    if (!container) return;

    var fontSize = state.fontSize;

    // Style all lyrics
    var lyrics = container.querySelectorAll('.lyrics');
    for (var i = 0; i < lyrics.length; i++) {
      var lyric = lyrics[i];
      lyric.style.fontSize = fontSize + 'px';
      lyric.style.whiteSpace = 'pre';
      lyric.style.position = 'relative';
      lyric.style.padding = '0 0.1em';
    }

    // Style all chords
    var chords = container.querySelectorAll('.chord');
    for (var j = 0; j < chords.length; j++) {
      var chord = chords[j];
      chord.style.fontSize = fontSize + 'px';
      chord.style.color = '#dc3545';
      chord.style.fontWeight = 'bold';
      chord.style.position = 'absolute';
      chord.style.top = '0';
      chord.style.left = '0';
      chord.style.height = (fontSize * 1.2) + 'px';
      chord.style.whiteSpace = 'pre';
      chord.style.textAlign = 'center';
    }

    // Style columns
    var columns = container.querySelectorAll('.column');
    for (var k = 0; k < columns.length; k++) {
      var col = columns[k];
      col.style.display = 'inline-block';
      col.style.position = 'relative';
      col.style.padding = (fontSize * 1.2) + 'px 0 0';
      col.style.margin = '0';
      col.style.minHeight = '1.5em';
    }

    // Style comments
    var comments = container.querySelectorAll('.comment');
    for (var m = 0; m < comments.length; m++) {
      var comment = comments[m];
      comment.style.fontSize = fontSize + 'px';
      comment.style.color = '#28a745';
      comment.style.fontStyle = 'italic';
      comment.style.margin = '0.5em 0';
      comment.style.width = '100%';
    }
  }

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  function handleSearch(e) {
    state.searchQuery = e.target.value.toLowerCase();
    filterSongs();
    renderSongList();
  }

  function handleSongClick(e) {
    var songItem = e.currentTarget;
    var songId = songItem.getAttribute('data-song-id');

    // Find song by ID
    for (var i = 0; i < state.songs.length; i++) {
      if (state.songs[i].id === songId) {
        state.currentSong = state.songs[i];
        state.currentView = 'song';
        renderApp();
        return;
      }
    }
  }

  function handleBackClick() {
    stopScroll();
    state.currentSong = null;
    state.currentView = 'list';
    renderApp();
  }

  function toggleScroll() {
    if (state.isScrolling) {
      stopScroll();
    } else {
      startScroll();
    }
  }

  function startScroll() {
    if (state.isScrolling) return;

    state.isScrolling = true;
    state.scrollInterval = setInterval(function() {
      var container = getElement('song-container');
      if (container) {
        container.scrollTop += state.scrollSpeed;
      }
    }, CONSTANTS.SCROLL_INTERVAL_MS);

    // Update button text
    var scrollBtn = getElement('scroll-btn');
    if (scrollBtn) scrollBtn.textContent = 'Stop (Space)';
  }

  function stopScroll() {
    if (!state.isScrolling) return;

    state.isScrolling = false;
    if (state.scrollInterval) {
      clearInterval(state.scrollInterval);
      state.scrollInterval = null;
    }

    // Update button text
    var scrollBtn = getElement('scroll-btn');
    if (scrollBtn) scrollBtn.textContent = 'Scroll (Space)';
  }

  function increaseFontSize() {
    if (state.fontSize < CONSTANTS.MAX_FONT_SIZE) {
      state.fontSize += CONSTANTS.FONT_STEP;
      applySongStyles();
      updateControlInfo();
      saveSettings();
    }
  }

  function decreaseFontSize() {
    if (state.fontSize > CONSTANTS.MIN_FONT_SIZE) {
      state.fontSize -= CONSTANTS.FONT_STEP;
      applySongStyles();
      updateControlInfo();
      saveSettings();
    }
  }

  function increaseScrollSpeed() {
    if (state.scrollSpeed < CONSTANTS.MAX_SCROLL_SPEED) {
      state.scrollSpeed = Math.min(
        state.scrollSpeed + CONSTANTS.SCROLL_SPEED_STEP,
        CONSTANTS.MAX_SCROLL_SPEED
      );
      saveSettings();
    }
  }

  function decreaseScrollSpeed() {
    if (state.scrollSpeed > CONSTANTS.MIN_SCROLL_SPEED) {
      state.scrollSpeed = Math.max(
        state.scrollSpeed - CONSTANTS.SCROLL_SPEED_STEP,
        CONSTANTS.MIN_SCROLL_SPEED
      );
      saveSettings();
    }
  }

  function updateControlInfo() {
    var controlInfo = document.querySelector('.control-info');
    if (controlInfo) {
      controlInfo.innerHTML = 'Speed: [/] | Font: ' + state.fontSize + 'px';
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  function handleKeyboard(e) {
    // Don't intercept if typing in input
    if (e.target.tagName === 'INPUT') return;

    var key = e.key || String.fromCharCode(e.keyCode);

    if (state.currentView === 'song') {
      // Space - toggle scroll
      if (key === ' ' || e.keyCode === 32) {
        e.preventDefault();
        toggleScroll();
      }
      // [ - decrease scroll speed
      else if (key === '[') {
        e.preventDefault();
        decreaseScrollSpeed();
      }
      // ] - increase scroll speed
      else if (key === ']') {
        e.preventDefault();
        increaseScrollSpeed();
      }
      // + or = - increase font size
      else if (key === '+' || key === '=') {
        e.preventDefault();
        increaseFontSize();
      }
      // - - decrease font size
      else if (key === '-') {
        e.preventDefault();
        decreaseFontSize();
      }
      // Escape - go back
      else if (key === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        handleBackClick();
      }
    }
  }

  // =============================================================================
  // DATA MANAGEMENT
  // =============================================================================

  function filterSongs() {
    if (!state.searchQuery) {
      state.filteredSongs = state.songs.slice();
      return;
    }

    var query = state.searchQuery;
    state.filteredSongs = [];

    for (var i = 0; i < state.songs.length; i++) {
      var song = state.songs[i];
      var title = song.title ? song.title.toLowerCase() : '';
      var artist = song.artist ? song.artist.toLowerCase() : '';

      if (title.indexOf(query) !== -1 || artist.indexOf(query) !== -1) {
        state.filteredSongs.push(song);
      }
    }
  }

  /**
   * Load songs from IndexedDB (shared with main app)
   */
  function loadSongs() {
    // Check if IndexedDB is supported
    if (!window.indexedDB) {
      showError('IndexedDB is not supported in this browser. Please use a modern browser or update iOS.');
      return;
    }

    // Open the same database as the main app (no version specified = open latest version)
    var request = indexedDB.open('PulsarSongbook');

    request.onerror = function() {
      showError('Could not open IndexedDB. Error: ' + (request.error ? request.error.message : 'Unknown'));
    };

    request.onsuccess = function(event) {
      var db = event.target.result;

      // Check if songs store exists
      if (!db.objectStoreNames.contains('songs')) {
        showError('No songs database found. Please open the main app first to initialize the database.');
        db.close();
        return;
      }

      // Read all songs from the songs object store
      var transaction = db.transaction(['songs'], 'readonly');
      var objectStore = transaction.objectStore('songs');
      var getAllRequest = objectStore.getAll();

      getAllRequest.onsuccess = function() {
        var songs = getAllRequest.result;

        if (songs && songs.length > 0) {
          // Convert from main app format to legacy format
          state.songs = songs.map(function(song) {
            return {
              id: song.id,
              title: song.title || 'Untitled',
              artist: song.artist || '',
              chordProContent: song.chordProContent || '',
              language: song.language || '',
              difficulty: song.difficulty || ''
            };
          });

          // Sort by title
          state.songs.sort(function(a, b) {
            var titleA = a.title.toLowerCase();
            var titleB = b.title.toLowerCase();
            if (titleA < titleB) return -1;
            if (titleA > titleB) return 1;
            return 0;
          });

          filterSongs();
          renderApp();
        } else {
          showError('No songs found in database. Please add songs using the main app first.');
        }

        db.close();
      };

      getAllRequest.onerror = function() {
        showError('Error reading songs from database: ' + (getAllRequest.error ? getAllRequest.error.message : 'Unknown'));
        db.close();
      };

      transaction.onerror = function() {
        showError('Database transaction error: ' + (transaction.error ? transaction.error.message : 'Unknown'));
        db.close();
      };
    };

    // No onupgradeneeded handler needed - we only read from existing database
    // The main app is responsible for creating and upgrading the database structure
  }

  function showError(message) {
    var app = getElement('app');
    app.innerHTML =
      '<div class="error-container">' +
        '<h2>Error Loading Songs</h2>' +
        '<p>' + escapeHtml(message) + '</p>' +
        '<p><strong>Tip:</strong> Open the main app first to add songs, then return to the legacy version.</p>' +
        '<p><a href="/" style="color: #007aff; text-decoration: underline;">Open Main App</a></p>' +
      '</div>';
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  function init() {
    console.log('Pulsar Songbook Legacy - Initializing...');

    // Load settings from localStorage
    loadSettings();

    // Set up keyboard event listener
    document.addEventListener('keydown', handleKeyboard);

    // Prevent zoom on double-tap (iOS)
    var lastTouchEnd = 0;
    document.addEventListener('touchend', function(e) {
      var now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

    // Load songs
    loadSongs();
  }

  // Start the app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
