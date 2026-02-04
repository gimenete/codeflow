import { useState, useEffect } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Loader2, GitBranch, Plus, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranches, createBranch, createWorktree } from "@/lib/git";
import {
  useBranchesStore,
  useBranchByName,
  useBranchesByRepositoryId,
} from "@/lib/branches-store";
import type { Repository } from "@/lib/github-types";

interface TrackBranchDialogProps {
  repository: Repository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrackBranchDialog({
  repository,
  open,
  onOpenChange,
}: TrackBranchDialogProps) {
  const repositoryId = repository.id;
  const repositoryPath = repository.path;

  const [mode, setMode] = useState<"existing" | "new">("new");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [newBranchName, setNewBranchName] = useState(
    repository.branchPrefix ?? "",
  );
  const [useWorktree, setUseWorktree] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");

  useEffect(() => {
    async function fetchUsername() {
      if (window.appAPI?.getUsername) {
        try {
          const name = await window.appAPI.getUsername();
          setUsername(name);
        } catch {
          // Ignore errors
        }
      }
    }
    void fetchUsername();
  }, []);

  // All hooks must be called unconditionally
  const { branches, currentBranch } = useBranches(repositoryPath ?? undefined);
  const trackedBranches = useBranchesByRepositoryId(repositoryId);
  const addBranch = useBranchesStore((state) => state.addBranch);
  const navigate = useNavigate();
  const { repository: repositorySlug } = useParams({ strict: false });

  // Check if a branch is already tracked
  const existingTrackedBranch = useBranchByName(
    repositoryId,
    mode === "existing" ? selectedBranch : newBranchName,
  );

  // Build a set of tracked branch names for quick lookup
  const trackedBranchNames = new Set(trackedBranches.map((b) => b.branch));

  // Set default branch on open
  useEffect(() => {
    if (open && branches.length > 0) {
      // Try to select a non-main branch by default if available
      const nonMainBranch = branches.find(
        (b) => b !== "main" && b !== "master" && b !== currentBranch,
      );
      setSelectedBranch(nonMainBranch ?? branches[0]);
    }
    if (open) {
      setNewBranchName(repository.branchPrefix ?? "");
      setUseWorktree(true);
    }
  }, [open, branches, currentBranch, repository.branchPrefix]);

  // If no local path is configured, show a message
  if (!repositoryPath) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Branch</DialogTitle>
            <DialogDescription>
              A local repository path is required to track branches.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-muted-foreground">
            <p>Please configure a local path for this repository first.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const branchName =
      mode === "existing" ? selectedBranch : newBranchName.trim();

    if (!branchName) {
      setError("Please select or enter a branch name");
      return;
    }

    // If already tracked, navigate to it
    if (existingTrackedBranch) {
      onOpenChange(false);
      void navigate({
        to: "/repositories/$repository/branches/$branch",
        params: {
          repository: repositorySlug!,
          branch: existingTrackedBranch.id,
        },
      });
      return;
    }

    setIsLoading(true);

    try {
      let worktreePath: string | null = null;

      // Create new branch if needed
      if (mode === "new") {
        if (repository.worktreesDirectory && useWorktree) {
          // Create branch via worktree
          worktreePath = `${repository.worktreesDirectory.replace(/\/+$/, "")}/${branchName}`;
          const result = await createWorktree(
            repositoryPath,
            worktreePath,
            branchName,
          );
          if (!result.success) {
            setError(result.error ?? "Failed to create worktree");
            setIsLoading(false);
            return;
          }
        } else {
          const result = await createBranch(repositoryPath, branchName, true);
          if (!result.success) {
            setError(result.error ?? "Failed to create branch");
            setIsLoading(false);
            return;
          }
        }
      }

      // Track the branch
      const trackedBranch = addBranch({
        repositoryId,
        branch: branchName,
        worktreePath,
        conversationId: null,
      });

      // Reset and close
      setSelectedBranch("");
      setNewBranchName("");
      setMode("new");
      onOpenChange(false);

      // Navigate to the new tracked branch
      void navigate({
        to: "/repositories/$repository/branches/$branch",
        params: { repository: repositorySlug!, branch: trackedBranch.id },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to track branch");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedBranch("");
      setNewBranchName("");
      setMode("new");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const submitLabel = existingTrackedBranch
    ? "Go to Branch"
    : mode === "new"
      ? "Create Branch"
      : "Track Branch";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Branch</DialogTitle>
          <DialogDescription>
            Track an existing branch or create a new one to work with Claude.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as "existing" | "new")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">
                <Plus className="h-4 w-4 mr-2" />
                New Branch
              </TabsTrigger>
              <TabsTrigger value="existing">
                <GitBranch className="h-4 w-4 mr-2" />
                Existing Branch
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newBranch">Branch Name</Label>
                <Input
                  id="newBranch"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder={username ? `${username}-` : "feature/my-feature"}
                />
                <p className="text-xs text-muted-foreground">
                  The branch will be created from the current HEAD and checked
                  out.
                </p>
              </div>

              {repository.worktreesDirectory && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="useWorktree"
                    checked={useWorktree}
                    onCheckedChange={(checked) =>
                      setUseWorktree(checked === true)
                    }
                  />
                  <Label htmlFor="useWorktree" className="text-sm font-normal">
                    Create in worktree
                  </Label>
                </div>
              )}
            </TabsContent>

            <TabsContent value="existing" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Select
                  value={selectedBranch}
                  onValueChange={setSelectedBranch}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        <span className="flex items-center gap-2">
                          {branch}
                          {branch === currentBranch && " (current)"}
                          {trackedBranchNames.has(branch) && (
                            <Eye className="h-3 w-3 text-muted-foreground" />
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                (mode === "existing" && !selectedBranch) ||
                (mode === "new" && !newBranchName.trim())
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
