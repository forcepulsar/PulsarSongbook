import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';

export default function SongList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

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

        return matchesSearch && matchesLanguage && matchesDifficulty;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [songs, searchTerm, languageFilter, difficultyFilter]);

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
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Song Library</h1>
            <p className="text-gray-600 mt-1">
              {filteredSongs.length} of {songs.length} songs
            </p>
          </div>
          <button
            onClick={handleRandomSong}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
            disabled={filteredSongs.length === 0}
          >
            🎲 Random Song
          </button>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-3">
            <input
              type="text"
              placeholder="Search by title or artist..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            />
          </div>

          {/* Language Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            >
              <option value="all">All Languages</option>
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty
            </label>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            >
              <option value="all">All Levels</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setLanguageFilter('all');
                setDifficultyFilter('all');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Clear Filters
            </button>
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
              <Link
                key={song.id}
                to={`/song/${song.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-800 truncate">
                      {song.title}
                    </h3>
                    {song.artist && (
                      <p className="text-gray-600 truncate">{song.artist}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {song.language && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {song.language}
                      </span>
                    )}
                    {song.difficulty && (
                      <span
                        className={`px-2 py-1 text-xs rounded ${
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
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                        {song.myLevel}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
