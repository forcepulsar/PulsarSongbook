import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import SongList from './components/SongList';
import SongDisplay from './components/SongDisplay';
import SongEdit from './components/SongEdit';
import DataExport from './components/DataExport';
import OfflineIndicator from './components/OfflineIndicator';
import InstallPrompt from './components/InstallPrompt';
import GlobalSearch from './components/GlobalSearch';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { currentUser, signOut } = useAuth();

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
                  className="hidden md:inline-block px-3 py-2 rounded hover:bg-red-700 transition text-sm md:text-base"
                >
                  Settings
                </Link>
              </nav>

              {/* Auth UI */}
              <div className="flex items-center gap-2 md:gap-4 ml-auto">
                {currentUser ? (
                  <>
                    <span className="text-xs md:text-sm text-white/80 hidden md:inline truncate max-w-[150px]">
                      {currentUser.email}
                    </span>
                    <button
                      onClick={() => signOut()}
                      className="px-3 py-2 rounded hover:bg-red-700 transition text-xs md:text-sm whitespace-nowrap"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="px-3 py-2 rounded hover:bg-red-700 transition text-xs md:text-sm whitespace-nowrap"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<SongList />} />
            <Route path="/song/:id" element={<SongDisplay />} />
            <Route
              path="/song/:id/edit"
              element={
                <ProtectedRoute>
                  <SongEdit />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/settings" element={<DataExport />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
