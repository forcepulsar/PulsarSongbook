import { useEffect } from 'react';

export interface KeyboardShortcuts {
  onToggleFullscreen?: () => void;
  onToggleAutoScroll?: () => void;
  onIncreaseFontSize?: () => void;
  onDecreaseFontSize?: () => void;
  onIncreaseScrollSpeed?: () => void;
  onDecreaseScrollSpeed?: () => void;
  onToggleChords?: () => void;
  onRandomSong?: () => void;
  onFocusSearch?: () => void;
  onOpenGoogle?: () => void;
  onOpenYouTube?: () => void;
  onOpenSpotify?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      // F - Toggle fullscreen (requires Shift if not in fullscreen)
      if (key === 'f' && shortcuts.onToggleFullscreen) {
        if (!document.fullscreenElement || event.shiftKey) {
          event.preventDefault();
          shortcuts.onToggleFullscreen();
        }
      }

      // Space - Toggle auto-scroll
      if (key === ' ' && shortcuts.onToggleAutoScroll) {
        event.preventDefault();
        shortcuts.onToggleAutoScroll();
      }

      // + or U - Increase font size
      if ((key === '+' || key === '=' || key === 'u') && shortcuts.onIncreaseFontSize) {
        event.preventDefault();
        shortcuts.onIncreaseFontSize();
      }

      // - or I - Decrease font size
      if ((key === '-' || key === '_' || key === 'i') && shortcuts.onDecreaseFontSize) {
        event.preventDefault();
        shortcuts.onDecreaseFontSize();
      }

      // ] - Increase scroll speed
      if (key === ']' && shortcuts.onIncreaseScrollSpeed) {
        event.preventDefault();
        shortcuts.onIncreaseScrollSpeed();
      }

      // [ - Decrease scroll speed
      if (key === '[' && shortcuts.onDecreaseScrollSpeed) {
        event.preventDefault();
        shortcuts.onDecreaseScrollSpeed();
      }

      // C - Toggle chords visibility
      if (key === 'c' && shortcuts.onToggleChords) {
        event.preventDefault();
        shortcuts.onToggleChords();
      }

      // R - Random song
      if (key === 'r' && shortcuts.onRandomSong) {
        event.preventDefault();
        shortcuts.onRandomSong();
      }

      // G - Open Google search
      if (key === 'g' && shortcuts.onOpenGoogle) {
        event.preventDefault();
        shortcuts.onOpenGoogle();
      }

      // Y - Open YouTube search
      if (key === 'y' && shortcuts.onOpenYouTube) {
        event.preventDefault();
        shortcuts.onOpenYouTube();
      }

      // S - Open Spotify search
      if (key === 's' && shortcuts.onOpenSpotify) {
        event.preventDefault();
        shortcuts.onOpenSpotify();
      }

      // / - Focus search
      if (key === '/' && shortcuts.onFocusSearch) {
        event.preventDefault();
        shortcuts.onFocusSearch();
      }

      // Escape - Exit fullscreen
      if (key === 'escape' && document.fullscreenElement && shortcuts.onToggleFullscreen) {
        event.preventDefault();
        shortcuts.onToggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled]);
}
