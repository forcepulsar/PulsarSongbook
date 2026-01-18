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

  // Scroll to top when song changes
  useEffect(() => {
    // Scroll page to top
    window.scrollTo(0, 0);

    // Scroll song content container to top
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [id]);

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

  // Quick access handlers
  const handleOpenGoogle = () => window.open(googleUrl, '_blank', 'noopener,noreferrer');
  const handleOpenYouTube = () => window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
  const handleOpenSpotify = () => window.open(spotifyUrl, '_blank', 'noopener,noreferrer');

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onToggleFullscreen: toggleFullscreen,
    onToggleAutoScroll: toggleScroll,
    onIncreaseFontSize: increaseFontSize,
    onDecreaseFontSize: decreaseFontSize,
    onIncreaseScrollSpeed: increaseSpeed,
    onDecreaseScrollSpeed: decreaseSpeed,
    onToggleChords: toggleChords,
    onRandomSong: handleRandomSong,
    onOpenGoogle: handleOpenGoogle,
    onOpenYouTube: handleOpenYouTube,
    onOpenSpotify: handleOpenSpotify,
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

  // Generate search query for external services
  const searchQuery = `${song.title}${song.artist ? ` ${song.artist}` : ''}`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
  const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`;

  return (
    <div ref={pageRef} className="max-w-4xl mx-auto">
      {/* Song Header - Compact for Mobile */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
        {/* Title and Actions */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 truncate">
              {song.title}
              {song.artist && (
                <span className="text-gray-600 font-normal"> - {song.artist}</span>
              )}
            </h1>

            {/* Quick Access Links */}
            <div className="flex gap-2 mt-2">
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition flex items-center gap-1"
                title="Search on Google"
              >
                <span>🔍</span>
                <span className="hidden sm:inline">Google</span>
              </a>
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded transition flex items-center gap-1"
                title="Search on YouTube"
              >
                <span>▶️</span>
                <span className="hidden sm:inline">YouTube</span>
              </a>
              <a
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded transition flex items-center gap-1"
                title="Search on Spotify"
              >
                <span>🎵</span>
                <span className="hidden sm:inline">Spotify</span>
              </a>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Link
              to={`/song/${id}/edit`}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
              title="Edit"
            >
              ✏️
            </Link>
            <button
              onClick={handleRandomSong}
              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
              title="Random Song (R)"
            >
              🎲
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition text-sm"
              title="Back"
            >
              ←
            </button>
          </div>
        </div>

        {/* Song Metadata - Compact */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {song.difficulty && (
            <span
              className={`px-2 py-0.5 text-xs rounded ${
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
            <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
              {song.myLevel}
            </span>
          )}
          {song.chordProStatus && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-800 rounded">
              {song.chordProStatus}
            </span>
          )}
        </div>

        {/* Controls - Compact */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
          {/* Auto-scroll controls */}
          <button
            onClick={toggleScroll}
            className={`px-3 py-1.5 rounded transition text-xs font-medium ${
              isScrolling
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isScrolling ? '⏸' : '▶'}
          </button>

          {/* Scroll speed controls */}
          <div className="flex items-center gap-0.5 bg-gray-100 rounded">
            <button
              onClick={decreaseSpeed}
              className="px-2 py-1.5 hover:bg-gray-200 rounded-l transition text-xs"
              disabled={scrollSpeed <= SCROLL.MIN_SPEED}
            >
              🐢
            </button>
            <span className="px-1.5 text-xs text-gray-600">{scrollSpeed.toFixed(1)}x</span>
            <button
              onClick={increaseSpeed}
              className="px-2 py-1.5 hover:bg-gray-200 rounded-r transition text-xs"
              disabled={scrollSpeed >= SCROLL.MAX_SPEED}
            >
              🐇
            </button>
          </div>

          {/* Font size controls */}
          <div className="flex items-center gap-0.5 bg-gray-100 rounded">
            <button
              onClick={decreaseFontSize}
              className="px-2 py-1.5 hover:bg-gray-200 rounded-l transition text-xs"
              disabled={fontSize <= FONT.MIN_SIZE}
            >
              A-
            </button>
            <span className="px-1.5 text-xs text-gray-600">{fontSize}</span>
            <button
              onClick={increaseFontSize}
              className="px-2 py-1.5 hover:bg-gray-200 rounded-r transition text-xs"
              disabled={fontSize >= FONT.MAX_SIZE}
            >
              A+
            </button>
          </div>

          {/* Toggle chords */}
          <button
            onClick={toggleChords}
            className={`px-3 py-1.5 rounded transition text-xs ${
              showChords ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            }`}
          >
            {showChords ? '👁' : '👁‍🗨'}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-xs"
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>

          {/* Keyboard shortcuts tooltip */}
          <div className="relative group">
            <button
              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition text-xs"
              title="Keyboard Shortcuts"
            >
              ⌨️
            </button>
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap z-10">
              <div className="space-y-1">
                <div><strong>Space</strong> - Toggle auto-scroll</div>
                <div><strong>[ / ]</strong> - Scroll speed</div>
                <div><strong>+ / -</strong> - Font size</div>
                <div><strong>C</strong> - Toggle chords</div>
                <div><strong>F</strong> - Toggle fullscreen</div>
                <div><strong>R</strong> - Random song</div>
                <div><strong>G</strong> - Google search</div>
                <div><strong>Y</strong> - YouTube search</div>
                <div><strong>S</strong> - Spotify search</div>
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
