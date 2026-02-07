import { PatchDiff } from "@pierre/diffs/react";
import { useDiffTheme } from "@/lib/use-diff-theme";

interface DiffHunkProps {
  diffHunk: string;
  path: string;
}

export function DiffHunk({ diffHunk, path }: DiffHunkProps) {
  const theme = useDiffTheme();

  if (!diffHunk) return null;

  // PatchDiff expects a full git diff with headers.
  // The diffHunk from the GitHub API starts with @@ so we wrap it.
  const fullPatch = `diff --git a/${path} b/${path}
--- a/${path}
+++ b/${path}
${diffHunk}`;

  return (
    <div className="my-2 overflow-hidden rounded border">
      <PatchDiff
        patch={fullPatch}
        options={{
          themeType: theme,
          diffStyle: "unified",
          overflow: "wrap",
        }}
        className="font-mono text-xs"
      />
    </div>
  );
}
