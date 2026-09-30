import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaGoogle, FaYoutube, FaSpotify } from 'react-icons/fa';
import { getSettings, updateSettings } from '../db/schema';
import { getSong } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import { formatTransposedChordPro, applyAllStyles } from '../lib/chordpro/renderUtils';
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
  const controlsRef = useRef<HTMLDivElement>(null);

  const [fontSize, setFontSize] = useState(FONT.DEFAULT_SIZE);
  const [showChords, setShowChords] = useState(true);
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [transposition, setTransposition] = useState({ id, semitones: 0 });
  // Reset during navigation without carrying a previous song's offset forward.
  if (transposition.id !== id) {
    setTransposition({ id, semitones: 0 });
  }
  const semitones = transposition.id === id ? transposition.semitones : 0;
  const changeTransposition = (value: number) => {
    setTransposition({ id, semitones: Math.max(-12, Math.min(12, value)) });
  };
  const { isApproved } = useAuth();
  const formatted = useMemo(() => {
    try {
      return formatTransposedChordPro(song?.chordProContent ?? '', semitones);
    } catch (error) {
      console.error('[SongDisplay] Failed to render ChordPro:', error);
      return { html: null, unchangedLabels: [] as string[] };
    }
  }, [song, semitones]);
  const unchangedLabels = formatted.unchangedLabels;

  // Reserve the actual toolbar height as controls wrap or review details open.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      pageRef.current?.style.setProperty('--song-controls-height', `${controls.getBoundingClientRect().height}px`);
    });
    observer.observe(controls);
    return () => observer.disconnect();
  }, [loading]);

  // Load song from Firestore
  useEffect(() => {
    if (!id) return;

    let active = true;
    getSong(id)
      .then((result) => { if (active) setSong(result); })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
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

    if (formatted.html !== null) {
      contentRef.current.innerHTML = formatted.html;
      applyAllStyles(contentRef.current, fontSize, showChords);
    } else {
      contentRef.current.textContent = `Failed to parse song content\n\n${song.chordProContent}`;
    }
  }, [song, fontSize, showChords, formatted, loading]);

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

      const otherSongs = allSongs.filter(s => s.id !== id && (s.chordProStatus === 'Done' || s.chordProStatus === 'In Progress'));

      if (otherSongs.length === 0) {
        alert('This is the only song in the library!');
        return;
      }

      const { pickRandom } = await import('../lib/recentSongs');
      const nextId = pickRandom(otherSongs.map(s => s.id), id ?? '');
      if (nextId) navigate(`/song/${nextId}`);
    } catch (error) {
      console.error('Error loading random song:', error);
      alert('Failed to load random song');
    }
  };

  // Quick access handlers
  const handleOpenGoogle = () => window.open(googleUrl, '_blank', 'noopener,noreferrer');
  const handleOpenYouTube = () => window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
  const handleOpenSpotify = () => window.open(spotifyUrl, '_blank', 'noopener,noreferrer');
  const handleOpenChordify = () => window.open(chordifyUrl, '_blank', 'noopener,noreferrer');

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
    onOpenChordify: handleOpenChordify,
    onEditSong: isApproved ? () => navigate(`/song/${id}/edit`) : undefined,
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
  const chordifyQuery = `${song.artist ? `${song.artist} ` : ''}${song.title}`;
  const chordifyUrl = `https://chordify.net/search/${encodeURIComponent(chordifyQuery)}`;

  return (
    <div ref={pageRef} className="max-w-6xl mx-auto pb-[calc(var(--song-controls-height,240px)+1rem)]">
      {/* Single-row header: back | links | actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md px-3 py-2 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition flex-shrink-0"
            title="Back"
          >
            ←
          </button>

          <div className="flex-1" />

          <a href={googleUrl} target="_blank" rel="noopener noreferrer"
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
            title="Search on Google (G)">
            <FaGoogle className="text-base text-[#4285F4]" />
          </a>
          <a href={youtubeUrl} target="_blank" rel="noopener noreferrer"
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
            title="Search on YouTube (Y)">
            <FaYoutube className="text-base text-[#FF0000] dark:text-red-400" />
          </a>
          <a href={spotifyUrl} target="_blank" rel="noopener noreferrer"
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
            title="Search on Spotify (S)">
            <FaSpotify className="text-base text-[#1DB954] dark:text-green-400" />
          </a>
          <a href={chordifyUrl} target="_blank" rel="noopener noreferrer"
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
            title="Search on Chordify (D)">
            <img src="/icons/chordify-icon.png" alt="Chordify" className="w-4 h-4" />
          </a>

          <div className="flex-1" />

          {isApproved && (
            <Link to={`/song/${id}/edit`}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              title="Edit">
              ✏️
            </Link>
          )}
          {/* Hidden in fullscreen: the content overlay covers this header, but the button
              would stay in the tab order. The control bar carries 🎲 there instead. */}
          {!isFullscreen && (
            <button onClick={handleRandomSong}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              title="Random Song (R)">
              🎲
            </button>
          )}
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
          paddingBottom: 'calc(var(--song-controls-height,240px) + 24px)'
        }}
      >
        <div className={isFullscreen ? 'max-w-7xl mx-auto' : ''}>
          <div ref={contentRef} className="chordpro-container p-6 md:p-8 lg:p-10" />
        </div>
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
      <div ref={controlsRef} data-testid="song-controls" className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-600 shadow-2xl z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div role="group" aria-label="Transpose song" className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
              <span className="font-medium">Transpose</span>
              <button type="button" aria-label="Transpose down one semitone"
                disabled={semitones <= -12} onClick={() => changeTransposition(semitones - 1)}
                className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-30">↓</button>
              <output aria-live="polite" className="min-w-[2rem] text-center tabular-nums">
                {semitones > 0 ? '+' : ''}{semitones}<span className="sr-only"> semitones</span>
              </output>
              <button type="button" aria-label="Transpose up one semitone"
                disabled={semitones >= 12} onClick={() => changeTransposition(semitones + 1)}
                className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-30">↑</button>
              <button type="button" aria-label="Reset transposition" disabled={semitones === 0}
                onClick={() => changeTransposition(0)}
                className="px-2 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-30">Reset</button>
            </div>
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
            <div className="flex flex-wrap justify-center items-center gap-2">
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

              {/* Random Song - only here in fullscreen, where the header (and its 🎲) is covered */}
              {isFullscreen && (
                <button
                  onClick={handleRandomSong}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                  title="Random Song (R)"
                >
                  🎲
                </button>
              )}
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
                    <div className="flex justify-between"><span className="text-gray-400">G/Y/S/D</span><span>Search</span></div>
                    {isApproved && <div className="flex justify-between"><span className="text-gray-400">E</span><span>Edit</span></div>}
                    <div className="flex justify-between"><span className="text-gray-400">Esc</span><span>Exit</span></div>
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-3 h-3 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </div>
          </div>
          {semitones !== 0 && unchangedLabels.length > 0 && (
            <details className="mt-2 text-center text-xs text-amber-700 dark:text-amber-300">
              <summary className="cursor-pointer">{unchangedLabels.length} unrecognized annotations left unchanged — review</summary>
              <p className="max-h-16 overflow-auto">{unchangedLabels.join(' · ')}</p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
