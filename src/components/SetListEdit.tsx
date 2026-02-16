import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getSetListWithSongs, createSetList, updateSetList, getAllSongs, addSongToSetList, removeSongFromSetList, reorderSetListSongs } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { SetListWithSongs, Song } from '../types/song';

export default function SetListEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const isNewSetList = location.pathname === '/setlist/new';

  const [setList, setSetList] = useState<SetListWithSongs | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load all songs
        const songs = await getAllSongs();
        setAllSongs(songs);

        // Load set list if editing
        if (!isNewSetList && id) {
          const loadedSetList = await getSetListWithSongs(id);
          if (loadedSetList) {
            setSetList(loadedSetList);
            setName(loadedSetList.name);
            setDescription(loadedSetList.description || '');
            setSelectedSongs(loadedSetList.songs);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isNewSetList]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Name is required');
      return;
    }

    if (!currentUser) {
      alert('You must be logged in');
      return;
    }

    setIsSaving(true);
    try {
      if (isNewSetList) {
        // Create new set list
        const newSetListId = await createSetList(
          { name: name.trim(), description: description.trim() || undefined },
          currentUser.uid
        );

        // Add songs
        for (const song of selectedSongs) {
          await addSongToSetList(newSetListId, song.id);
        }

        alert('Set list created successfully!');
        navigate(`/setlist/${newSetListId}`);
      } else {
        if (!id) return;

        // Update set list metadata
        await updateSetList(id, {
          name: name.trim(),
          description: description.trim() || undefined
        });

        // Update song list
        const currentSongIds = setList?.songs.map((s) => s.id) || [];
        const newSongIds = selectedSongs.map((s) => s.id);

        // Add new songs
        for (const song of selectedSongs) {
          if (!currentSongIds.includes(song.id)) {
            await addSongToSetList(id, song.id);
          }
        }

        // Remove deleted songs
        for (const songId of currentSongIds) {
          if (!newSongIds.includes(songId)) {
            await removeSongFromSetList(id, songId);
          }
        }

        // Reorder if needed
        if (newSongIds.length > 0) {
          await reorderSetListSongs(id, newSongIds);
        }

        alert('Set list updated successfully!');
        navigate(`/setlist/${id}`);
      }
    } catch (error) {
      alert(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSong = (song: Song) => {
    if (!selectedSongs.find((s) => s.id === song.id)) {
      setSelectedSongs([...selectedSongs, song]);
    }
  };

  const handleRemoveSong = (songId: string) => {
    setSelectedSongs(selectedSongs.filter((s) => s.id !== songId));
  };

  const moveSongUp = (index: number) => {
    if (index === 0) return;
    const newSongs = [...selectedSongs];
    [newSongs[index - 1], newSongs[index]] = [newSongs[index], newSongs[index - 1]];
    setSelectedSongs(newSongs);
  };

  const moveSongDown = (index: number) => {
    if (index === selectedSongs.length - 1) return;
    const newSongs = [...selectedSongs];
    [newSongs[index], newSongs[index + 1]] = [newSongs[index + 1], newSongs[index]];
    setSelectedSongs(newSongs);
  };

  const availableSongs = allSongs
    .filter((song) => !selectedSongs.find((s) => s.id === song.id))
    .filter((song) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        song.title.toLowerCase().includes(query) ||
        song.artist?.toLowerCase().includes(query)
      );
    });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!setList && !isNewSetList) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">Set list not found</p>
          <button
            onClick={() => navigate('/setlists')}
            className="inline-block mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Back to Set Lists
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            {isNewSetList ? 'Create New Set List' : 'Edit Set List'}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-6 py-2 rounded-lg transition font-semibold ${
                isSaving
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isSaving ? 'Saving...' : isNewSetList ? 'Create' : 'Save Changes'}
            </button>
            <button
              onClick={() => navigate(isNewSetList ? '/setlists' : `/setlist/${id}`)}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition dark:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Metadata */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Set List Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                placeholder="e.g., Sunday Morning Worship"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                rows={3}
                placeholder="Optional description..."
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mt-6 mb-3">
            Available Songs ({availableSongs.length})
          </h3>

          {/* Search Box */}
          <div className="mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableSongs.map((song) => (
              <div
                key={song.id}
                className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{song.title}</p>
                  {song.artist && <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{song.artist}</p>}
                </div>
                <button
                  onClick={() => handleAddSong(song)}
                  className="ml-2 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Selected Songs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            Songs in Set List ({selectedSongs.length})
          </h2>
          {selectedSongs.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-12">No songs added yet</p>
          ) : (
            <div className="space-y-2">
              {selectedSongs.map((song, index) => (
                <div
                  key={song.id}
                  className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveSongUp(index)}
                      disabled={index === 0}
                      className="px-1 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveSongDown(index)}
                      disabled={index === selectedSongs.length - 1}
                      className="px-1 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400 font-mono text-sm w-6">{index + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{song.title}</p>
                    {song.artist && <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{song.artist}</p>}
                  </div>
                  <button
                    onClick={() => handleRemoveSong(song.id)}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
