import { PatchDiff } from "@pierre/diffs/react";
import type { DiffLineAnnotation } from "@pierre/diffs";
import { cn } from "@/lib/utils";
import { useDiffTheme } from "@/lib/use-diff-theme";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Undo2 } from "lucide-react";

export interface HunkAnnotation {
  hunkIndex: number;
  groupIndex: number;
  isStaged: boolean;
  filePath: string;
}

interface DiffViewerProps {
  diff: string | null | undefined;
  filePath?: string;
  className?: string;
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

function HunkActions({
  annotation,
  onStage,
  onUnstage,
  onDiscard,
}: {
  annotation: DiffLineAnnotation<HunkAnnotation>;
  onStage?: () => void;
  onUnstage?: () => void;
  onDiscard?: () => void;
}) {
  const isStaged = annotation.metadata?.isStaged;

  return (
    <div className="flex items-center gap-1 py-1 px-2 bg-muted/50 border-b justify-end">
      {isStaged ? (
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs"
          onClick={onUnstage}
          title="Unstage hunk"
        >
          <Minus className="h-3 w-3 mr-1" />
          Unstage
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={onStage}
            title="Stage hunk"
          >
            <Plus className="h-3 w-3 mr-1" />
            Stage
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs text-destructive hover:text-destructive"
            onClick={onDiscard}
            title="Discard hunk"
          >
            <Undo2 className="h-3 w-3 mr-1" />
            Discard
          </Button>
        </>
      )}
    </div>
  );
}

export function DiffViewer({
  diff,
  className,
  diffStyle = "unified",
  lineAnnotations,
  onStageHunk,
  onUnstageHunk,
  onDiscardHunk,
}: DiffViewerProps) {
  const theme = useDiffTheme();

  if (!diff) {
    return (
      <div className={cn("p-4 text-muted-foreground text-center", className)}>
        No changes to display
      </div>
    );
  }

  const hasAnnotations =
    lineAnnotations &&
    lineAnnotations.length > 0 &&
    (onStageHunk || onUnstageHunk || onDiscardHunk);

  return (
    <PatchDiff
      patch={diff}
      options={{
        themeType: theme,
        diffStyle,
        overflow: "wrap",
      }}
      lineAnnotations={lineAnnotations}
      renderAnnotation={
        hasAnnotations
          ? (annotation) => (
              <HunkActions
                annotation={annotation}
                onStage={() =>
                  onStageHunk?.(
                    annotation.metadata?.filePath ?? "",
                    annotation.metadata?.hunkIndex ?? 0,
                    annotation.metadata?.groupIndex ?? 0,
                  )
                }
                onUnstage={() =>
                  onUnstageHunk?.(
                    annotation.metadata?.filePath ?? "",
                    annotation.metadata?.hunkIndex ?? 0,
                    annotation.metadata?.groupIndex ?? 0,
                  )
                }
                onDiscard={() =>
                  onDiscardHunk?.(
                    annotation.metadata?.filePath ?? "",
                    annotation.metadata?.hunkIndex ?? 0,
                    annotation.metadata?.groupIndex ?? 0,
                  )
                }
              />
            )
          : undefined
      }
      className={cn("font-mono text-xs", className)}
    />
  );
}
