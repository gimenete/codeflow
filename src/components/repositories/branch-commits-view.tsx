import { Scrollable } from "@/components/flex-layout";
import { LazyDiffViewer } from "@/components/lazy-diff-viewer";
import { CommitHash } from "@/components/commit-hash";
import { RelativeTime } from "@/components/relative-time";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGitLogInfinite, useCommitDetail } from "@/lib/git";
import type { TrackedBranch } from "@/lib/github-types";
import { cn } from "@/lib/utils";
import { Columns2, GitCommitHorizontal, Rows3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface BranchCommitsViewProps {
  branch: TrackedBranch;
  repositoryPath: string;
}

export function BranchCommitsView({
  branch,
  repositoryPath,
}: BranchCommitsViewProps) {
  const { commits, isLoading, isLoadingMore, hasMore, loadMore } =
    useGitLogInfinite(repositoryPath, branch.branch);
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const [diffStyle, setDiffStyle] = useState<"unified" | "split">("unified");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Get commit detail for selected commit
  const {
    commit: selectedCommit,
    files,
    isLoading: isLoadingDetail,
  } = useCommitDetail(repositoryPath, selectedSha ?? "");

  // Auto-select first commit when loaded
  if (commits.length > 0 && !selectedSha) {
    setSelectedSha(commits[0].sha);
  }

  // Infinite scroll using intersection observer
  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          void loadMore();
        }
      },
      { rootMargin: "100px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  // Loading state
  if (isLoading && commits.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading commits...</div>
      </div>
    );
  }

  // No commits state
  if (!isLoading && commits.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <GitCommitHorizontal className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No commits found</p>
          <p className="text-sm mt-1">
            This branch doesn't have any commits yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full min-h-0">
      {/* Left panel: Commit list */}
      <ResizablePanel defaultSize={200} minSize={200} maxSize={500}>
        <div className="flex flex-col min-h-0 h-full border-r">
          {/* Header */}
          <div className="p-3 border-b shrink-0">
            <div className="text-sm font-medium">
              Commits ({commits.length}
              {hasMore ? "+" : ""})
            </div>
          </div>

          {/* Commit list */}
          <Scrollable.Vertical>
            <div className="p-2">
              {commits.map((commit) => (
                <div
                  key={commit.sha}
                  className={cn(
                    "p-2 cursor-pointer hover:bg-accent transition-colors rounded-md mb-1",
                    selectedSha === commit.sha && "bg-accent",
                  )}
                  onClick={() => setSelectedSha(commit.sha)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium line-clamp-2 flex-1 min-w-0">
                      {commit.message}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <CommitHash sha={commit.sha} />
                    <span className="truncate">{commit.author}</span>
                    <span className="shrink-0">
                      <RelativeTime date={commit.date} />
                    </span>
                  </div>
                </div>
              ))}

              {/* Infinite scroll trigger */}
              {hasMore && <div ref={loadMoreRef} className="h-1" />}

              {/* Loading more indicator */}
              {isLoadingMore && (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  Loading more...
                </div>
              )}

              {/* End of list indicator */}
              {!hasMore && commits.length > 0 && (
                <div className="p-2 text-center text-xs text-muted-foreground">
                  End of commit history
                </div>
              )}
            </div>
          </Scrollable.Vertical>
        </div>
      </ResizablePanel>

      <ResizableHandle />

      {/* Right panel: Commit details and diff */}
      <ResizablePanel defaultSize={70} minSize={30}>
        <div className="flex flex-col h-full min-h-0">
          {/* Commit details header */}
          {selectedCommit ? (
            <>
              <div className="p-4 border-b shrink-0 space-y-2">
                <div className="font-medium">{selectedCommit.message}</div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{selectedCommit.author}</span>
                  <CommitHash sha={selectedCommit.sha} />
                  <RelativeTime date={selectedCommit.date} />
                </div>
                {files.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {files.length} file{files.length !== 1 ? "s" : ""} changed
                  </div>
                )}
              </div>

              {/* Diff Options Toolbar */}
              <div className="shrink-0 px-4 py-1.5 border-b flex items-center justify-end gap-2">
                <Tabs
                  value={diffStyle}
                  onValueChange={(v) => setDiffStyle(v as "unified" | "split")}
                >
                  <TabsList>
                    <TabsTrigger value="unified" title="Unified view">
                      <Rows3 className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="split" title="Split view">
                      <Columns2 className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Diff content */}
              {isLoadingDetail ? (
                <div className="flex-1 p-4 space-y-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <Scrollable.Vertical className="flex-1 min-h-0">
                  <div className="p-4 space-y-4">
                    {files.map((file) => (
                      <div key={file.path}>
                        {file.diff ? (
                          <div className="border rounded overflow-x-auto">
                            <LazyDiffViewer
                              diff={file.diff}
                              filePath={file.path}
                              diffStyle={diffStyle}
                            />
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground italic">
                            Binary file or no diff available
                          </div>
                        )}
                      </div>
                    ))}

                    {files.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No files changed in this commit
                      </div>
                    )}
                  </div>
                </Scrollable.Vertical>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a commit to view details
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
