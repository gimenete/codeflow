import { useState, useCallback, useRef, useEffect } from "react";

export interface LineRange {
  start: number;
  end: number;
}

export interface UseLineSelectionOptions {
  filePath: string;
  containerRef: React.RefObject<HTMLElement | null>;
  enabled?: boolean;
}

export interface UseLineSelectionReturn {
  selectedRange: LineRange | null;
  clearSelection: () => void;
  handleLineSelected: (range: LineRange | null) => void;
  preventNextClear: () => void;
}

export function useLineSelection({
  enabled = true,
}: UseLineSelectionOptions): UseLineSelectionReturn {
  const [selectedRange, setSelectedRange] = useState<LineRange | null>(null);
  const ignoreNextClear = useRef(false);

  const clearSelection = useCallback(() => {
    if (ignoreNextClear.current) {
      ignoreNextClear.current = false;
      return;
    }
    setSelectedRange(null);
  }, []);

  const handleLineSelected = useCallback(
    (range: LineRange | null) => {
      if (!enabled) return;

      if (!range) {
        clearSelection();
        return;
      }

      // Normalize range so start <= end
      const normalizedRange: LineRange = {
        start: Math.min(range.start, range.end),
        end: Math.max(range.start, range.end),
      };

      setSelectedRange(normalizedRange);
    },
    [enabled, clearSelection],
  );

  // Clear selection on Escape key
  useEffect(() => {
    if (!selectedRange) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRange, clearSelection]);

  // Prevent clearing when clicking the floating button
  const preventNextClear = useCallback(() => {
    ignoreNextClear.current = true;
  }, []);

  return {
    selectedRange,
    clearSelection,
    handleLineSelected,
    preventNextClear,
  };
}

// Format line range for chat input
export function formatLineReference(
  filePath: string,
  lineRange: LineRange,
): string {
  if (lineRange.start === lineRange.end) {
    return `@${filePath}#L${lineRange.start}`;
  }
  return `@${filePath}#L${lineRange.start}-${lineRange.end}`;
}
