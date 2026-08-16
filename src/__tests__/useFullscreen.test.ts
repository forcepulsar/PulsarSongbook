import { renderHook, act } from '@testing-library/react';
import { useFullscreen } from '../hooks/useFullscreen';

describe('useFullscreen (CSS fullscreen)', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('starts out of fullscreen', () => {
    const { result } = renderHook(() => useFullscreen());
    expect(result.current.isFullscreen).toBe(false);
  });

  it('toggles in and out', () => {
    const { result } = renderHook(() => useFullscreen());

    act(() => result.current.toggleFullscreen());
    expect(result.current.isFullscreen).toBe(true);

    act(() => result.current.toggleFullscreen());
    expect(result.current.isFullscreen).toBe(false);
  });

  it('never calls the browser Fullscreen API, so no "press Esc" toast appears', () => {
    const requestFullscreen = vi.fn();
    const exitFullscreen = vi.fn();
    document.documentElement.requestFullscreen = requestFullscreen;
    document.exitFullscreen = exitFullscreen;

    const { result } = renderHook(() => useFullscreen());
    act(() => result.current.enterFullscreen());
    act(() => result.current.exitFullscreen());

    expect(requestFullscreen).not.toHaveBeenCalled();
    expect(exitFullscreen).not.toHaveBeenCalled();
  });

  it('locks body scroll while fullscreen and restores it on exit', () => {
    const { result } = renderHook(() => useFullscreen());

    act(() => result.current.enterFullscreen());
    expect(document.body.style.overflow).toBe('hidden');

    act(() => result.current.exitFullscreen());
    expect(document.body.style.overflow).toBe('');
  });

  it('restores body scroll if it unmounts while still fullscreen', () => {
    const { result, unmount } = renderHook(() => useFullscreen());

    act(() => result.current.enterFullscreen());
    unmount();

    expect(document.body.style.overflow).toBe('');
  });
});
