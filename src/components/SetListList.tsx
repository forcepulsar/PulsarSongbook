import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllSetLists } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { SetList } from '../types/song';

export default function SetListList() {
  const [setLists, setSetLists] = useState<SetList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isApproved } = useAuth();

  useEffect(() => {
    getAllSetLists()
      .then(setSetLists)
      .catch((err) => {
        console.error('Error loading set lists:', err);
        setError('Failed to load set lists');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading set lists...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-600 dark:text-red-400">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 truncate">Set Lists</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
              {setLists.length} set list{setLists.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isApproved && (
            <Link
              to="/setlist/new"
              className="px-3 py-2 md:px-6 md:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm md:text-base font-semibold whitespace-nowrap"
            >
              <span className="md:hidden">+</span>
              <span className="hidden md:inline">+ New Set List</span>
            </Link>
          )}
        </div>
      </div>

      {/* Set List Cards */}
      {setLists.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">No set lists yet</p>
          {isApproved && (
            <Link
              to="/setlist/new"
              className="inline-block mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Create your first set list
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {setLists.map((setList) => (
            <Link
              key={setList.id}
              to={`/setlist/${setList.id}`}
              className="block bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 md:p-6 hover:shadow-xl transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{setList.name}</h2>
                  {setList.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{setList.description}</p>
                  )}
                  <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                    Updated {new Date(setList.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                {isApproved && (
                  <Link
                    to={`/setlist/${setList.id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="ml-4 px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition"
                  >
                    Edit
                  </Link>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
