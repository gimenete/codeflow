import { useRef, useState, useEffect } from "react";
import { DiffViewer, type HunkAnnotation } from "./diff-viewer";
import { Skeleton } from "./ui/skeleton";
import type { DiffLineAnnotation } from "@pierre/diffs";

interface LazyDiffViewerProps {
  diff: string;
  filePath: string;
  diffStyle?: "unified" | "split";
  lineAnnotations?: DiffLineAnnotation<HunkAnnotation>[];
  onStageHunk?: (
    filePath: string,
    hunkIndex: number,
    groupIndex: number,
  ) => void;
  onUnstageHunk?: (
    filePath: string,
    hunkIndex: number,
    groupIndex: number,
  ) => void;
  onDiscardHunk?: (
    filePath: string,
    hunkIndex: number,
    groupIndex: number,
  ) => void;
}

export function LazyDiffViewer({
  diff,
  filePath,
  diffStyle,
  lineAnnotations,
  onStageHunk,
  onUnstageHunk,
  onDiscardHunk,
}: LazyDiffViewerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasBeenVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="overflow-x-auto">
      {hasBeenVisible ? (
        <DiffViewer
          diff={diff}
          filePath={filePath}
          diffStyle={diffStyle}
          lineAnnotations={lineAnnotations}
          onStageHunk={onStageHunk}
          onUnstageHunk={onUnstageHunk}
          onDiscardHunk={onDiscardHunk}
        />
      ) : (
        <div className="space-y-2 p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      )}
    </div>
  );
}
