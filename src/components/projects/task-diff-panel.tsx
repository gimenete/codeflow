import { useState, useEffect, useCallback } from "react";
import { RefreshCw, FileCode, Plus, Minus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  useGitStatus,
  startWatcher,
  stopWatcher,
  onWatcherChange,
  removeWatcherListeners,
} from "@/lib/git";
import { isElectron } from "@/lib/platform";
import type { Task } from "@/lib/github-types";

interface TaskDiffPanelProps {
  task: Task;
  projectPath: string;
}

export function TaskDiffPanel({ task, projectPath }: TaskDiffPanelProps) {
  const { status, isLoading, refresh } = useGitStatus(projectPath);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [fileDiffs, setFileDiffs] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Setup file watcher
  useEffect(() => {
    if (!isElectron()) return;

    const watcherId = `task-${task.id}`;
    const watchPath = task.worktreePath || projectPath;

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
  }, [task.id, task.worktreePath, projectPath, refresh]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  const toggleFile = useCallback(
    async (filePath: string) => {
      const newExpanded = new Set(expandedFiles);

      if (newExpanded.has(filePath)) {
        newExpanded.delete(filePath);
      } else {
        newExpanded.add(filePath);

        // Fetch diff for this file if not already loaded
        if (!fileDiffs[filePath] && isElectron() && window.gitAPI) {
          try {
            const diff = await window.gitAPI.getDiffFile(projectPath, filePath);
            setFileDiffs((prev) => ({ ...prev, [filePath]: diff }));
          } catch {
            setFileDiffs((prev) => ({
              ...prev,
              [filePath]: "Error loading diff",
            }));
          }
        }
      }

      setExpandedFiles(newExpanded);
    },
    [expandedFiles, fileDiffs, projectPath],
  );

  const getStatusIcon = (fileStatus: string) => {
    switch (fileStatus) {
      case "added":
      case "untracked":
        return <Plus className="h-4 w-4 text-green-500" />;
      case "deleted":
        return <Minus className="h-4 w-4 text-red-500" />;
      case "modified":
        return <Edit className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileCode className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const files = status?.files ?? [];
  const hasChanges = files.length > 0;

  return (
    <div className="flex flex-col h-full border-l">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div>
          <h2 className="font-semibold">Changes</h2>
          <p className="text-xs text-muted-foreground">
            {status?.branch ?? "Loading..."}
            {hasChanges &&
              ` - ${files.length} file${files.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
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

      {/* File list */}
      <ScrollArea className="flex-1">
        {isLoading && files.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading changes...
          </div>
        ) : !hasChanges ? (
          <div className="p-4 text-center text-muted-foreground">
            <FileCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No changes detected</p>
            <p className="text-xs mt-1">Changes will appear here as you work</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {files.map((file) => (
              <Collapsible
                key={file.path}
                open={expandedFiles.has(file.path)}
                onOpenChange={() => toggleFile(file.path)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-accent/50 transition-colors",
                      expandedFiles.has(file.path) && "bg-accent/50",
                    )}
                  >
                    {getStatusIcon(file.status)}
                    <span className="truncate flex-1 font-mono text-xs">
                      {file.path}
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 mt-1 mb-2 rounded border bg-muted/30 overflow-auto">
                    {fileDiffs[file.path] ? (
                      <pre className="p-2 text-xs font-mono whitespace-pre overflow-x-auto">
                        {fileDiffs[file.path].split("\n").map((line, i) => (
                          <div
                            key={i}
                            className={cn(
                              "px-1",
                              line.startsWith("+") &&
                                !line.startsWith("+++") &&
                                "bg-green-500/20 text-green-700 dark:text-green-400",
                              line.startsWith("-") &&
                                !line.startsWith("---") &&
                                "bg-red-500/20 text-red-700 dark:text-red-400",
                              line.startsWith("@@") &&
                                "text-blue-600 dark:text-blue-400",
                            )}
                          >
                            {line || " "}
                          </div>
                        ))}
                      </pre>
                    ) : (
                      <div className="p-2 text-xs text-muted-foreground">
                        Loading diff...
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Summary footer */}
      {hasChanges && status && (
        <div className="px-4 py-2 border-t text-xs text-muted-foreground">
          {(status.ahead ?? 0) > 0 && <span>{status.ahead} ahead</span>}
          {(status.ahead ?? 0) > 0 && (status.behind ?? 0) > 0 && " · "}
          {(status.behind ?? 0) > 0 && <span>{status.behind} behind</span>}
          {(status.ahead ?? 0) === 0 && (status.behind ?? 0) === 0 && (
            <span>Up to date with remote</span>
          )}
        </div>
      )}
    </div>
  );
}
