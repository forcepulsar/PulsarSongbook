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

export function useAutoScroll({
  containerRef,
  speed = SCROLL.DEFAULT_SPEED,
}: UseAutoScrollOptions): UseAutoScrollReturn {
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(speed);
  const intervalRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<number | null>(null);
  const lastManualScrollRef = useRef<number>(0);

  // Check if we've reached the bottom
  const isAtBottom = useCallback(() => {
    if (!containerRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollTop + clientHeight >= scrollHeight - 10;
  }, [containerRef]);

  // Stop scrolling
  const stopScroll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    setIsScrolling(false);
  }, []);

  // Start scrolling
  const startScroll = useCallback(() => {
    if (!containerRef.current) return;

    // If at bottom, scroll to top first
    if (isAtBottom()) {
      containerRef.current.scrollTop = 0;
    }

    setIsScrolling(true);

    intervalRef.current = window.setInterval(() => {
      if (!containerRef.current) return;

      // Stop if we've reached the bottom
      if (isAtBottom()) {
        stopScroll();
        return;
      }

      // Scroll by speed pixels
      containerRef.current.scrollTop += scrollSpeed;
    }, SCROLL.INTERVAL_MS);
  }, [containerRef, scrollSpeed, isAtBottom, stopScroll]);

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

  // Handle manual scroll detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const now = Date.now();
      const timeSinceLastManual = now - lastManualScrollRef.current;

      // If scrolling and user manually scrolled (not from auto-scroll), pause
      if (isScrolling && timeSinceLastManual > 100) {
        lastManualScrollRef.current = now;

        // Pause for 1 second
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // Resume after 1 second
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
        }

        pauseTimeoutRef.current = window.setTimeout(() => {
          if (isScrolling) {
            startScroll();
          }
        }, 1000);
      }
    };

    // Detect touch/mouse scroll
    container.addEventListener('wheel', handleScroll);
    container.addEventListener('touchmove', handleScroll);

    return () => {
      container.removeEventListener('wheel', handleScroll);
      container.removeEventListener('touchmove', handleScroll);
    };
  }, [containerRef, isScrolling, startScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScroll();
    };
  }, [stopScroll]);

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
