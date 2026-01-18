import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { initializeDatabase } from './db/initialize';
import SongList from './components/SongList';
import SongDisplay from './components/SongDisplay';
import SongEdit from './components/SongEdit';
import DataExport from './components/DataExport';
import OfflineIndicator from './components/OfflineIndicator';
import InstallPrompt from './components/InstallPrompt';
import GlobalSearch from './components/GlobalSearch';

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize database on app startup
    initializeDatabase()
      .then(() => {
        console.log('[App] Database initialized successfully');
        setIsInitializing(false);
      })
      .catch((err) => {
        console.error('[App] Failed to initialize database:', err);
        setError(err.message);
        setIsInitializing(false);
      });
  }, []);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Pulsar Songbook...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-red-600 mb-2">Initialization Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* PWA Components */}
      <OfflineIndicator />
      <InstallPrompt />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-red-600 text-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl md:text-2xl font-bold whitespace-nowrap">
                🎸 Pulsar
              </Link>
              <GlobalSearch />
              <nav className="flex gap-2">
                <Link
                  to="/"
                  className="px-3 py-2 rounded hover:bg-red-700 transition text-sm md:text-base"
                >
                  Songs
                </Link>
                <Link
                  to="/settings"
                  className="px-3 py-2 rounded hover:bg-red-700 transition text-sm md:text-base"
                >
                  Settings
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<SongList />} />
            <Route path="/song/:id" element={<SongDisplay />} />
            <Route path="/song/:id/edit" element={<SongEdit />} />
            <Route path="/settings" element={<DataExport />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
