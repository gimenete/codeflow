import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useSyncExternalStore,
} from "react";
import type { FileDiff } from "./diff";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export function useIsLargeScreen(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

export function useHideOnScroll(threshold: number = 10): boolean {
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateScrollDirection = useCallback(() => {
    const scrollY = window.scrollY;

    if (Math.abs(scrollY - lastScrollY.current) < threshold) {
      ticking.current = false;
      return;
    }

    setIsHidden(scrollY > lastScrollY.current && scrollY > 48);
    lastScrollY.current = scrollY > 0 ? scrollY : 0;
    ticking.current = false;
  }, [threshold]);

  useEffect(() => {
    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [updateScrollDirection]);

  return isHidden;
}

// Navigation history tracking for back/forward buttons
// We track our own history stack since browsers don't expose forward availability

interface NavigationState {
  currentIndex: number;
  maxIndex: number;
}

let navigationState: NavigationState = {
  currentIndex: 0,
  maxIndex: 0,
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): NavigationState {
  return navigationState;
}

// Initialize and track navigation state
if (typeof window !== "undefined") {
  // Handle popstate (back/forward button clicks)
  window.addEventListener("popstate", () => {
    const historyState = window.history.state;
    const idx = historyState?.key ? parseInt(historyState.key, 10) : 0;

    if (!isNaN(idx)) {
      navigationState = {
        currentIndex: idx,
        maxIndex: Math.max(navigationState.maxIndex, idx),
      };
      notifyListeners();
    }
  });

  // Intercept pushState and replaceState to track navigation
  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = function (data, unused, url) {
    originalPushState(data, unused, url);
    const idx = data?.key
      ? parseInt(data.key, 10)
      : navigationState.currentIndex + 1;
    if (!isNaN(idx)) {
      navigationState = {
        currentIndex: idx,
        // Only reset maxIndex if this is a new forward navigation (idx > current maxIndex)
        // Preserves forward history when navigating to previously visited pages
        maxIndex:
          idx > navigationState.maxIndex ? idx : navigationState.maxIndex,
      };
      notifyListeners();
    }
  };

  window.history.replaceState = function (data, unused, url) {
    originalReplaceState(data, unused, url);
    const idx = data?.key
      ? parseInt(data.key, 10)
      : navigationState.currentIndex;
    if (!isNaN(idx)) {
      navigationState = {
        ...navigationState,
        currentIndex: idx,
      };
      notifyListeners();
    }
  };

  // Initialize from current history state
  const initialState = window.history.state;
  const initialIdx = initialState?.key ? parseInt(initialState.key, 10) : 0;
  if (!isNaN(initialIdx)) {
    navigationState = {
      currentIndex: initialIdx,
      maxIndex: initialIdx,
    };
  }
}

export function useNavigationHistory() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const canGoBack = state.currentIndex > 0;
  const canGoForward = state.currentIndex < state.maxIndex;

  const goBack = useCallback(() => {
    if (canGoBack) {
      window.history.back();
    }
  }, [canGoBack]);

  const goForward = useCallback(() => {
    if (canGoForward) {
      window.history.forward();
    }
  }, [canGoForward]);

  return { canGoBack, canGoForward, goBack, goForward };
}

export function useParseDiffAsync(diffText: string | undefined) {
  const [parsedDiffs, setParsedDiffs] = useState<FileDiff[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    if (!diffText) {
      setParsedDiffs([]);
      setIsParsing(false);
      return;
    }

    setIsParsing(true);
    const worker = new Worker(
      new URL("@/workers/diff-parser.worker.ts", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = (e: MessageEvent<FileDiff[]>) => {
      setParsedDiffs(e.data);
      setIsParsing(false);
    };

    worker.onerror = () => {
      setIsParsing(false);
    };

    worker.postMessage(diffText);
    return () => worker.terminate();
  }, [diffText]);

  return { parsedDiffs, isParsing };
}
