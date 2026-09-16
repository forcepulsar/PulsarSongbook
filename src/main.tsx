import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'

// =============================================================================
// Legacy redirect
// =============================================================================
// Handled by an inline ES5 script in index.html, NOT here. This file is bundled
// to ES2022, so on Safari 12 it fails to parse and nothing in it runs - which
// is precisely why the old in-bundle check never worked. See issue #12.

// =============================================================================
// Service Worker Registration
// =============================================================================

// Register service worker (vite-plugin-pwa handles this automatically)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('[PWA] Service Worker registered:', registration);
      },
      (error) => {
        console.log('[PWA] Service Worker registration failed:', error);
      }
    );
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
)
