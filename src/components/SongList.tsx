import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getAllSongs } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { Song } from '../types/song';

type SortColumn = 'title' | 'artist' | 'language' | 'difficulty' | 'chordProStatus' | 'priority';
type SortDirection = 'asc' | 'desc';

export default function SongList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isApproved } = useAuth();
  const navigate = useNavigate();

  // Update search term when URL changes
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
  }, [searchParams]);

  // Load all songs from Firestore
  useEffect(() => {
    getAllSongs()
      .then(setSongs)
      .catch((err) => {
        console.error('Error loading songs:', err);
        setError('Failed to load songs');
      })
      .finally(() => setLoading(false));
  }, []);

  // Handle column sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter and sort songs
  const filteredSongs = useMemo(() => {
    if (!songs) return [];

    const filtered = songs.filter((song) => {
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
    });

    // Sort the filtered results
    return filtered.sort((a, b) => {
      let aVal: any = a[sortColumn];
      let bVal: any = b[sortColumn];

      // Handle undefined/null values - put them at the end
      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;

      // String comparison (case-insensitive)
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // Generic comparison
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [songs, searchTerm, languageFilter, difficultyFilter, statusFilter, priorityFilter, sortColumn, sortDirection]);

  // Random song function
  const handleRandomSong = () => {
    if (filteredSongs.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredSongs.length);
    const randomSong = filteredSongs[randomIndex];
    navigate(`/song/${randomSong.id}`);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading songs...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 truncate">Song Library</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
              {filteredSongs.length} of {songs.length} songs
            </p>
          </div>
          <div className="flex gap-2 ml-2">
            {isApproved && (
              <Link
                to="/song/new"
                className="px-3 py-2 md:px-6 md:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm md:text-base font-semibold whitespace-nowrap"
              >
                <span className="md:hidden">+</span>
                <span className="hidden md:inline">+ New Song</span>
              </Link>
            )}
            <button
              onClick={handleRandomSong}
              className="px-3 py-2 md:px-6 md:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm md:text-base font-semibold whitespace-nowrap"
              disabled={filteredSongs.length === 0}
            >
              <span className="md:hidden">🎲</span>
              <span className="hidden md:inline">🎲 Random Song</span>
            </button>
          </div>
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
            />
          </div>

          {/* Filters Grid - Dynamic based on user role */}
          <div className={`grid grid-cols-2 gap-3 ${isApproved ? 'md:grid-cols-5' : 'md:grid-cols-3'}`}>
            {/* Language Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              >
                <option value="all">All</option>
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Difficulty
              </label>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              >
                <option value="all">All</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Very Hard">Very Hard</option>
              </select>
            </div>

            {/* Admin-only filters */}
            {isApproved && (
              <>
                {/* ChordPro Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                  >
                    <option value="all">All</option>
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                  >
                    <option value="all">All</option>
                    <option value="has-priority">Has Priority</option>
                    <option value="no-priority">No Priority</option>
                  </select>
                </div>
              </>
            )}

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
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Song List */}
      {filteredSongs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">No songs found</p>
          <p className="text-gray-500 dark:text-gray-500 mt-2">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Mobile View - Card Layout (same for all users) */}
          <div className="md:hidden bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSongs.map((song) => (
                <div key={song.id} className="relative group">
                  <Link
                    to={`/song/${song.id}`}
                    className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
                          {song.title}
                        </h3>
                        {song.artist && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{song.artist}</p>
                        )}
                      </div>
                      {isApproved && (
                        <Link
                          to={`/song/${song.id}/edit`}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition text-sm"
                          onClick={(e) => e.stopPropagation()}
                          title="Edit song"
                        >
                          ✏️
                        </Link>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop View - Table Layout */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th
                      onClick={() => handleSort('title')}
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition select-none"
                    >
                      <div className="flex items-center gap-2">
                        <span>Title</span>
                        {sortColumn === 'title' && (
                          <span className="text-red-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('artist')}
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition select-none"
                    >
                      <div className="flex items-center gap-2">
                        <span>Artist</span>
                        {sortColumn === 'artist' && (
                          <span className="text-red-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('language')}
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition select-none"
                    >
                      <div className="flex items-center gap-2">
                        <span>Language</span>
                        {sortColumn === 'language' && (
                          <span className="text-red-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('difficulty')}
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition select-none"
                    >
                      <div className="flex items-center gap-2">
                        <span>Difficulty</span>
                        {sortColumn === 'difficulty' && (
                          <span className="text-red-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    {isApproved && (
                      <>
                        <th
                          onClick={() => handleSort('chordProStatus')}
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition select-none"
                        >
                          <div className="flex items-center gap-2">
                            <span>Status</span>
                            {sortColumn === 'chordProStatus' && (
                              <span className="text-red-600">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('priority')}
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition select-none"
                        >
                          <div className="flex items-center gap-2">
                            <span>Priority</span>
                            {sortColumn === 'priority' && (
                              <span className="text-red-600">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSongs.map((song) => (
                    <tr
                      key={song.id}
                      onClick={() => navigate(`/song/${song.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <span className="text-base font-semibold text-gray-800 dark:text-gray-100">
                          {song.title}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {song.artist || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {song.language ? (
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                              song.language === 'English'
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
                                : song.language === 'Spanish'
                                ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {song.language}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {song.difficulty ? (
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                              song.difficulty === 'Easy'
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                                : song.difficulty === 'Medium'
                                ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
                                : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                            }`}
                          >
                            {song.difficulty}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      {isApproved && (
                        <>
                          <td className="px-6 py-4">
                            {song.chordProStatus ? (
                              <span
                                className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                                  song.chordProStatus === 'Done'
                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                                    : song.chordProStatus === 'In Progress'
                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                }`}
                              >
                                {song.chordProStatus}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {song.priority || '-'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              to={`/song/${song.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition"
                              title="Edit song"
                            >
                              ✏️ Edit
                            </Link>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
