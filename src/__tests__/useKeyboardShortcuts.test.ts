import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  it('fires a callback when a shortcut key is pressed on a normal element', () => {
    const onToggleChords = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleChords }));

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));

    expect(onToggleChords).toHaveBeenCalledOnce();
  });

  it('does not fire shortcuts when typing in an <input>', () => {
    const onToggleChords = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleChords }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    document.body.removeChild(input);

    expect(onToggleChords).not.toHaveBeenCalled();
  });

  it('does not fire shortcuts when typing in a <textarea>', () => {
    const onToggleChords = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleChords }));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    document.body.removeChild(textarea);

    expect(onToggleChords).not.toHaveBeenCalled();
  });

  it('does not fire shortcuts when typing in a contentEditable element (e.g. CodeMirror)', () => {
    const onToggleChords = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleChords }));

    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    document.body.appendChild(editor);
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    document.body.removeChild(editor);

    expect(onToggleChords).not.toHaveBeenCalled();
  });

  it('exits fullscreen on Escape when fullscreen is on', () => {
    const onToggleFullscreen = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleFullscreen, isFullscreen: true }));

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onToggleFullscreen).toHaveBeenCalledOnce();
  });

  it('ignores Escape when not fullscreen', () => {
    const onToggleFullscreen = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleFullscreen, isFullscreen: false }));

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onToggleFullscreen).not.toHaveBeenCalled();
  });

  it('toggles fullscreen with F in both directions', () => {
    const onToggleFullscreen = vi.fn();
    const { rerender } = renderHook(
      ({ isFullscreen }) => useKeyboardShortcuts({ onToggleFullscreen, isFullscreen }),
      { initialProps: { isFullscreen: false } }
    );

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
    expect(onToggleFullscreen).toHaveBeenCalledOnce();

    rerender({ isFullscreen: true });
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
    expect(onToggleFullscreen).toHaveBeenCalledTimes(2);
  });

  it('still exits fullscreen on Escape when focus is stuck in an input', () => {
    // The app header sits behind the fullscreen overlay; "/" can put focus in its
    // search box. Escape must remain an escape hatch or the user is trapped.
    const onToggleFullscreen = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleFullscreen, isFullscreen: true }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.body.removeChild(input);

    expect(onToggleFullscreen).toHaveBeenCalledOnce();
  });

  it('ignores shortcuts pressed with a modifier so browser commands still work', () => {
    const onToggleFullscreen = vi.fn();
    const onRandomSong = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleFullscreen, onRandomSong }));

    // Cmd/Ctrl+F = browser find, Cmd/Ctrl+R = reload
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', metaKey: true, bubbles: true }));
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }));
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', metaKey: true, bubbles: true }));

    expect(onToggleFullscreen).not.toHaveBeenCalled();
    expect(onRandomSong).not.toHaveBeenCalled();
  });

  it('fires multiple different shortcuts correctly', () => {
    const onToggleChords = vi.fn();
    const onToggleAutoScroll = vi.fn();
    const onIncreaseFontSize = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleChords, onToggleAutoScroll, onIncreaseFontSize }));

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));

    expect(onToggleChords).toHaveBeenCalledOnce();
    expect(onToggleAutoScroll).toHaveBeenCalledOnce();
    expect(onIncreaseFontSize).toHaveBeenCalledOnce();
  });
});
