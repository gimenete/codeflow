import { Scrollable } from "@/components/flex-layout";
import { LazyDiffViewer } from "@/components/lazy-diff-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  commitChanges,
  onWatcherChange,
  removeWatcherListeners,
  startWatcher,
  stopWatcher,
  useGitStatus,
} from "@/lib/git";
import { parseHunks, createChangeGroupPatch } from "@/lib/diff";
import type { HunkAnnotation } from "@/components/diff-viewer";
import type { DiffLineAnnotation } from "@pierre/diffs";
import type { GitFileStatus, TrackedBranch } from "@/lib/github-types";
import { isElectron } from "@/lib/platform";
import { cn, fuzzyFilter } from "@/lib/utils";
import {
  Columns2,
  Edit as EditIcon,
  FileCode,
  Minus,
  Plus,
  RefreshCw,
  Rows3,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface BranchFilesViewProps {
  branch: TrackedBranch;
  repositoryPath: string;
}

// Type for tracking which section a file belongs to when selected
type FileSelection = {
  path: string;
  section: "staged" | "unstaged";
} | null;

export function BranchFilesView({
  branch,
  repositoryPath,
}: BranchFilesViewProps) {
  const { status, isLoading, refresh } = useGitStatus(repositoryPath);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stagedDiffs, setStagedDiffs] = useState<Record<string, string>>({});
  const [unstagedDiffs, setUnstagedDiffs] = useState<Record<string, string>>(
    {},
  );
  const [selectedFile, setSelectedFile] = useState<FileSelection>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [commitSummary, setCommitSummary] = useState("");
  const [commitDescription, setCommitDescription] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [diffStyle, setDiffStyle] = useState<"unified" | "split">("unified");

  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const stagedFiles = useMemo(
    () => status?.stagedFiles ?? [],
    [status?.stagedFiles],
  );
  const unstagedFiles = useMemo(
    () => status?.unstagedFiles ?? [],
    [status?.unstagedFiles],
  );
  const hasChanges = stagedFiles.length > 0 || unstagedFiles.length > 0;

  // Get all unique file paths for the diff view
  const allFilePaths = useMemo(() => {
    const paths = new Set<string>();
    stagedFiles.forEach((f) => paths.add(f.path));
    unstagedFiles.forEach((f) => paths.add(f.path));
    return Array.from(paths).sort();
  }, [stagedFiles, unstagedFiles]);

  // Filter files based on search query
  const filteredStagedFiles = useMemo(
    () => fuzzyFilter(stagedFiles, searchQuery, (f) => f.path),
    [stagedFiles, searchQuery],
  );
  const filteredUnstagedFiles = useMemo(
    () => fuzzyFilter(unstagedFiles, searchQuery, (f) => f.path),
    [unstagedFiles, searchQuery],
  );

  // Combined list for keyboard navigation
  const allFilteredFiles = useMemo(() => {
    const items: Array<{
      file: GitFileStatus;
      section: "staged" | "unstaged";
    }> = [];
    filteredStagedFiles.forEach((file) =>
      items.push({ file, section: "staged" }),
    );
    filteredUnstagedFiles.forEach((file) =>
      items.push({ file, section: "unstaged" }),
    );
    return items;
  }, [filteredStagedFiles, filteredUnstagedFiles]);

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

  // Fetch staged and unstaged diffs separately
  useEffect(() => {
    if (!isElectron() || !window.gitAPI || allFilePaths.length === 0) {
      setStagedDiffs({});
      setUnstagedDiffs({});
      return;
    }

    async function fetchDiffs() {
      const newStagedDiffs: Record<string, string> = {};
      const newUnstagedDiffs: Record<string, string> = {};

      for (const filePath of allFilePaths) {
        try {
          // Fetch staged diff (index vs HEAD)
          newStagedDiffs[filePath] = await window.gitAPI!.getDiffStaged(
            repositoryPath,
            filePath,
          );

          // Fetch unstaged diff (working directory vs index)
          newUnstagedDiffs[filePath] = await window.gitAPI!.getDiffFile(
            repositoryPath,
            filePath,
          );
        } catch {
          newStagedDiffs[filePath] = "";
          newUnstagedDiffs[filePath] = "";
        }
      }

      setStagedDiffs(newStagedDiffs);
      setUnstagedDiffs(newUnstagedDiffs);
    }

    void fetchDiffs();
  }, [allFilePaths, repositoryPath]);

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
        return <EditIcon className="h-4 w-4 text-yellow-500 shrink-0" />;
      default:
        return <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />;
    }
  };

  const getFilenameParts = (filePath: string) => {
    const lastSlash = filePath.lastIndexOf("/");
    if (lastSlash === -1) {
      return { filename: filePath, directory: "" };
    }
    return {
      filename: filePath.slice(lastSlash + 1),
      directory: filePath.slice(0, lastSlash),
    };
  };

  const handleStage = useCallback(
    async (filePath: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.gitAPI) return;
      await window.gitAPI.stage(repositoryPath, filePath);
      await refresh();
    },
    [repositoryPath, refresh],
  );

  const handleUnstage = useCallback(
    async (filePath: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.gitAPI) return;
      await window.gitAPI.unstage(repositoryPath, filePath);
      await refresh();
    },
    [repositoryPath, refresh],
  );

  const handleStageAll = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.gitAPI) return;
      for (const file of unstagedFiles) {
        await window.gitAPI.stage(repositoryPath, file.path);
      }
      await refresh();
    },
    [repositoryPath, unstagedFiles, refresh],
  );

  const handleDiscard = useCallback(
    async (filePath: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.gitAPI) return;
      await window.gitAPI.discard(repositoryPath, filePath);
      await refresh();
    },
    [repositoryPath, refresh],
  );

  const handleCommit = useCallback(async () => {
    if (!commitSummary.trim() || stagedFiles.length === 0) return;

    setIsCommitting(true);
    setCommitError(null);
    try {
      const result = await commitChanges(
        repositoryPath,
        stagedFiles.map((f) => f.path),
        commitSummary,
        commitDescription || undefined,
      );

      if (result.success) {
        setCommitSummary("");
        setCommitDescription("");
        await refresh();
      } else {
        setCommitError(result.error || "Commit failed");
      }
    } finally {
      setIsCommitting(false);
    }
  }, [repositoryPath, stagedFiles, commitSummary, commitDescription, refresh]);

  // Create annotations for unstaged change groups (from unstaged diff)
  const createUnstagedAnnotations = useCallback(
    (filePath: string): DiffLineAnnotation<HunkAnnotation>[] => {
      const unstagedPatch = unstagedDiffs[filePath] || "";
      const hunks = parseHunks(unstagedPatch);

      return hunks.flatMap((hunk, hunkIndex) =>
        hunk.changeGroups
          .map((group, groupIndex) => {
            // Prefer additions side, fall back to deletions for delete-only groups
            if (group.endAdditionLine !== null) {
              return {
                side: "additions" as const,
                lineNumber: group.endAdditionLine,
                metadata: { hunkIndex, groupIndex, isStaged: false, filePath },
              };
            } else if (group.endDeletionLine !== null) {
              return {
                side: "deletions" as const,
                lineNumber: group.endDeletionLine,
                metadata: { hunkIndex, groupIndex, isStaged: false, filePath },
              };
            }
            return null;
          })
          .filter((a): a is DiffLineAnnotation<HunkAnnotation> => a !== null),
      );
    },
    [unstagedDiffs],
  );

  // Create annotations for staged change groups (from staged diff)
  const createStagedAnnotations = useCallback(
    (filePath: string): DiffLineAnnotation<HunkAnnotation>[] => {
      const stagedPatch = stagedDiffs[filePath] || "";
      const hunks = parseHunks(stagedPatch);

      return hunks.flatMap((hunk, hunkIndex) =>
        hunk.changeGroups
          .map((group, groupIndex) => {
            // Prefer additions side, fall back to deletions for delete-only groups
            if (group.endAdditionLine !== null) {
              return {
                side: "additions" as const,
                lineNumber: group.endAdditionLine,
                metadata: { hunkIndex, groupIndex, isStaged: true, filePath },
              };
            } else if (group.endDeletionLine !== null) {
              return {
                side: "deletions" as const,
                lineNumber: group.endDeletionLine,
                metadata: { hunkIndex, groupIndex, isStaged: true, filePath },
              };
            }
            return null;
          })
          .filter((a): a is DiffLineAnnotation<HunkAnnotation> => a !== null),
      );
    },
    [stagedDiffs],
  );

  // Change group action handlers
  const handleStageHunk = useCallback(
    async (filePath: string, hunkIndex: number, groupIndex: number) => {
      if (!window.gitAPI) return;

      const unstagedPatch = unstagedDiffs[filePath];
      if (!unstagedPatch) return;

      const hunks = parseHunks(unstagedPatch);
      if (hunkIndex >= hunks.length) return;

      const hunk = hunks[hunkIndex];
      if (groupIndex >= hunk.changeGroups.length) return;

      const group = hunk.changeGroups[groupIndex];
      const patch = createChangeGroupPatch(
        filePath,
        hunk,
        group,
        unstagedPatch,
      );

      try {
        const result = await window.gitAPI.stageHunk(repositoryPath, patch);
        if (result.success) {
          await refresh();
        } else {
          console.error("Failed to stage change group:", result.error);
        }
      } catch (error) {
        console.error("Error staging change group:", error);
      }
    },
    [repositoryPath, unstagedDiffs, refresh],
  );

  const handleUnstageHunk = useCallback(
    async (filePath: string, hunkIndex: number, groupIndex: number) => {
      if (!window.gitAPI) return;

      const stagedPatch = stagedDiffs[filePath];
      if (!stagedPatch) return;

      const hunks = parseHunks(stagedPatch);
      if (hunkIndex >= hunks.length) return;

      const hunk = hunks[hunkIndex];
      if (groupIndex >= hunk.changeGroups.length) return;

      const group = hunk.changeGroups[groupIndex];
      const patch = createChangeGroupPatch(filePath, hunk, group, stagedPatch);

      try {
        const result = await window.gitAPI.unstageHunk(repositoryPath, patch);
        if (result.success) {
          await refresh();
        } else {
          console.error("Failed to unstage change group:", result.error);
        }
      } catch (error) {
        console.error("Error unstaging change group:", error);
      }
    },
    [repositoryPath, stagedDiffs, refresh],
  );

  const handleDiscardHunk = useCallback(
    async (filePath: string, hunkIndex: number, groupIndex: number) => {
      if (!window.gitAPI) return;

      const unstagedPatch = unstagedDiffs[filePath];
      if (!unstagedPatch) return;

      const hunks = parseHunks(unstagedPatch);
      if (hunkIndex >= hunks.length) return;

      const hunk = hunks[hunkIndex];
      if (groupIndex >= hunk.changeGroups.length) return;

      const group = hunk.changeGroups[groupIndex];
      const patch = createChangeGroupPatch(
        filePath,
        hunk,
        group,
        unstagedPatch,
      );

      try {
        const result = await window.gitAPI.discardHunk(repositoryPath, patch);
        if (result.success) {
          await refresh();
        } else {
          console.error("Failed to discard change group:", result.error);
        }
      } catch (error) {
        console.error("Error discarding change group:", error);
      }
    },
    [repositoryPath, unstagedDiffs, refresh],
  );

  const scrollToFile = useCallback(
    (path: string, section: "staged" | "unstaged") => {
      setSelectedFile({ path, section });
      const elementId = `branch-file-${path.replace(/[^a-zA-Z0-9]/g, "-")}`;
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [],
  );

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
      if (e.key === "ArrowDown" && allFilteredFiles.length > 0) {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === "Enter" && allFilteredFiles.length > 0) {
        e.preventDefault();
        const { file, section } = allFilteredFiles[0];
        scrollToFile(file.path, section);
      } else if (e.key === "Escape") {
        setSearchQuery("");
        setFocusedIndex(-1);
      }
    },
    [allFilteredFiles, scrollToFile],
  );

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          Math.min(prev + 1, allFilteredFiles.length - 1),
        );
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
        const { file, section } = allFilteredFiles[focusedIndex];
        scrollToFile(file.path, section);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setFocusedIndex(-1);
        inputRef.current?.focus();
      }
    },
    [focusedIndex, allFilteredFiles, scrollToFile],
  );

  // Calculate the global index for a file in the combined list
  const getGlobalIndex = (
    section: "staged" | "unstaged",
    localIndex: number,
  ) => {
    if (section === "staged") {
      return localIndex;
    }
    return filteredStagedFiles.length + localIndex;
  };

  // Loading state
  if (isLoading && !hasChanges) {
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
    <ResizablePanelGroup direction="horizontal" className="h-full min-h-0">
      <ResizablePanel defaultSize={100} minSize={150} maxSize={500}>
        {/* File sidebar */}
        <div className="flex flex-col min-h-0 h-full">
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

          {/* File list with sections */}
          <Scrollable.Vertical>
            <div
              ref={listRef}
              className="p-2 outline-none"
              tabIndex={0}
              onKeyDown={handleListKeyDown}
            >
              {/* Staged Changes Section */}
              {filteredStagedFiles.length > 0 && (
                <div>
                  <div className="py-2 text-sm font-medium min-h-[40px] flex items-center">
                    Staged Changes ({filteredStagedFiles.length})
                  </div>
                  <div className="space-y-1">
                    {filteredStagedFiles.map((file, index) => {
                      const globalIndex = getGlobalIndex("staged", index);
                      const { filename, directory } = getFilenameParts(
                        file.path,
                      );
                      return (
                        <div
                          key={`staged-${file.path}`}
                          data-index={globalIndex}
                          className={cn(
                            "flex items-center gap-2 text-sm cursor-pointer hover:bg-accent transition-colors group min-h-6",
                            selectedFile?.path === file.path &&
                              selectedFile?.section === "staged" &&
                              "bg-accent",
                            focusedIndex === globalIndex &&
                              "ring-2 ring-ring ring-offset-1",
                          )}
                          onClick={() => scrollToFile(file.path, "staged")}
                        >
                          {getStatusIcon(file.status)}
                          <div className="flex-1 min-w-0 flex items-baseline gap-1 overflow-hidden">
                            <span className="font-mono text-xs shrink-0">
                              {filename}
                            </span>
                            {directory && (
                              <span className="font-mono text-xs text-muted-foreground truncate min-w-0">
                                {directory}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 hidden group-hover:block shrink-0"
                            onClick={(e) => handleUnstage(file.path, e)}
                            title="Unstage"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unstaged Changes Section */}
              {filteredUnstagedFiles.length > 0 && (
                <div className="mt-2">
                  <div className="py-2 text-sm font-medium flex items-center justify-between group min-h-[40px]">
                    <span>
                      Unstaged Changes ({filteredUnstagedFiles.length})
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 hidden group-hover:inline-flex"
                      onClick={handleStageAll}
                      title="Stage all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {filteredUnstagedFiles.map((file, index) => {
                      const globalIndex = getGlobalIndex("unstaged", index);
                      const { filename, directory } = getFilenameParts(
                        file.path,
                      );
                      return (
                        <div
                          key={`unstaged-${file.path}`}
                          data-index={globalIndex}
                          className={cn(
                            "flex items-center gap-2 text-sm cursor-pointer hover:bg-accent transition-colors group min-h-6",
                            selectedFile?.path === file.path &&
                              selectedFile?.section === "unstaged" &&
                              "bg-accent",
                            focusedIndex === globalIndex &&
                              "ring-2 ring-ring ring-offset-1",
                          )}
                          onClick={() => scrollToFile(file.path, "unstaged")}
                        >
                          {getStatusIcon(file.status)}
                          <div className="flex-1 min-w-0 flex items-baseline gap-1 overflow-hidden">
                            <span className="font-mono text-xs shrink-0">
                              {filename}
                            </span>
                            {directory && (
                              <span className="font-mono text-xs text-muted-foreground truncate min-w-0">
                                {directory}
                              </span>
                            )}
                          </div>
                          <div className="gap-1 hidden group-hover:flex shrink-0">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => handleDiscard(file.path, e)}
                              title="Discard changes"
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => handleStage(file.path, e)}
                              title="Stage changes"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {allFilteredFiles.length === 0 && searchQuery && (
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

          {/* Commit UI - always visible, disabled when no staged files */}
          <div className="border-t p-3 shrink-0 bg-background space-y-2">
            <Input
              placeholder="Commit summary"
              className="h-8 text-sm"
              value={commitSummary}
              onChange={(e) => setCommitSummary(e.target.value)}
              disabled={stagedFiles.length === 0}
            />
            <Textarea
              placeholder="Description (optional)"
              className="min-h-[60px] resize-none text-sm"
              value={commitDescription}
              onChange={(e) => setCommitDescription(e.target.value)}
              disabled={stagedFiles.length === 0}
            />
            {commitError && (
              <div className="text-xs text-destructive">{commitError}</div>
            )}
            <Button
              size="sm"
              className="w-full"
              disabled={
                stagedFiles.length === 0 ||
                !commitSummary.trim() ||
                isCommitting
              }
              onClick={handleCommit}
            >
              {isCommitting
                ? "Committing..."
                : stagedFiles.length === 0
                  ? "Commit"
                  : `Commit ${stagedFiles.length} file${stagedFiles.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={70} minSize={30}>
        {/* Right panel: Diff content */}
        <div className="flex-1 min-w-0 flex flex-col h-full">
          {/* Diff Options Toolbar */}
          <div className="shrink-0 px-4 py-2 border-b flex items-center justify-end gap-2">
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
          <Scrollable.Vertical ref={contentRef} className="flex-1 min-h-0">
            <div className="space-y-4">
              {allFilePaths.map((filePath) => {
                const hasUnstaged = unstagedDiffs[filePath]?.trim();
                const hasStaged = stagedDiffs[filePath]?.trim();
                const hasBoth = hasUnstaged && hasStaged;

                return (
                  <div
                    key={filePath}
                    id={`branch-file-${filePath.replace(/[^a-zA-Z0-9]/g, "-")}`}
                    className="pb-4"
                  >
                    <div className="p-4 space-y-4">
                      {/* Unstaged changes */}
                      {hasUnstaged && (
                        <div>
                          {hasBoth && (
                            <div className="text-sm font-medium text-muted-foreground mb-2">
                              Unstaged Changes
                            </div>
                          )}
                          <div className="overflow-x-auto max-w-full border rounded">
                            <LazyDiffViewer
                              diff={unstagedDiffs[filePath]}
                              filePath={filePath}
                              diffStyle={diffStyle}
                              lineAnnotations={createUnstagedAnnotations(
                                filePath,
                              )}
                              onStageHunk={handleStageHunk}
                              onDiscardHunk={handleDiscardHunk}
                            />
                          </div>
                        </div>
                      )}

                      {/* Staged changes */}
                      {hasStaged && (
                        <div>
                          {hasBoth && (
                            <div className="text-sm font-medium text-muted-foreground mb-2">
                              Staged Changes
                            </div>
                          )}
                          <div className="overflow-x-auto max-w-full border rounded">
                            <LazyDiffViewer
                              diff={stagedDiffs[filePath]}
                              filePath={filePath}
                              diffStyle={diffStyle}
                              lineAnnotations={createStagedAnnotations(
                                filePath,
                              )}
                              onUnstageHunk={handleUnstageHunk}
                            />
                          </div>
                        </div>
                      )}

                      {/* Loading state */}
                      {!hasUnstaged && !hasStaged && (
                        <div className="text-muted-foreground text-sm">
                          Loading diff...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Scrollable.Vertical>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
