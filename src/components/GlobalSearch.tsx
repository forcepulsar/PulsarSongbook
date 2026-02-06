import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAllSongs } from '../services/firestore';
import type { Song } from '../types/song';

export default function GlobalSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const location = useLocation();
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

      // Focus search on "/" key
      if (e.key === '/' && document.activeElement !== searchRef.current) {
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

  // Hide on song library page (it has its own search)
  if (location.pathname === '/') {
    return null;
  }

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
          className="w-full px-4 py-2 pr-10 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        <button
          type="button"
          onClick={() => {
            if (searchTerm.trim()) {
              navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
              closeDropdown();
            }
          }}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          🔍
        </button>
      </div>

      {/* Dropdown Results - Fixed on mobile, absolute on desktop */}
      {showDropdown && filteredSongs.length > 0 && (
        <div
          ref={dropdownRef}
          className="fixed md:absolute top-[60px] md:top-full left-4 right-4 md:left-0 md:right-0 mt-0 md:mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50"
        >
          {filteredSongs.map((song, index) => (
            <div
              key={song.id}
              onClick={() => navigateToSong(song.id)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`px-4 py-3 cursor-pointer transition ${
                index === selectedIndex
                  ? 'bg-red-50 border-l-4 border-red-600'
                  : 'hover:bg-gray-50 border-l-4 border-transparent'
              }`}
            >
              <div className="font-semibold text-gray-800">{song.title}</div>
              {song.artist && (
                <div className="text-sm text-gray-600">{song.artist}</div>
              )}
            </div>
          ))}
          <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 text-center">
            Use ↑↓ to navigate, Enter to select, Esc to close
          </div>
        </div>
      )}
    </div>
  );
}
