import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { db, getSettings, updateSettings } from '../db/schema';
import { parseAndFormatChordPro, applyAllStyles } from '../lib/chordpro/renderUtils';
import { FONT, SCROLL } from '../lib/chordpro/constants';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useFullscreen } from '../hooks/useFullscreen';

export default function SongDisplay() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const [fontSize, setFontSize] = useState(FONT.DEFAULT_SIZE);
  const [showChords, setShowChords] = useState(true);

  // Load song from IndexedDB
  const song = useLiveQuery(async () => {
    if (!id) return null;
    return await db.songs.get(id);
  }, [id]);

  // Initialize hooks
  const { isFullscreen, toggleFullscreen } = useFullscreen(pageRef);
  const {
    isScrolling,
    scrollSpeed,
    toggleScroll,
    increaseSpeed,
    decreaseSpeed,
    setScrollSpeed,
  } = useAutoScroll({
    containerRef: scrollContainerRef,
    speed: SCROLL.DEFAULT_SPEED,
  });

  // Load settings
  useEffect(() => {
    getSettings().then((settings) => {
      setFontSize(settings.fontSize);
      setShowChords(settings.showChords);
      setScrollSpeed(settings.scrollSpeed);
    });
  }, [setScrollSpeed]);

  // Render and style the ChordPro content whenever song or settings change
  useEffect(() => {
    if (!song || !song.chordProContent || !contentRef.current) return;

    try {
      const formattedHtml = parseAndFormatChordPro(song.chordProContent);
      contentRef.current.innerHTML = formattedHtml;
      applyAllStyles(contentRef.current, fontSize, showChords);
    } catch (error) {
      console.error('[SongDisplay] Failed to render ChordPro:', error);
      if (contentRef.current) {
        contentRef.current.innerHTML = `
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-red-800">Failed to parse song content</p>
            <pre class="mt-2 text-sm text-gray-700 whitespace-pre-wrap">${song.chordProContent}</pre>
          </div>
        `;
      }
    }
  }, [song, fontSize, showChords]);

  // Font size controls
  const increaseFontSize = () => {
    setFontSize((prev) => {
      const newSize = Math.min(prev + FONT.SIZE_STEP, FONT.MAX_SIZE);
      updateSettings({ fontSize: newSize });
      return newSize;
    });
  };

  const decreaseFontSize = () => {
    setFontSize((prev) => {
      const newSize = Math.max(prev - FONT.SIZE_STEP, FONT.MIN_SIZE);
      updateSettings({ fontSize: newSize });
      return newSize;
    });
  };

  const toggleChords = () => {
    setShowChords((prev) => {
      const newValue = !prev;
      updateSettings({ showChords: newValue });
      return newValue;
    });
  };

  // Save scroll speed to settings
  useEffect(() => {
    updateSettings({ scrollSpeed });
  }, [scrollSpeed]);

  // Random song handler
  const handleRandomSong = async () => {
    const allSongs = await db.songs.toArray();
    if (allSongs.length === 0) return;
    const randomIndex = Math.floor(Math.random() * allSongs.length);
    const randomSong = allSongs[randomIndex];
    navigate(`/song/${randomSong.id}`);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onToggleFullscreen: toggleFullscreen,
    onToggleAutoScroll: toggleScroll,
    onIncreaseFontSize: increaseFontSize,
    onDecreaseFontSize: decreaseFontSize,
    onToggleChords: toggleChords,
    onRandomSong: handleRandomSong,
  });

  if (!song) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">Song not found</p>
          <Link
            to="/"
            className="inline-block mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Back to Songs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="max-w-4xl mx-auto">
      {/* Song Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800">{song.title}</h1>
            {song.artist && (
              <p className="text-xl text-gray-600 mt-1">{song.artist}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRandomSong}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              title="Random Song (R)"
            >
              🎲 Random
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Song Metadata */}
        <div className="flex flex-wrap gap-2">
          {song.language && (
            <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded">
              {song.language}
            </span>
          )}
          {song.difficulty && (
            <span
              className={`px-3 py-1 text-sm rounded ${
                song.difficulty === 'Easy'
                  ? 'bg-green-100 text-green-800'
                  : song.difficulty === 'Medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {song.difficulty}
            </span>
          )}
          {song.myLevel && (
            <span className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded">
              {song.myLevel}
            </span>
          )}
          {song.chordProStatus && (
            <span className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded">
              Status: {song.chordProStatus}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
          {/* Auto-scroll controls */}
          <button
            onClick={toggleScroll}
            className={`px-4 py-2 rounded transition text-sm font-medium ${
              isScrolling
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isScrolling ? '⏸ Pause' : '▶ Auto-Scroll'}
          </button>

          {/* Scroll speed controls */}
          <div className="flex items-center gap-1 bg-gray-100 rounded">
            <button
              onClick={decreaseSpeed}
              className="px-3 py-2 hover:bg-gray-200 rounded-l transition text-sm"
              disabled={scrollSpeed <= SCROLL.MIN_SPEED}
            >
              🐢
            </button>
            <span className="px-2 text-sm text-gray-600">{scrollSpeed.toFixed(1)}x</span>
            <button
              onClick={increaseSpeed}
              className="px-3 py-2 hover:bg-gray-200 rounded-r transition text-sm"
              disabled={scrollSpeed >= SCROLL.MAX_SPEED}
            >
              🐇
            </button>
          </div>

          {/* Font size controls */}
          <div className="flex items-center gap-1 bg-gray-100 rounded">
            <button
              onClick={decreaseFontSize}
              className="px-3 py-2 hover:bg-gray-200 rounded-l transition text-sm"
              disabled={fontSize <= FONT.MIN_SIZE}
            >
              A-
            </button>
            <span className="px-2 text-sm text-gray-600">{fontSize}px</span>
            <button
              onClick={increaseFontSize}
              className="px-3 py-2 hover:bg-gray-200 rounded-r transition text-sm"
              disabled={fontSize >= FONT.MAX_SIZE}
            >
              A+
            </button>
          </div>

          {/* Toggle chords */}
          <button
            onClick={toggleChords}
            className={`px-4 py-2 rounded transition text-sm ${
              showChords ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            }`}
          >
            {showChords ? '👁 Chords On' : '👁 Chords Off'}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm"
          >
            {isFullscreen ? '⛶ Exit Fullscreen' : '⛶ Fullscreen'}
          </button>

          {/* Keyboard shortcuts tooltip */}
          <div className="relative group">
            <button
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition text-sm font-semibold"
              title="Keyboard Shortcuts"
            >
              ⌨️
            </button>
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap z-10">
              <div className="space-y-1">
                <div><strong>Space</strong> - Toggle auto-scroll</div>
                <div><strong>F</strong> - Toggle fullscreen</div>
                <div><strong>C</strong> - Toggle chords</div>
                <div><strong>+/-</strong> - Font size</div>
                <div><strong>R</strong> - Random song</div>
                <div><strong>Esc</strong> - Exit fullscreen</div>
              </div>
              <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Song Content */}
      <div
        ref={scrollContainerRef}
        className={`bg-white rounded-lg shadow-lg p-8 ${
          isFullscreen ? 'h-screen overflow-y-auto' : 'max-h-[70vh] overflow-y-auto'
        }`}
      >
        <div ref={contentRef} className="chordpro-container" />
      </div>

      {/* Learning Resources */}
      {song.learningResource && (
        <div className="bg-blue-50 rounded-lg shadow p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Learning Resources
          </h3>
          <div dangerouslySetInnerHTML={{ __html: song.learningResource }} />
        </div>
      )}

      {/* Editing Notes */}
      {song.editingNotes && (
        <div className="bg-yellow-50 rounded-lg shadow p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{song.editingNotes}</p>
        </div>
      )}
    </div>
  );
}
