import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import SongList from './components/SongList';
import SongDisplay from './components/SongDisplay';
import SongEdit from './components/SongEdit';
import SetListList from './components/SetListList';
import SetListDisplay from './components/SetListDisplay';
import SetListEdit from './components/SetListEdit';
import DataExport from './components/DataExport';
import OfflineIndicator from './components/OfflineIndicator';
import InstallPrompt from './components/InstallPrompt';
import GlobalSearch from './components/GlobalSearch';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';

function App() {
  const { currentUser, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      {/* PWA Components */}
      <OfflineIndicator />
      <InstallPrompt />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-red-600 dark:bg-red-800 text-white shadow-lg">
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
                  to="/setlists"
                  className="hidden md:inline-block px-3 py-2 rounded hover:bg-red-700 transition text-sm md:text-base"
                >
                  Set Lists
                </Link>
                <Link
                  to="/settings"
                  className="hidden md:inline-block px-3 py-2 rounded hover:bg-red-700 transition text-sm md:text-base"
                >
                  Settings
                </Link>
              </nav>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="px-2 py-2 rounded hover:bg-red-700 transition text-lg"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>

              {/* Auth UI */}
              <div className="flex items-center gap-2 md:gap-4">
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
              path="/song/new"
              element={
                <ProtectedRoute>
                  <SongEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/song/:id/edit"
              element={
                <ProtectedRoute>
                  <SongEdit />
                </ProtectedRoute>
              }
            />
            <Route path="/setlists" element={<SetListList />} />
            <Route
              path="/setlist/new"
              element={
                <ProtectedRoute>
                  <SetListEdit />
                </ProtectedRoute>
              }
            />
            <Route path="/setlist/:id" element={<SetListDisplay />} />
            <Route
              path="/setlist/:id/edit"
              element={
                <ProtectedRoute>
                  <SetListEdit />
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
