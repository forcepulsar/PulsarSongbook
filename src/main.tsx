import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'

// =============================================================================
// iOS 12 Detection & Redirect to Legacy Version
// =============================================================================

/**
 * Detect iOS 12 and redirect to legacy version
 * Legacy version uses ES5-compatible vanilla JavaScript for maximum compatibility
 */
function detectAndRedirectIOS12() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;

  if (isIOS) {
    // Extract iOS version from user agent
    const versionMatch = ua.match(/OS (\d+)_/);
    if (versionMatch) {
      const majorVersion = parseInt(versionMatch[1], 10);

      // Redirect iOS 12 and below to legacy version
      if (majorVersion <= 12) {
        console.log('[Compatibility] iOS 12 detected, redirecting to legacy version');
        window.location.href = '/legacy/';
        return true; // Stop execution
      }
    }
  }

  return false;
}

// Run detection before starting the app
const shouldRedirect = detectAndRedirectIOS12();
if (shouldRedirect) {
  // Don't continue with app initialization
  // @ts-ignore - Exit early
  throw new Error('Redirecting to legacy version');
}

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
