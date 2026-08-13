import { useState, useEffect, useRef, useCallback } from 'react';
import { SCROLL } from '../lib/chordpro/constants';

interface UseAutoScrollOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  speed?: number;
}

interface UseAutoScrollReturn {
  isScrolling: boolean;
  scrollSpeed: number;
  startScroll: () => void;
  stopScroll: () => void;
  toggleScroll: () => void;
  increaseSpeed: () => void;
  decreaseSpeed: () => void;
  setScrollSpeed: (speed: number) => void;
}

// How long auto-scroll yields after the user scrolls by hand
const MANUAL_PAUSE_MS = 1000;

export function useAutoScroll({
  containerRef,
  speed = SCROLL.DEFAULT_SPEED,
}: UseAutoScrollOptions): UseAutoScrollReturn {
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(speed);
  const accumulatedScrollRef = useRef<number>(0); // Accumulate fractional scroll amounts
  const pausedUntilRef = useRef<number>(0);

  // Read by the ticker so a speed change takes effect without rebuilding the timer
  const speedRef = useRef(scrollSpeed);
  useEffect(() => {
    speedRef.current = scrollSpeed;
  }, [scrollSpeed]);

  // Check if we've reached the bottom
  const isAtBottom = useCallback(() => {
    if (!containerRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollTop + clientHeight >= scrollHeight - 10;
  }, [containerRef]);

  // Stop scrolling — the ticker effect below owns the timer and tears it down
  const stopScroll = useCallback(() => {
    setIsScrolling(false);
  }, []);

  // Start scrolling
  const startScroll = useCallback(() => {
    if (!containerRef.current) return;

    // If at bottom, scroll to top first
    if (isAtBottom()) {
      containerRef.current.scrollTop = 0;
    }

    accumulatedScrollRef.current = 0;
    pausedUntilRef.current = 0;

    setIsScrolling(true);
  }, [containerRef, isAtBottom]);

  // Toggle scroll
  const toggleScroll = useCallback(() => {
    if (isScrolling) {
      stopScroll();
    } else {
      startScroll();
    }
  }, [isScrolling, startScroll, stopScroll]);

  // Speed controls
  const increaseSpeed = useCallback(() => {
    setScrollSpeed((prev) => Math.min(prev + SCROLL.SPEED_STEP, SCROLL.MAX_SPEED));
  }, []);

  const decreaseSpeed = useCallback(() => {
    setScrollSpeed((prev) => Math.max(prev - SCROLL.SPEED_STEP, SCROLL.MIN_SPEED));
  }, []);

  // Manual scroll yields for a moment. Only wheel/touchmove fire here — programmatic
  // scrollTop changes don't — so no need to distinguish auto-scroll from the user.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isScrolling) return;

    const handleManualScroll = () => {
      pausedUntilRef.current = Date.now() + MANUAL_PAUSE_MS;
    };

    container.addEventListener('wheel', handleManualScroll);
    container.addEventListener('touchmove', handleManualScroll);

    return () => {
      container.removeEventListener('wheel', handleManualScroll);
      container.removeEventListener('touchmove', handleManualScroll);
    };
  }, [containerRef, isScrolling]);

  // The one and only owner of the scroll timer. Speed is read from a ref per tick,
  // so changing speed never rebuilds the timer or discards accumulated pixels.
  useEffect(() => {
    if (!isScrolling) return;

    const intervalId = window.setInterval(() => {
      const container = containerRef.current;
      if (!container) return;

      if (Date.now() < pausedUntilRef.current) return;

      if (isAtBottom()) {
        setIsScrolling(false);
        return;
      }

      accumulatedScrollRef.current += speedRef.current;

      // Only scroll when we have at least 1 pixel
      if (accumulatedScrollRef.current >= 1) {
        const pixelsToScroll = Math.floor(accumulatedScrollRef.current);
        container.scrollTop += pixelsToScroll;
        accumulatedScrollRef.current -= pixelsToScroll;
      }
    }, SCROLL.INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isScrolling, containerRef, isAtBottom]);

  return {
    isScrolling,
    scrollSpeed,
    startScroll,
    stopScroll,
    toggleScroll,
    increaseSpeed,
    decreaseSpeed,
    setScrollSpeed,
  };
}
