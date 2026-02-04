// hello world

import { Scrollable } from "@/components/flex-layout";
import { LazyDiffViewer } from "@/components/lazy-diff-viewer";
import { File } from "@pierre/diffs/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Empty,
  EmptyDescription,
  EmptyIcon,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { RequestChangesDialog } from "@/components/request-changes-dialog";
import { formatLineReference, type LineRange } from "@/lib/use-line-selection";
import { useClaudeStore } from "@/lib/claude-store";
import {
  commitChanges,
  emitGitChanged,
  gitPull,
  gitPush,
  onWatcherChange,
  removeWatcherListeners,
  startWatcher,
  stopWatcher,
  useGitStatus,
} from "@/lib/git";
import { parseHunks, createChangeGroupPatch } from "@/lib/diff";
import type { HunkAnnotation } from "@/components/diff-viewer";
import {
  getFiletypeFromFileName,
  type DiffLineAnnotation,
} from "@pierre/diffs";
import type { GitFileStatus, TrackedBranch } from "@/lib/github-types";
import { isElectron } from "@/lib/platform";
import { useDiffTheme } from "@/lib/use-diff-theme";
import { cn, fuzzyFilter } from "@/lib/utils";
import {
  ArrowDownUp,
  Columns2,
  Edit as EditIcon,
  FileCode,
  MessageSquarePlus,
  Minus,
  Plus,
  RefreshCw,
  Rows3,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation, useNavigate } from "@tanstack/react-router";

interface CommitFormProps {
  repositoryPath: string;
  stagedFiles: GitFileStatus[];
  refresh: () => Promise<void>;
}

