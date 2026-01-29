import { Scrollable } from "@/components/flex-layout";
import { LazyDiffViewer } from "@/components/lazy-diff-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  onWatcherChange,
  removeWatcherListeners,
  startWatcher,
  stopWatcher,
  useGitStatus,
} from "@/lib/git";
import type { TrackedBranch } from "@/lib/github-types";
import { isElectron } from "@/lib/platform";
import { cn, fuzzyFilter } from "@/lib/utils";
import { Edit, FileCode, Minus, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface BranchFilesViewProps {
  branch: TrackedBranch;
  repositoryPath: string;
}

export function BranchFilesView({
  branch,
  repositoryPath,
}: BranchFilesViewProps) {
  const { status, isLoading, refresh } = useGitStatus(repositoryPath);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fileDiffs, setFileDiffs] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const files = useMemo(() => status?.files ?? [], [status?.files]);
  const hasChanges = files.length > 0;

  // Filter files based on search query
  const filteredFiles = useMemo(
    () => fuzzyFilter(files, searchQuery, (f) => f.path),
    [files, searchQuery],
  );

  // Setup file watcher
  useEffect(() => {
    if (!isElectron()) return;

    const watcherId = `branch-files-${branch.id}`;
    const watchPath = branch.worktreePath || repositoryPath;

    void startWatcher(watcherId, watchPath);

    onWatcherChange(({ id }) => {
      if (id === watcherId) {
        void refresh();
      }
    });

    return () => {
      void stopWatcher(watcherId);
      removeWatcherListeners();
    };
  }, [branch.id, branch.worktreePath, repositoryPath, refresh]);

  // Fetch diffs for all files when status changes
  useEffect(() => {
    if (!isElectron() || !window.gitAPI || files.length === 0) return;

    async function fetchAllDiffs() {
      const newDiffs: Record<string, string> = {};

      for (const file of files) {
        try {
          const diff = await window.gitAPI!.getDiffFile(
            repositoryPath,
            file.path,
          );
          newDiffs[file.path] = diff;
        } catch {
          newDiffs[file.path] = "Error loading diff";
        }
      }

      setFileDiffs(newDiffs);
    }

    void fetchAllDiffs();
  }, [files, repositoryPath]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  const getStatusIcon = (fileStatus: string) => {
    switch (fileStatus) {
      case "added":
      case "untracked":
        return <Plus className="h-4 w-4 text-green-500 shrink-0" />;
      case "deleted":
        return <Minus className="h-4 w-4 text-red-500 shrink-0" />;
      case "modified":
        return <Edit className="h-4 w-4 text-yellow-500 shrink-0" />;
      default:
        return <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />;
    }
  };

  const scrollToFile = useCallback((path: string) => {
    setSelectedFile(path);
    const element = document.getElementById(
      `branch-file-${path.replace(/[^a-zA-Z0-9]/g, "-")}`,
    );
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Scroll focused item into view and focus list for keyboard navigation
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const item = listRef.current.querySelector(
        `[data-index="${focusedIndex}"]`,
      );
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
      listRef.current.focus();
    }
  }, [focusedIndex]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown" && filteredFiles.length > 0) {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === "Enter" && filteredFiles.length > 0) {
        e.preventDefault();
        scrollToFile(filteredFiles[0].path);
      } else if (e.key === "Escape") {
        setSearchQuery("");
        setFocusedIndex(-1);
      }
    },
    [filteredFiles, scrollToFile],
  );

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (focusedIndex === 0) {
          setFocusedIndex(-1);
          inputRef.current?.focus();
        } else {
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
        }
      } else if (e.key === "Enter" && focusedIndex >= 0) {
        e.preventDefault();
        scrollToFile(filteredFiles[focusedIndex].path);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setFocusedIndex(-1);
        inputRef.current?.focus();
      }
    },
    [focusedIndex, filteredFiles, scrollToFile],
  );

  // Loading state
  if (isLoading && files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading changes...</div>
      </div>
    );
  }

  // No changes state
  if (!hasChanges) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <FileCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No changes detected</p>
          <p className="text-sm mt-1">Changes will appear here as you work</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* File sidebar */}
      <div className="w-80 border-r shrink-0 flex flex-col min-h-0 h-full">
        {/* Header with refresh button */}
        <div className="p-2 border-b shrink-0 flex items-center gap-2">
          <Input
            ref={inputRef}
            placeholder="Filter files..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setFocusedIndex(-1);
            }}
            onKeyDown={handleInputKeyDown}
            className="h-8 flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                (isLoading || isRefreshing) && "animate-spin",
              )}
            />
          </Button>
        </div>

        {/* File count */}
        <div className="px-3 py-1.5 text-xs text-muted-foreground border-b shrink-0">
          {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}{" "}
          {searchQuery && `matching "${searchQuery}"`}
        </div>

        {/* File list */}
        <Scrollable.Vertical>
          <div
            ref={listRef}
            className="p-2 space-y-1 outline-none"
            tabIndex={0}
            onKeyDown={handleListKeyDown}
          >
            {filteredFiles.map((file, index) => (
              <div
                key={file.path}
                data-index={index}
                className={cn(
                  "flex items-center gap-2 p-2 rounded text-sm cursor-pointer hover:bg-accent transition-colors",
                  selectedFile === file.path && "bg-accent",
                  focusedIndex === index && "ring-2 ring-ring ring-offset-1",
                )}
                onClick={() => scrollToFile(file.path)}
              >
                {getStatusIcon(file.status)}
                <div className="flex-1 min-w-0 overflow-x-auto scrollbar-thin">
                  <span className="whitespace-nowrap font-mono text-xs">
                    {file.path}
                  </span>
                </div>
              </div>
            ))}
            {filteredFiles.length === 0 && searchQuery && (
              <div className="p-2 text-sm text-muted-foreground text-center">
                No files match "{searchQuery}"
              </div>
            )}
          </div>
        </Scrollable.Vertical>

        {/* Summary footer */}
        {status && (
          <div className="px-3 py-2 border-t text-xs text-muted-foreground shrink-0">
            {(status.ahead ?? 0) > 0 && <span>{status.ahead} ahead</span>}
            {(status.ahead ?? 0) > 0 && (status.behind ?? 0) > 0 && " · "}
            {(status.behind ?? 0) > 0 && <span>{status.behind} behind</span>}
            {(status.ahead ?? 0) === 0 && (status.behind ?? 0) === 0 && (
              <span>Up to date with remote</span>
            )}
          </div>
        )}
      </div>

      {/* Diff content */}
      <Scrollable.Vertical ref={contentRef} className="flex-1 min-w-0">
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.path}
              id={`branch-file-${file.path.replace(/[^a-zA-Z0-9]/g, "-")}`}
            >
              {fileDiffs[file.path] ? (
                <div className="p-4 overflow-x-auto max-w-full">
                  <LazyDiffViewer
                    diff={fileDiffs[file.path]}
                    filePath={file.path}
                  />
                </div>
              ) : (
                <div className="p-4 text-muted-foreground text-sm">
                  Loading diff for {file.path}...
                </div>
              )}
            </div>
          ))}
        </div>
      </Scrollable.Vertical>
    </div>
  );
}
