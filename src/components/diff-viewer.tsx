import { PatchDiff } from "@pierre/diffs/react";
import { cn } from "@/lib/utils";
import { useDiffTheme } from "@/lib/use-diff-theme";

interface DiffViewerProps {
  diff: string | null | undefined;
  filePath?: string;
  className?: string;
  diffStyle?: "unified" | "split";
}

export function DiffViewer({
  diff,
  className,
  diffStyle = "unified",
}: DiffViewerProps) {
  const theme = useDiffTheme();

  if (!diff) {
    return (
      <div className={cn("p-4 text-muted-foreground text-center", className)}>
        No changes to display
      </div>
    );
  }

  return (
    <PatchDiff
      patch={diff}
      options={{
        themeType: theme,
        diffStyle,
        overflow: "wrap",
      }}
      className={cn("font-mono text-xs", className)}
    />
  );
}
