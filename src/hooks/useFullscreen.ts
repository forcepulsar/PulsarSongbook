import { useState, useEffect, useCallback } from 'react';

interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
}

// Vendor-prefixed shapes of the Fullscreen API, still needed for older WebKit
type PrefixedDocument = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void | Promise<void>;
  mozCancelFullScreen?: () => void | Promise<void>;
  msExitFullscreen?: () => void | Promise<void>;
};

type PrefixedElement = HTMLElement & {
  webkitRequestFullscreen?: () => void | Promise<void>;
  mozRequestFullScreen?: () => void | Promise<void>;
  msRequestFullscreen?: () => void | Promise<void>;
};

// Read across prefixes: WebKit fires its vendor event while fullscreenElement is
// undefined, which would otherwise leave isFullscreen stuck at false.
function getFullscreenElement(): Element | null {
  const doc = document as PrefixedDocument;
  return (
    doc.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.mozFullScreenElement ??
    doc.msFullscreenElement ??
    null
  );
}

// A refused request (no user gesture, iframe without allow="fullscreen", iPhone Safari)
// rejects. Report it rather than leaving an unhandled rejection.
function settle(result: void | Promise<void>, action: string): void {
  if (result && typeof (result as Promise<void>).catch === 'function') {
    (result as Promise<void>).catch((error: unknown) => {
      console.warn(`[useFullscreen] ${action} was refused:`, error);
    });
  }
}

export function useFullscreen(elementRef?: React.RefObject<HTMLElement | null>): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Update fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!getFullscreenElement());
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Enter fullscreen
  const enterFullscreen = useCallback(() => {
    const element = (elementRef?.current || document.documentElement) as PrefixedElement;

    if (element.requestFullscreen) {
      settle(element.requestFullscreen(), 'requestFullscreen');
    } else if (element.webkitRequestFullscreen) {
      settle(element.webkitRequestFullscreen(), 'webkitRequestFullscreen');
    } else if (element.mozRequestFullScreen) {
      settle(element.mozRequestFullScreen(), 'mozRequestFullScreen');
    } else if (element.msRequestFullscreen) {
      settle(element.msRequestFullscreen(), 'msRequestFullscreen');
    }
  }, [elementRef]);

  // Exit fullscreen
  const exitFullscreen = useCallback(() => {
    const doc = document as PrefixedDocument;

    if (doc.exitFullscreen) {
      settle(doc.exitFullscreen(), 'exitFullscreen');
    } else if (doc.webkitExitFullscreen) {
      settle(doc.webkitExitFullscreen(), 'webkitExitFullscreen');
    } else if (doc.mozCancelFullScreen) {
      settle(doc.mozCancelFullScreen(), 'mozCancelFullScreen');
    } else if (doc.msExitFullscreen) {
      settle(doc.msExitFullscreen(), 'msExitFullscreen');
    }
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
}
