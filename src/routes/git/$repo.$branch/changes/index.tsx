import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Minus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useRepository,
  useGitStatus,
  useFileDiff,
  commitChanges,
} from "@/lib/git";
import { DiffViewer } from "@/components/diff-viewer";
import { Scrollable } from "@/components/flex-layout";

export const Route = createFileRoute("/git/$repo/$branch/changes/")({
  component: ChangesView,
});

function ChangesView() {
  const { repo, branch } = Route.useParams();
  const repository = useRepository(repo);
  const { status, refresh: refreshStatus } = useGitStatus(repository?.path);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [commitSummary, setCommitSummary] = useState("");
  const [commitDescription, setCommitDescription] = useState("");
  const [filter, setFilter] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);

  const handleCommit = async () => {
    if (!repository?.path || !commitSummary.trim() || selectedFiles.size === 0)
      return;
    setIsCommitting(true);
    const result = await commitChanges(
      repository.path,
      Array.from(selectedFiles),
      commitSummary,
      commitDescription,
    );
    if (result.success) {
      setCommitSummary("");
      setCommitDescription("");
      setSelectedFiles(new Set());
      setSelectedFile(null);
      await refreshStatus();
    }
    setIsCommitting(false);
  };

  const { diff } = useFileDiff(repository?.path, selectedFile);

  if (!repository) {
    return null;
  }

  const changedFiles = status?.files ?? [];
  const filteredFiles = filter
    ? changedFiles.filter((f) =>
        f.path.toLowerCase().includes(filter.toLowerCase()),
      )
    : changedFiles;

  const toggleFileSelection = (path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  const toggleAllFiles = () => {
    if (selectedFiles.size === changedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(changedFiles.map((f) => f.path)));
    }
  };

  const getStatusIcon = (fileStatus: string) => {
    switch (fileStatus) {
      case "added":
        return <Plus className="h-3 w-3 text-green-500" />;
      case "deleted":
        return <Minus className="h-3 w-3 text-red-500" />;
      case "modified":
        return <FileText className="h-3 w-3 text-yellow-500" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-80 border-r flex flex-col shrink-0">
        <Tabs value="changes">
          <TabsList className="w-full rounded-none border-b shrink-0">
            <Link
              to="/git/$repo/$branch/changes"
              params={{ repo, branch }}
              className="flex-1"
            >
              <TabsTrigger value="changes" className="w-full">
                Changes ({changedFiles.length})
              </TabsTrigger>
            </Link>
            <Link
              to="/git/$repo/$branch/history"
              params={{ repo, branch }}
              className="flex-1"
            >
              <TabsTrigger value="history" className="w-full">
                History
              </TabsTrigger>
            </Link>
          </TabsList>
        </Tabs>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-2 border-b shrink-0">
            <Input
              placeholder="Filter files..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-8"
            />
          </div>

          <div className="p-2 border-b flex items-center gap-2 shrink-0">
            <Checkbox
              checked={
                selectedFiles.size === changedFiles.length &&
                changedFiles.length > 0
              }
              onChange={toggleAllFiles}
            />
            <span className="text-sm text-muted-foreground">
              {selectedFiles.size} of {changedFiles.length} selected
            </span>
          </div>

          <Scrollable.Vertical className="flex-1">
            <div className="p-2 space-y-1">
              {filteredFiles.map((file) => (
                <div
                  key={file.path}
                  className={`flex items-center gap-2 p-1.5 rounded text-sm cursor-pointer hover:bg-accent ${
                    selectedFile === file.path ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedFile(file.path)}
                >
                  <Checkbox
                    checked={selectedFiles.has(file.path)}
                    onChange={() => toggleFileSelection(file.path)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="flex-1 truncate">{file.path}</span>
                  {getStatusIcon(file.status)}
                </div>
              ))}
              {filteredFiles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No changes
                </p>
              )}
            </div>
          </Scrollable.Vertical>

          <Separator />

          <div className="p-3 space-y-3 shrink-0">
            <Input
              placeholder="Summary (required)"
              value={commitSummary}
              onChange={(e) => setCommitSummary(e.target.value)}
            />
            <Textarea
              placeholder="Description"
              value={commitDescription}
              onChange={(e) => setCommitDescription(e.target.value)}
              rows={3}
            />
            <Button
              className="w-full"
              disabled={
                isCommitting ||
                !commitSummary.trim() ||
                selectedFiles.size === 0
              }
              onClick={handleCommit}
            >
              {isCommitting
                ? "Committing..."
                : `Commit${selectedFiles.size > 0 ? ` ${selectedFiles.size} file${selectedFiles.size > 1 ? "s" : ""}` : ""}`}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {selectedFile ? (
          <>
            <div className="border-b px-4 py-2 flex items-center gap-2 shrink-0">
              <span className="text-sm font-mono truncate">{selectedFile}</span>
            </div>
            <ScrollArea className="flex-1">
              <DiffViewer diff={diff} filePath={selectedFile} />
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a file to view changes
          </div>
        )}
      </div>
    </div>
  );
}
