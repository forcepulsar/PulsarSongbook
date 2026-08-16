import { useState, useEffect, useCallback } from 'react';

interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
}

/**
 * CSS fullscreen: the song fills the browser window rather than the whole screen.
 *
 * We deliberately do NOT use the browser Fullscreen API. Browsers hide all their own
 * chrome for it, so they force an unsuppressable "press Esc to exit full screen" toast
 * every time a page enters. Filling the window with a fixed overlay looks the same
 * inside the app — identical in an installed PWA, which has no address bar — and never
 * shows that message. Callers own the layout; this hook owns the flag and scroll lock.
 */
export function useFullscreen(): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(() => setIsFullscreen(true), []);
  const exitFullscreen = useCallback(() => setIsFullscreen(false), []);
  const toggleFullscreen = useCallback(() => setIsFullscreen((prev) => !prev), []);

  // Keep the page behind the overlay from scrolling or rubber-banding
  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
}
