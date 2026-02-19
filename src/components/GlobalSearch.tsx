import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSongs } from '../services/firestore';
import type { Song } from '../types/song';

export default function GlobalSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load songs on mount
  useEffect(() => {
    getAllSongs().then(setSongs).catch(console.error);
  }, []);

  // Filter songs as user types
  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      const filtered = songs
        .filter((song) => {
          const term = searchTerm.toLowerCase();
          return (
            song.title.toLowerCase().includes(term) ||
            song.artist?.toLowerCase().includes(term)
          );
        })
        .slice(0, 8); // Limit to 8 results
      setFilteredSongs(filtered);
      setShowDropdown(filtered.length > 0);
      setSelectedIndex(-1);
    } else {
      setFilteredSongs([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  }, [searchTerm, songs]);

  // Global keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if modifier keys are pressed (Cmd, Ctrl, Alt)
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      // Focus search on "/" key — but not when typing in an input, textarea, or rich editor (e.g. CodeMirror)
      const target = e.target as HTMLElement;
      if (
        e.key === '/' &&
        document.activeElement !== searchRef.current &&
        target.tagName !== 'INPUT' &&
        target.tagName !== 'TEXTAREA' &&
        !target.isContentEditable &&
        target.contentEditable !== 'true'
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle keyboard navigation in dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredSongs.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredSongs.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredSongs.length) {
          navigateToSong(filteredSongs[selectedIndex].id);
        } else if (searchTerm.trim()) {
          navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
          closeDropdown();
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        searchRef.current?.blur();
        break;
    }
  };

  const navigateToSong = (songId: string) => {
    navigate(`/song/${songId}`);
    closeDropdown();
    setSearchTerm('');
  };

  const closeDropdown = () => {
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !searchRef.current?.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex-1 max-w-md mx-4 relative">
      <div className="relative">
        <input
          ref={searchRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search songs... (press / to focus)"
          className="w-full px-4 py-2 pr-10 rounded-lg text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        <button
          type="button"
          onClick={() => {
            if (searchTerm.trim()) {
              navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
              closeDropdown();
            }
          }}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          🔍
        </button>
      </div>

      {/* Dropdown Results */}
      {showDropdown && filteredSongs.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50"
        >
          {filteredSongs.map((song, index) => (
            <div
              key={song.id}
              onClick={() => navigateToSong(song.id)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`px-4 py-3 cursor-pointer transition ${
                index === selectedIndex
                  ? 'bg-red-50 dark:bg-red-900/30 border-l-4 border-red-600'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-l-4 border-transparent'
              }`}
            >
              <div className="font-semibold text-gray-800 dark:text-gray-100">{song.title}</div>
              {song.artist && (
                <div className="text-sm text-gray-600 dark:text-gray-400">{song.artist}</div>
              )}
            </div>
          ))}
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
            Use ↑↓ to navigate, Enter to select, Esc to close
          </div>
        </div>
      )}
    </div>
  );
}
