import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useState } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <BrowserRouter>
      {/* PWA Components */}
      <OfflineIndicator />
      <InstallPrompt />

      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {/* Header */}
        <header className="bg-red-600 dark:bg-red-700 text-white shadow-lg sticky top-0 z-40">
          <div className="container mx-auto px-4 py-3">
            {/* Desktop Header */}
            <div className="hidden md:flex items-center gap-4">
              <Link to="/" className="text-2xl font-bold whitespace-nowrap">
                🎸 Pulsar
              </Link>
              <GlobalSearch />
              <nav className="flex gap-2">
                <Link to="/" className="px-3 py-2 rounded hover:bg-red-700 transition">
                  Songs
                </Link>
                <Link to="/setlists" className="px-3 py-2 rounded hover:bg-red-700 transition">
                  Set Lists
                </Link>
                {currentUser && (
                  <Link to="/settings" className="px-3 py-2 rounded hover:bg-red-700 transition">
                    Settings
                  </Link>
                )}
              </nav>

              <button
                onClick={toggleTheme}
                className="px-2 py-2 rounded hover:bg-red-700 transition text-lg"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>

              <div className="flex items-center gap-4">
                {currentUser ? (
                  <>
                    <span className="text-sm text-white/80 truncate max-w-[150px]">
                      {currentUser.email}
                    </span>
                    <button
                      onClick={() => signOut()}
                      className="px-3 py-2 rounded hover:bg-red-700 transition text-sm whitespace-nowrap"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="px-3 py-2 rounded hover:bg-red-700 transition text-sm">
                    Sign In
                  </Link>
                )}
              </div>
            </div>

            {/* Mobile Header */}
            <div className="flex md:hidden items-center justify-between">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded hover:bg-red-700 transition"
                aria-label="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              <Link to="/" className="text-xl font-bold">
                🎸 Pulsar
              </Link>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded hover:bg-red-700 transition"
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-red-700 dark:bg-red-800 border-t border-red-800 dark:border-red-900">
              <nav className="container mx-auto px-4 py-4 space-y-2">
                <GlobalSearch />

                <Link
                  to="/"
                  className="block px-4 py-3 rounded hover:bg-red-600 transition text-base font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  📚 Songs
                </Link>
                <Link
                  to="/setlists"
                  className="block px-4 py-3 rounded hover:bg-red-600 transition text-base font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  📋 Set Lists
                </Link>
                {currentUser && (
                  <Link
                    to="/settings"
                    className="block px-4 py-3 rounded hover:bg-red-600 transition text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    ⚙️ Settings
                  </Link>
                )}

                <div className="pt-4 mt-4 border-t border-red-600">
                  {currentUser ? (
                    <>
                      <div className="px-4 py-2 text-sm text-white/80 truncate">
                        {currentUser.email}
                      </div>
                      <button
                        onClick={() => {
                          signOut();
                          setMobileMenuOpen(false);
                        }}
                        className="block w-full px-4 py-3 rounded hover:bg-red-600 transition text-base font-medium text-left"
                      >
                        🚪 Sign Out
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      className="block px-4 py-3 rounded hover:bg-red-600 transition text-base font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      🔐 Sign In
                    </Link>
                  )}
                </div>
              </nav>
            </div>
          )}
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
