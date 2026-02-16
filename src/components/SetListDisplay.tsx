import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getSetListWithSongs, deleteSetList } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { SetListWithSongs } from '../types/song';

export default function SetListDisplay() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isApproved } = useAuth();
  const [setList, setSetList] = useState<SetListWithSongs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    getSetListWithSongs(id)
      .then(setSetList)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id || !setList) return;
    if (!window.confirm(`Are you sure you want to delete "${setList.name}"? This cannot be undone.`)) return;

    try {
      await deleteSetList(id);
      alert('Set list deleted successfully');
      navigate('/setlists');
    } catch (error) {
      alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!setList) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">Set list not found</p>
          <Link
            to="/setlists"
            className="inline-block mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Back to Set Lists
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 md:p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">{setList.name}</h1>
            {setList.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-2">{setList.description}</p>
            )}
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              {setList.songs.length} song{setList.songs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {isApproved && (
              <>
                <Link
                  to={`/setlist/${id}/edit`}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                >
                  ✏️ Edit
                </Link>
                <button
                  onClick={handleDelete}
                  className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                >
                  🗑️ Delete
                </button>
              </>
            )}
            <button
              onClick={() => navigate('/setlists')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm dark:text-gray-200"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      {/* Songs */}
      {setList.songs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">No songs in this set list yet</p>
          {isApproved && (
            <Link
              to={`/setlist/${id}/edit`}
              className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Add Songs
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {setList.songs.map((song, index) => (
              <Link
                key={song.id}
                to={`/song/${song.id}`}
                className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 dark:text-gray-400 font-mono text-sm w-8">{index + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {song.title}
                    </h3>
                    {song.artist && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{song.artist}</p>
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
