import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { FaGoogle, FaYoutube, FaSpotify } from 'react-icons/fa';
import { getSettings, updateSettings } from '../db/schema';
import { getSong } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import { parseAndFormatChordPro, applyAllStyles } from '../lib/chordpro/renderUtils';
import { FONT, SCROLL } from '../lib/chordpro/constants';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useFullscreen } from '../hooks/useFullscreen';
import { linkify } from '../lib/utils/linkify';
import type { Song } from '../types/song';

export default function SongDisplay() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const [fontSize, setFontSize] = useState(FONT.DEFAULT_SIZE);
  const [showChords, setShowChords] = useState(true);
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { isApproved } = useAuth();

  // Load song from Firestore
  useEffect(() => {
    if (!id) return;

    getSong(id)
      .then(setSong)
      .catch(console.error)
      .finally(() => setLoading(false));
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
    window.scrollTo(0, 0);
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

  // Render and style the ChordPro content
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
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p class="text-red-800 dark:text-red-200 font-medium">Failed to parse song content</p>
            <pre class="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">${song.chordProContent}</pre>
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
  // Online: normal Firestore fetch. Offline: read from Firestore's local cache (instant, no network).
  const handleRandomSong = async () => {
    try {
      let allSongs: Song[];

      if (!navigator.onLine) {
        const { collection, getDocsFromCache, query, orderBy } = await import('firebase/firestore');
        const { db: firestoreDb } = await import('../lib/firebase/config');
        const q = query(collection(firestoreDb, 'songs'), orderBy('title'));
        const snapshot = await getDocsFromCache(q);
        allSongs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Song));
      } else {
        const { getAllSongs } = await import('../services/firestore');
        allSongs = await getAllSongs();
      }

      if (allSongs.length === 0) return;

      const otherSongs = allSongs.filter(s => s.id !== id);

      if (otherSongs.length === 0) {
        alert('This is the only song in the library!');
        return;
      }

      const randomIndex = Math.floor(Math.random() * otherSongs.length);
      const randomSong = otherSongs[randomIndex];
      navigate(`/song/${randomSong.id}`);
    } catch (error) {
      console.error('Error loading random song:', error);
      alert('Failed to load random song');
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <p className="text-xl text-gray-600 dark:text-gray-400">Song not found</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Back to Library
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
    <div ref={pageRef} className="max-w-6xl mx-auto pb-28">
      {/* Compact Header - Song Info & Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 md:p-4 mb-4">
        {/* Title Row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {song.title}
            </h1>
            {song.artist && (
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
                {song.artist}
              </p>
            )}
          </div>

          {/* Back Button - Always visible on mobile */}
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition flex-shrink-0"
            title="Back"
          >
            ←
          </button>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* External Links - Icon only on mobile */}
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
            title="Search on Google (G)"
          >
            <FaGoogle className="text-base text-[#4285F4]" />
          </a>
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
            title="Search on YouTube (Y)"
          >
            <FaYoutube className="text-base text-[#FF0000] dark:text-red-400" />
          </a>
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
            title="Search on Spotify (S)"
          >
            <FaSpotify className="text-base text-[#1DB954] dark:text-green-400" />
          </a>

          <div className="flex-1"></div>

          {/* Main Action Buttons */}
          {isApproved && (
            <Link
              to={`/song/${id}/edit`}
              className="p-2 md:px-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              title="Edit"
            >
              ✏️
            </Link>
          )}
          <button
            onClick={handleRandomSong}
            className="p-2 md:px-3 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            title="Random Song (R)"
          >
            🎲
          </button>
        </div>
      </div>

      {/* Song Content with bottom padding for controls */}
      <div
        ref={scrollContainerRef}
        className={`
          bg-white dark:bg-gray-800 rounded-lg shadow-lg
          ${isFullscreen
            ? 'fixed inset-0 z-50 rounded-none'
            : ''
          }
        `}
        style={{
          maxHeight: isFullscreen ? '100vh' : 'calc(100vh - 250px)',
          overflowY: 'auto',
          paddingBottom: '100px' // Space for fixed controls
        }}
      >
        <div ref={contentRef} className="chordpro-container p-6 md:p-8 lg:p-10" />
      </div>

      {/* Learning Resources - Below content, not in scroll area */}
      {!isFullscreen && song.learningResource && (
        <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-4 dark:border dark:border-blue-800/30">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-blue-200 mb-2">
            📚 Learning Resources
          </h3>
          <div
            className="text-sm text-gray-700 dark:text-gray-200"
            dangerouslySetInnerHTML={{ __html: linkify(song.learningResource) }}
          />
        </div>
      )}

      {/* Editing Notes */}
      {!isFullscreen && song.editingNotes && (
        <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg shadow p-4 dark:border dark:border-amber-800/30">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-amber-200 mb-2">
            📝 Notes
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
            {song.editingNotes}
          </p>
        </div>
      )}

      {/* Fixed Control Bar - Always visible, solid background */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-600 shadow-2xl z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleScroll}
                className={`
                  px-4 py-2 rounded-lg font-medium transition text-sm
                  ${isScrolling
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }
                `}
                title="Toggle Auto-scroll (Space)"
              >
                {isScrolling ? '⏸ Pause' : '▶ Scroll'}
              </button>

              {/* Speed */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-2">
                <button
                  onClick={decreaseSpeed}
                  className="px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition disabled:opacity-30 text-xs"
                  disabled={scrollSpeed <= SCROLL.MIN_SPEED}
                  title="Slower ([)"
                >
                  🐢
                </button>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 min-w-[2.5rem] text-center">
                  {scrollSpeed.toFixed(1)}x
                </span>
                <button
                  onClick={increaseSpeed}
                  className="px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition disabled:opacity-30 text-xs"
                  disabled={scrollSpeed >= SCROLL.MAX_SPEED}
                  title="Faster (])"
                >
                  🐇
                </button>
              </div>
            </div>

            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 hidden md:block"></div>

            {/* Display Controls */}
            <div className="flex items-center gap-2">
              {/* Font Size */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-2">
                <button
                  onClick={decreaseFontSize}
                  className="px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition disabled:opacity-30 text-xs font-bold"
                  disabled={fontSize <= FONT.MIN_SIZE}
                  title="Smaller (-)"
                >
                  A-
                </button>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 min-w-[1.5rem] text-center">
                  {fontSize}
                </span>
                <button
                  onClick={increaseFontSize}
                  className="px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition disabled:opacity-30 text-xs font-bold"
                  disabled={fontSize >= FONT.MAX_SIZE}
                  title="Larger (+)"
                >
                  A+
                </button>
              </div>

              {/* Toggle Chords */}
              <button
                onClick={toggleChords}
                className={`
                  px-4 py-2 rounded-lg font-medium transition text-sm
                  ${showChords
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                  }
                `}
                title="Toggle Chords (C)"
              >
                {showChords ? '👁 Chords' : '🚫 Chords'}
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium"
                title="Fullscreen (F)"
              >
                {isFullscreen ? '⛶ Exit' : '⛶ Full'}
              </button>
            </div>

            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 hidden md:block"></div>

            {/* Shortcuts */}
            <div className="relative">
              <button
                onMouseEnter={() => setShowShortcuts(true)}
                onMouseLeave={() => setShowShortcuts(false)}
                onClick={() => setShowShortcuts(!showShortcuts)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium"
                title="Keyboard Shortcuts"
              >
                ⌨️
              </button>

              {showShortcuts && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 text-white text-xs rounded-lg shadow-2xl p-3 z-50">
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><span className="text-gray-400">Space</span><span>Scroll</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">[ / ]</span><span>Speed</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">+ / -</span><span>Font</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">C</span><span>Chords</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">F</span><span>Fullscreen</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">R</span><span>Random</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">G/Y/S</span><span>Search</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Esc</span><span>Exit</span></div>
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-3 h-3 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
