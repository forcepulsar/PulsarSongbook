import { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when going back online so it shows again if offline again
  // (handled naturally since isOnline becoming true returns null below)

  if (isOnline || dismissed) return null;

  return (
    <div className="bg-yellow-500 text-white py-2 px-4 text-sm font-medium shadow-lg flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2">
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>
        You're offline. Some features may be limited.
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-yellow-600 transition flex-shrink-0"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
