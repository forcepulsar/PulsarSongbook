import { renderHook, act } from '@testing-library/react';
import { createRef } from 'react';
import { useFullscreen } from '../hooks/useFullscreen';

// jsdom defines these as prototype getters, so they have to be shadowed, not assigned
function setFullscreenElement(prop: string, value: Element | null) {
  Object.defineProperty(document, prop, { value, configurable: true, writable: true });
}

function makeTarget() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const ref = createRef<HTMLElement>() as React.RefObject<HTMLElement | null>;
  ref.current = el;
  return { el, ref };
}

describe('useFullscreen', () => {
  afterEach(() => {
    setFullscreenElement('fullscreenElement', null);
    setFullscreenElement('webkitFullscreenElement', null);
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('tracks the standard fullscreenchange event', () => {
    const { el } = makeTarget();
    const { result } = renderHook(() => useFullscreen());

    setFullscreenElement('fullscreenElement', el);
    act(() => void document.dispatchEvent(new Event('fullscreenchange')));
    expect(result.current.isFullscreen).toBe(true);

    setFullscreenElement('fullscreenElement', null);
    act(() => void document.dispatchEvent(new Event('fullscreenchange')));
    expect(result.current.isFullscreen).toBe(false);
  });

  it('tracks WebKit, where the vendor event fires but fullscreenElement stays empty', () => {
    const { el } = makeTarget();
    const { result } = renderHook(() => useFullscreen());

    setFullscreenElement('fullscreenElement', null);
    setFullscreenElement('webkitFullscreenElement', el);
    act(() => void document.dispatchEvent(new Event('webkitfullscreenchange')));

    expect(result.current.isFullscreen).toBe(true);
  });

  it('requests fullscreen on the given element', () => {
    const { el, ref } = makeTarget();
    const requestFullscreen = vi.fn();
    (el as HTMLElement & { requestFullscreen: () => void }).requestFullscreen = requestFullscreen;

    const { result } = renderHook(() => useFullscreen(ref));
    act(() => result.current.enterFullscreen());

    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  it('does not blow up when the browser refuses the fullscreen request', async () => {
    const { el, ref } = makeTarget();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    (el as HTMLElement & { requestFullscreen: () => Promise<void> }).requestFullscreen = () =>
      Promise.reject(new Error('Permissions check failed'));

    const { result } = renderHook(() => useFullscreen(ref));
    await act(async () => {
      result.current.enterFullscreen();
      await Promise.resolve();
    });

    expect(warn).toHaveBeenCalled();
    expect(result.current.isFullscreen).toBe(false);
  });
});
