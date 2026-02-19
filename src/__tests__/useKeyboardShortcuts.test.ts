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
