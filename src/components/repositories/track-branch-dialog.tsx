import { useState, useEffect } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Loader2, GitBranch, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranches, createBranch } from "@/lib/git";
import { useBranchesStore, useBranchByName } from "@/lib/branches-store";

interface TrackBranchDialogProps {
  repositoryId: string;
  repositoryPath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrackBranchDialog({
  repositoryId,
  repositoryPath,
  open,
  onOpenChange,
}: TrackBranchDialogProps) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [newBranchName, setNewBranchName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { branches, currentBranch } = useBranches(repositoryPath);
  const addBranch = useBranchesStore((state) => state.addBranch);
  const navigate = useNavigate();
  const { repository: repositorySlug } = useParams({ strict: false });

  // Check if a branch is already tracked
  const existingTrackedBranch = useBranchByName(
    repositoryId,
    mode === "existing" ? selectedBranch : newBranchName,
  );

  // Set default branch on open
  useEffect(() => {
    if (open && branches.length > 0) {
      // Try to select a non-main branch by default if available
      const nonMainBranch = branches.find(
        (b) => b !== "main" && b !== "master" && b !== currentBranch,
      );
      setSelectedBranch(nonMainBranch ?? branches[0]);
    }
  }, [open, branches, currentBranch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const branchName =
      mode === "existing" ? selectedBranch : newBranchName.trim();

    if (!branchName) {
      setError("Please select or enter a branch name");
      return;
    }

    if (existingTrackedBranch) {
      setError("This branch is already tracked");
      return;
    }

    setIsLoading(true);

    try {
      // Create new branch if needed
      if (mode === "new") {
        const result = await createBranch(repositoryPath, branchName, true);
        if (!result.success) {
          setError(result.error ?? "Failed to create branch");
          setIsLoading(false);
          return;
        }
      }

      // Track the branch
      const trackedBranch = addBranch({
        repositoryId,
        branch: branchName,
        worktreePath: null,
        conversationId: null,
      });

      // Reset and close
      setSelectedBranch("");
      setNewBranchName("");
      setMode("existing");
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
      setMode("existing");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track Branch</DialogTitle>
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
              <TabsTrigger value="existing">
                <GitBranch className="h-4 w-4 mr-2" />
                Existing Branch
              </TabsTrigger>
              <TabsTrigger value="new">
                <Plus className="h-4 w-4 mr-2" />
                New Branch
              </TabsTrigger>
            </TabsList>

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
                        {branch}
                        {branch === currentBranch && " (current)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="new" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newBranch">Branch Name</Label>
                <Input
                  id="newBranch"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="feature/my-feature"
                />
                <p className="text-xs text-muted-foreground">
                  The branch will be created from the current HEAD and checked
                  out.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {existingTrackedBranch && (
            <p className="text-sm text-amber-600">
              This branch is already tracked.
            </p>
          )}
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
                (mode === "new" && !newBranchName.trim()) ||
                !!existingTrackedBranch
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Track Branch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
