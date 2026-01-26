import { PatchDiff } from "@pierre/diffs/react";
import { cn } from "@/lib/utils";
import { useDiffTheme } from "@/lib/use-diff-theme";

interface DiffViewerProps {
  diff: string | null | undefined;
  filePath?: string;
  className?: string;
}

export function DiffViewer({ diff, className }: DiffViewerProps) {
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
        diffStyle: "unified",
      }}
      className={cn("font-mono text-sm", className)}
    />
  );
}
