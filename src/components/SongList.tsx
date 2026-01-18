import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';

export default function SongList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Update search term when URL changes
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
  }, [searchParams]);

  // Load all songs from IndexedDB
  const songs = useLiveQuery(() => db.songs.toArray(), []);

  // Filter and sort songs
  const filteredSongs = useMemo(() => {
    if (!songs) return [];

    return songs
      .filter((song) => {
        // Search filter
        const matchesSearch =
          searchTerm === '' ||
          song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          song.artist?.toLowerCase().includes(searchTerm.toLowerCase());

        // Language filter
        const matchesLanguage =
          languageFilter === 'all' || song.language === languageFilter;

        // Difficulty filter
        const matchesDifficulty =
          difficultyFilter === 'all' || song.difficulty === difficultyFilter;

        // ChordPro Status filter
        const matchesStatus =
          statusFilter === 'all' || song.chordProStatus === statusFilter;

        // Priority filter
        const matchesPriority =
          priorityFilter === 'all' ||
          (priorityFilter === 'has-priority' && song.priority && song.priority.trim() !== '') ||
          (priorityFilter === 'no-priority' && (!song.priority || song.priority.trim() === ''));

        return matchesSearch && matchesLanguage && matchesDifficulty && matchesStatus && matchesPriority;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [songs, searchTerm, languageFilter, difficultyFilter, statusFilter, priorityFilter]);

  // Random song function
  const handleRandomSong = () => {
    if (filteredSongs.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredSongs.length);
    const randomSong = filteredSongs[randomIndex];
    window.location.href = `/song/${randomSong.id}`;
  };

  if (!songs) {
    return <div className="text-center py-12 text-gray-600">Loading songs...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-bold text-gray-800 truncate">Song Library</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              {filteredSongs.length} of {songs.length} songs
            </p>
          </div>
          <button
            onClick={handleRandomSong}
            className="px-3 py-2 md:px-6 md:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm md:text-base font-semibold whitespace-nowrap ml-2"
            disabled={filteredSongs.length === 0}
          >
            <span className="md:hidden">🎲</span>
            <span className="hidden md:inline">🎲 Random Song</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search by title or artist..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            />
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Language Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* ChordPro Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="has-priority">Has Priority</option>
                <option value="no-priority">No Priority</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setLanguageFilter('all');
                  setDifficultyFilter('all');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setSearchParams({});
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Song List */}
      {filteredSongs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">No songs found</p>
          <p className="text-gray-500 mt-2">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredSongs.map((song) => (
              <div key={song.id} className="relative group">
                <Link
                  to={`/song/${song.id}`}
                  className="block px-4 md:px-6 py-3 md:py-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base md:text-lg font-semibold text-gray-800 truncate">
                        {song.title}
                      </h3>
                      {song.artist && (
                        <p className="text-sm md:text-base text-gray-600 truncate">{song.artist}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 ml-2 md:ml-4">
                      {/* Hide badges on mobile, show on desktop */}
                      {song.language && (
                        <span className="hidden md:inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {song.language}
                        </span>
                      )}
                      {song.difficulty && (
                        <span
                          className={`hidden md:inline-block px-2 py-1 text-xs rounded ${
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
                        <span className="hidden md:inline-block px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                          {song.myLevel}
                        </span>
                      )}
                      <Link
                        to={`/song/${song.id}/edit`}
                        className="p-1.5 md:p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition text-sm"
                        onClick={(e) => e.stopPropagation()}
                        title="Edit song"
                      >
                        ✏️
                      </Link>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
