import { renderHook, act } from '@testing-library/react';
import { createRef } from 'react';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { SCROLL } from '../lib/chordpro/constants';

// jsdom reports 0 for layout metrics, which would make isAtBottom() true immediately.
function makeScrollContainer() {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollHeight', { value: 100000, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 500, configurable: true });
  document.body.appendChild(el);
  const ref = createRef<HTMLElement>() as React.RefObject<HTMLElement | null>;
  ref.current = el;
  return { el, ref };
}

const ticksIn = (ms: number) => ms / SCROLL.INTERVAL_MS;

describe('useAutoScroll speed control', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('scrolls at the configured speed', () => {
    const { el, ref } = makeScrollContainer();
    const { result } = renderHook(() => useAutoScroll({ containerRef: ref, speed: 1 }));

    act(() => result.current.startScroll());
    act(() => void vi.advanceTimersByTime(1000));

    expect(el.scrollTop).toBe(ticksIn(1000) * 1);
  });

  it('applies a new speed without restarting or stalling the scroll', () => {
    const { el, ref } = makeScrollContainer();
    const { result } = renderHook(() => useAutoScroll({ containerRef: ref, speed: 1 }));

    act(() => result.current.startScroll());
    act(() => void vi.advanceTimersByTime(1000));
    const afterFirstSecond = el.scrollTop;

    act(() => result.current.setScrollSpeed(2));
    act(() => void vi.advanceTimersByTime(1000));

    // Second at 2x should add twice the distance of the first second, with no lost ticks
    expect(el.scrollTop - afterFirstSecond).toBe(ticksIn(1000) * 2);
  });

  it('does not stack intervals when speed changes during a manual-scroll pause', () => {
    const { el, ref } = makeScrollContainer();
    const { result } = renderHook(() => useAutoScroll({ containerRef: ref, speed: 1 }));

    act(() => result.current.startScroll());
    act(() => void vi.advanceTimersByTime(200));

    // User nudges the wheel -> auto-scroll pauses for 1s
    act(() => void el.dispatchEvent(new Event('wheel')));
    // ...and adjusts speed while it is paused
    act(() => result.current.setScrollSpeed(2));
    // Pause expires and scrolling resumes
    act(() => void vi.advanceTimersByTime(1000));

    const afterResume = el.scrollTop;
    act(() => void vi.advanceTimersByTime(1000));

    // Exactly one interval should be driving the scroll, at the speed shown in the UI
    expect(el.scrollTop - afterResume).toBe(ticksIn(1000) * 2);
  });

  it('stops cleanly: no interval keeps running after stopScroll', () => {
    const { el, ref } = makeScrollContainer();
    const { result } = renderHook(() => useAutoScroll({ containerRef: ref, speed: 1 }));

    act(() => result.current.startScroll());
    act(() => void vi.advanceTimersByTime(200));
    act(() => void el.dispatchEvent(new Event('wheel')));
    act(() => result.current.setScrollSpeed(2));
    act(() => void vi.advanceTimersByTime(1000));

    act(() => result.current.stopScroll());
    const stoppedAt = el.scrollTop;
    act(() => void vi.advanceTimersByTime(2000));

    expect(el.scrollTop).toBe(stoppedAt);
  });
});