function CommitForm({ repositoryPath, stagedFiles, refresh }: CommitFormProps) {
  const [commitSummary, setCommitSummary] = useState("");
  const [commitDescription, setCommitDescription] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

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
        emitGitChanged();
      } else {
        setCommitError(result.error || "Commit failed");
      }
    } finally {
      setIsCommitting(false);
    }
  }, [repositoryPath, stagedFiles, commitSummary, commitDescription, refresh]);

  const canCommit =
    stagedFiles.length > 0 && commitSummary.trim() && !isCommitting;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canCommit) {
        e.preventDefault();
        void handleCommit();
      }
    },
    [canCommit, handleCommit],
  );

  return (
    <div className="border-t p-3 shrink-0 bg-background space-y-2">
      <Input
        placeholder="Commit summary"
        className="h-8 text-sm"
        value={commitSummary}
        onChange={(e) => setCommitSummary(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={stagedFiles.length === 0}
      />
      <Textarea
        placeholder="Description (optional)"
        className="min-h-[60px] resize-none text-sm"
        value={commitDescription}
        onKeyDown={handleKeyDown}
        onChange={(e) => setCommitDescription(e.target.value)}
        disabled={stagedFiles.length === 0}
      />
      <AlertDialog
        open={commitError !== null}
        onOpenChange={(open) => !open && setCommitError(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader className="overflow-hidden">
            <AlertDialogTitle>Commit failed</AlertDialogTitle>
          </AlertDialogHeader>
          <pre className="text-xs whitespace-pre overflow-auto max-h-96 bg-muted p-4 rounded-md">
            {commitError}
          </pre>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button
        size="sm"
        className="w-full"
        disabled={!canCommit}
        onClick={handleCommit}
      >
        {isCommitting
          ? "Committing..."
          : stagedFiles.length === 0
            ? "Commit"
            : `Commit ${stagedFiles.length} file${stagedFiles.length !== 1 ? "s" : ""}`}
      </Button>
    </div>
  );
}

interface BranchFilesViewProps {
  branch: TrackedBranch;
  repositoryPath: string;
}

// Type for tracking which section a file belongs to when selected
type FileSelection = {
  path: string;
  section: "staged" | "unstaged";
} | null;

// Type for tracking line selection in diffs
type DiffLineSelection = {
  filePath: string;
  section: "staged" | "unstaged";
  lineRange: LineRange;
} | null;

export function BranchFilesView({
  branch,
  repositoryPath,
}: BranchFilesViewProps) {
  const { status, isLoading, refresh } = useGitStatus(repositoryPath);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [stagedDiffs, setStagedDiffs] = useState<Record<string, string>>({});
  const [unstagedDiffs, setUnstagedDiffs] = useState<Record<string, string>>(
    {},
  );
  const [loadedFilePaths, setLoadedFilePaths] = useState<Set<string>>(
    new Set(),
  );
  const [selectedFile, setSelectedFile] = useState<FileSelection>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [diffStyle, setDiffStyle] = useState<"unified" | "split">("unified");

  // State for file contents (for files with no diff - new untracked files)
  const [fileContents, setFileContents] = useState<Record<string, string>>({});

  // Theme for the File component
  const theme = useDiffTheme();

  // State for discard confirmation dialogs
  const [pendingFileDiscard, setPendingFileDiscard] = useState<string | null>(
    null,
  );
  const [pendingHunkDiscard, setPendingHunkDiscard] = useState<{
    filePath: string;
    hunkIndex: number;
    groupIndex: number;
  } | null>(null);

  // Line selection state for diffs
  const [lineSelection, setLineSelection] = useState<DiffLineSelection>(null);
  const [contextMenuDialogOpen, setContextMenuDialogOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Claude store for appending to prompt
  const appendToPrompt = useClaudeStore((s) => s.appendToPrompt);
  const requestInputFocus = useClaudeStore((s) => s.requestInputFocus);
  const location = useLocation();
  const navigate = useNavigate();

  const navigateToAgentTab = useCallback(() => {
    const pathParts = location.pathname.split("/");
    const branchesIndex = pathParts.indexOf("branches");
    if (branchesIndex !== -1 && branchesIndex + 1 < pathParts.length) {
      const basePath = pathParts.slice(0, branchesIndex + 2).join("/");
      requestInputFocus();
      void navigate({ to: `${basePath}/agent` });
    }
  }, [location.pathname, navigate, requestInputFocus]);

  // Handle line selection in a diff
  const handleLineSelected = useCallback(
    (filePath: string, section: "staged" | "unstaged") =>
      (range: LineRange | null) => {
        if (range) {
          setLineSelection({ filePath, section, lineRange: range });
        } else {
          setLineSelection(null);
        }
      },
    [],
  );

  // Clear line selection
  const clearLineSelection = useCallback(() => {
    setLineSelection(null);
  }, []);

  // Handle context menu request changes
  const handleContextMenuRequestChanges = useCallback(
    (instructions: string) => {
      if (!lineSelection) return;
      const reference = formatLineReference(
        lineSelection.filePath,
        lineSelection.lineRange,
      );
      appendToPrompt(`${reference} ${instructions}`);
      toast.success("Change request added to chat", {
        action: {
          label: "Go to chat",
          onClick: navigateToAgentTab,
        },
        duration: 3000,
      });
      clearLineSelection();
    },
    [lineSelection, appendToPrompt, navigateToAgentTab, clearLineSelection],
  );

  // Clear line selection on escape
  useEffect(() => {
    if (!lineSelection) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearLineSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lineSelection, clearLineSelection]);

  const stagedFiles = useMemo(
    () => status?.stagedFiles ?? [],
    [status?.stagedFiles],
  );
  const unstagedFiles = useMemo(
    () => status?.unstagedFiles ?? [],
    [status?.unstagedFiles],
  );
  const hasChanges = stagedFiles.length > 0 || unstagedFiles.length > 0;

  // Get all unique file paths for the diff view (same order as file list: staged first, then unstaged)
  const allFilePaths = useMemo(() => {
    const seen = new Set<string>();
    const paths: string[] = [];
    // Add staged files first
    for (const f of stagedFiles) {
      if (!seen.has(f.path)) {
        seen.add(f.path);
        paths.push(f.path);
      }
    }
    // Then add unstaged files (excluding duplicates)
    for (const f of unstagedFiles) {
      if (!seen.has(f.path)) {
        seen.add(f.path);
        paths.push(f.path);
      }
    }
    return paths;
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
        void refresh().then(emitGitChanged);
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
      setLoadedFilePaths(new Set());
      setFileContents({});
      return;
    }

    async function fetchDiffs() {
      const newStagedDiffs: Record<string, string> = {};
      const newUnstagedDiffs: Record<string, string> = {};
      const newFileContents: Record<string, string> = {};

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

          // If both diffs are empty, read the file content directly
          // This handles new untracked files that git doesn't diff
          if (
            !newStagedDiffs[filePath]?.trim() &&
            !newUnstagedDiffs[filePath]?.trim() &&
            window.fsAPI
          ) {
            try {
              const fullPath = `${repositoryPath}/${filePath}`;
              const content = await window.fsAPI.readFile(fullPath);
              newFileContents[filePath] = content;
            } catch {
              // File might be binary or unreadable - leave as empty
              newFileContents[filePath] = "";
            }
          }
        } catch {
          newStagedDiffs[filePath] = "";
          newUnstagedDiffs[filePath] = "";
        }
      }

      setStagedDiffs(newStagedDiffs);
      setUnstagedDiffs(newUnstagedDiffs);
      setFileContents(newFileContents);
      setLoadedFilePaths(new Set(allFilePaths));
    }

    void fetchDiffs();
  }, [allFilePaths, repositoryPath]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    emitGitChanged();
    setIsRefreshing(false);
  }, [refresh]);

  // Parse remote name from tracking ref (e.g., "origin/main" -> "origin")
  const upstreamRemote = useMemo(() => {
    if (!status?.tracking) return null;
    const slashIndex = status.tracking.indexOf("/");
    return slashIndex > 0 ? status.tracking.slice(0, slashIndex) : null;
  }, [status?.tracking]);

  const handleSync = useCallback(async () => {
    if (!status?.branch || !upstreamRemote) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Pull first if behind
      if ((status.behind ?? 0) > 0) {
        const pullResult = await gitPull(
          repositoryPath,
          upstreamRemote,
          status.branch,
        );
        if (!pullResult.success) {
          setSyncError(pullResult.error || "Pull failed");
          return;
        }
      }

      // Push if ahead
      if ((status.ahead ?? 0) > 0) {
        const pushResult = await gitPush(
          repositoryPath,
          upstreamRemote,
          status.branch,
          false,
        );
        if (!pushResult.success) {
          setSyncError(pushResult.error || "Push failed");
          return;
        }
      }

      await refresh();
      emitGitChanged();
    } finally {
      setIsSyncing(false);
    }
  }, [
    repositoryPath,
    upstreamRemote,
    status?.branch,
    status?.ahead,
    status?.behind,
    refresh,
  ]);

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
      emitGitChanged();
    },
    [repositoryPath, refresh],
  );

  const handleUnstage = useCallback(
    async (filePath: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.gitAPI) return;
      await window.gitAPI.unstage(repositoryPath, filePath);
      await refresh();
      emitGitChanged();
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
      emitGitChanged();
    },
    [repositoryPath, unstagedFiles, refresh],
  );

  const handleDiscard = useCallback((filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingFileDiscard(filePath);
  }, []);

  const confirmFileDiscard = useCallback(async () => {
    if (!window.gitAPI || !pendingFileDiscard) return;
    await window.gitAPI.discard(repositoryPath, pendingFileDiscard);
    setPendingFileDiscard(null);
    await refresh();
    emitGitChanged();
  }, [repositoryPath, pendingFileDiscard, refresh]);

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
          emitGitChanged();
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
          emitGitChanged();
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
    (filePath: string, hunkIndex: number, groupIndex: number) => {
      setPendingHunkDiscard({ filePath, hunkIndex, groupIndex });
    },
    [],
  );

  const confirmHunkDiscard = useCallback(async () => {
    if (!window.gitAPI || !pendingHunkDiscard) return;

    const { filePath, hunkIndex, groupIndex } = pendingHunkDiscard;
    const unstagedPatch = unstagedDiffs[filePath];
    if (!unstagedPatch) {
      setPendingHunkDiscard(null);
      return;
    }

    const hunks = parseHunks(unstagedPatch);
    if (hunkIndex >= hunks.length) {
      setPendingHunkDiscard(null);
      return;
    }

    const hunk = hunks[hunkIndex];
    if (groupIndex >= hunk.changeGroups.length) {
      setPendingHunkDiscard(null);
      return;
    }

    const group = hunk.changeGroups[groupIndex];
    const patch = createChangeGroupPatch(filePath, hunk, group, unstagedPatch);

    try {
      const result = await window.gitAPI.discardHunk(repositoryPath, patch);
      if (result.success) {
        await refresh();
        emitGitChanged();
      } else {
        console.error("Failed to discard change group:", result.error);
      }
    } catch (error) {
      console.error("Error discarding change group:", error);
    }
    setPendingHunkDiscard(null);
  }, [repositoryPath, unstagedDiffs, pendingHunkDiscard, refresh]);

  const scrollToFile = useCallback(
    (path: string, section: "staged" | "unstaged") => {
      setSelectedFile({ path, section });
      // Use data attributes for reliable matching - CSS.escape handles special characters
      const selector = `[data-file-section="${section}"][data-file-path="${CSS.escape(path)}"]`;
      const element = document.querySelector(selector);
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
              className="px-2 outline-none"
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
                <div>
                  <div className="py-2 text-sm font-medium min-h-[40px] flex items-center justify-between group min-h-[40px]">
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

              {!hasChanges && (
                <Empty>
                  <EmptyIcon>
                    <FileCode />
                  </EmptyIcon>
                  <EmptyTitle>No changes detected</EmptyTitle>
                  <EmptyDescription>
                    Changes will appear here as you work
                  </EmptyDescription>
                </Empty>
              )}
            </div>
          </Scrollable.Vertical>

          {/* Summary footer */}
          {status && (
            <div className="px-3 py-2 border-t text-xs text-muted-foreground shrink-0 flex items-center justify-between">
              <div>
                {(status.ahead ?? 0) > 0 && <span>{status.ahead} ahead</span>}
                {(status.ahead ?? 0) > 0 && (status.behind ?? 0) > 0 && " · "}
                {(status.behind ?? 0) > 0 && (
                  <span>{status.behind} behind</span>
                )}
                {(status.ahead ?? 0) === 0 && (status.behind ?? 0) === 0 && (
                  <span>Up to date with remote</span>
                )}
                {syncError && (
                  <span className="text-destructive ml-2">{syncError}</span>
                )}
              </div>
              {upstreamRemote &&
                ((status.ahead ?? 0) > 0 || (status.behind ?? 0) > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={handleSync}
                    disabled={isSyncing}
                    title="Sync with remote"
                  >
                    <ArrowDownUp
                      className={cn(
                        "h-3.5 w-3.5 mr-1",
                        isSyncing && "animate-spin",
                      )}
                    />
                    Sync
                  </Button>
                )}
            </div>
          )}

          {/* Commit UI - always visible, disabled when no staged files */}
          <CommitForm
            repositoryPath={repositoryPath}
            stagedFiles={stagedFiles}
            refresh={refresh}
          />
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={70} minSize={30}>
        {/* Right panel: Diff content */}
        <div className="flex-1 min-w-0 flex flex-col h-full">
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
          <Scrollable.Vertical ref={contentRef} className="flex-1 min-h-0">
            {allFilePaths.length === 0 ? (
              <Empty className="pt-6">
                <EmptyIcon>
                  <FileCode />
                </EmptyIcon>
                <EmptyTitle>No changes to display</EmptyTitle>
                <EmptyDescription>
                  Changes will appear here when you modify files
                </EmptyDescription>
              </Empty>
            ) : (
              <div className="space-y-4">
                {allFilePaths.map((filePath) => {
                  const hasUnstaged = unstagedDiffs[filePath]?.trim();
                  const hasStaged = stagedDiffs[filePath]?.trim();
                  const hasBoth = hasUnstaged && hasStaged;

                  return (
                    <div key={filePath} className="pb-4">
                      <div className="p-4 space-y-4">
                        {/* Staged changes */}
                        {hasStaged && (
                          <div
                            data-file-section="staged"
                            data-file-path={filePath}
                          >
                            {hasBoth && (
                              <div className="text-sm font-medium text-muted-foreground mb-2">
                                Staged Changes
                              </div>
                            )}
                            <ContextMenu>
                              <ContextMenuTrigger asChild>
                                <div className="overflow-x-auto max-w-full border rounded">
                                  <LazyDiffViewer
                                    diff={stagedDiffs[filePath]}
                                    filePath={filePath}
                                    diffStyle={diffStyle}
                                    lineAnnotations={createStagedAnnotations(
                                      filePath,
                                    )}
                                    enableLineSelection
                                    selectedLines={
                                      lineSelection?.filePath === filePath &&
                                      lineSelection?.section === "staged"
                                        ? lineSelection.lineRange
                                        : null
                                    }
                                    onLineSelected={handleLineSelected(
                                      filePath,
                                      "staged",
                                    )}
                                    onUnstageHunk={handleUnstageHunk}
                                  />
                                </div>
                              </ContextMenuTrigger>
                              {lineSelection?.filePath === filePath &&
                                lineSelection?.section === "staged" && (
                                  <ContextMenuContent>
                                    <ContextMenuItem
                                      onClick={() =>
                                        setContextMenuDialogOpen(true)
                                      }
                                    >
                                      <MessageSquarePlus className="h-4 w-4" />
                                      Request changes...
                                    </ContextMenuItem>
                                  </ContextMenuContent>
                                )}
                            </ContextMenu>
                          </div>
                        )}

                        {/* Unstaged changes */}
                        {hasUnstaged && (
                          <div
                            data-file-section="unstaged"
                            data-file-path={filePath}
                          >
                            {hasBoth && (
                              <div className="text-sm font-medium text-muted-foreground mb-2">
                                Unstaged Changes
                              </div>
                            )}
                            <ContextMenu>
                              <ContextMenuTrigger asChild>
                                <div className="overflow-x-auto max-w-full border rounded">
                                  <LazyDiffViewer
                                    diff={unstagedDiffs[filePath]}
                                    filePath={filePath}
                                    diffStyle={diffStyle}
                                    lineAnnotations={createUnstagedAnnotations(
                                      filePath,
                                    )}
                                    enableLineSelection
                                    selectedLines={
                                      lineSelection?.filePath === filePath &&
                                      lineSelection?.section === "unstaged"
                                        ? lineSelection.lineRange
                                        : null
                                    }
                                    onLineSelected={handleLineSelected(
                                      filePath,
                                      "unstaged",
                                    )}
                                    onStageHunk={handleStageHunk}
                                    onDiscardHunk={handleDiscardHunk}
                                  />
                                </div>
                              </ContextMenuTrigger>
                              {lineSelection?.filePath === filePath &&
                                lineSelection?.section === "unstaged" && (
                                  <ContextMenuContent>
                                    <ContextMenuItem
                                      onClick={() =>
                                        setContextMenuDialogOpen(true)
                                      }
                                    >
                                      <MessageSquarePlus className="h-4 w-4" />
                                      Request changes...
                                    </ContextMenuItem>
                                  </ContextMenuContent>
                                )}
                            </ContextMenu>
                          </div>
                        )}

                        {/* Loading state - show skeleton while we haven't loaded this file yet */}
                        {!hasUnstaged &&
                          !hasStaged &&
                          !loadedFilePaths.has(filePath) && (
                            <div className="border rounded">
                              {/* Skeleton header */}
                              <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-4 w-48" />
                              </div>
                              {/* Skeleton diff lines */}
                              <div className="space-y-1 p-3">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                              </div>
                            </div>
                          )}

                        {/* Show file content for new files or message for binary files */}
                        {!hasUnstaged &&
                          !hasStaged &&
                          loadedFilePaths.has(filePath) && (
                            <div
                              data-file-section={
                                unstagedFiles.some((f) => f.path === filePath)
                                  ? "unstaged"
                                  : "staged"
                              }
                              data-file-path={filePath}
                            >
                              {fileContents[filePath] ? (
                                <File
                                  file={{
                                    name: filePath,
                                    contents: fileContents[filePath],
                                    lang: getFiletypeFromFileName(filePath),
                                  }}
                                  options={{
                                    themeType: theme,
                                    overflow: "scroll",
                                  }}
                                  className="font-mono text-xs border rounded"
                                />
                              ) : (
                                <div className="text-muted-foreground text-sm p-4 border rounded">
                                  Binary file
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Scrollable.Vertical>
        </div>
      </ResizablePanel>

      {/* Request changes dialog for line selection */}
      <RequestChangesDialog
        filePath={lineSelection?.filePath ?? ""}
        lineRange={lineSelection?.lineRange}
        open={contextMenuDialogOpen}
        onOpenChange={setContextMenuDialogOpen}
        onSubmit={handleContextMenuRequestChanges}
      />

      {/* Discard file confirmation dialog */}
      <AlertDialog
        open={pendingFileDiscard !== null}
        onOpenChange={(open) => !open && setPendingFileDiscard(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently discard all unstaged changes to{" "}
              <span className="font-mono font-medium">
                {pendingFileDiscard}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmFileDiscard}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard hunk confirmation dialog */}
      <AlertDialog
        open={pendingHunkDiscard !== null}
        onOpenChange={(open) => !open && setPendingHunkDiscard(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently discard this change in{" "}
              <span className="font-mono font-medium">
                {pendingHunkDiscard?.filePath}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmHunkDiscard}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ResizablePanelGroup>
  );
}
