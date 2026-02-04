import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteBranch, emitGitChanged } from "@/lib/git";
import { useBranchesStore } from "@/lib/branches-store";
import type { TrackedBranch } from "@/lib/github-types";

interface DeleteBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: TrackedBranch;
  repositoryPath: string;
  onNavigateAway: () => void;
}

export function DeleteBranchDialog({
  open,
  onOpenChange,
  branch,
  repositoryPath,
  onNavigateAway,
}: DeleteBranchDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleStopTracking = () => {
    useBranchesStore.getState().deleteBranch(branch.id);
    onOpenChange(false);
    onNavigateAway();
  };

  const handleDeleteBranch = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await deleteBranch(repositoryPath, branch.branch, true);
      if (!result.success) {
        setError(result.error ?? "Failed to delete branch");
        return;
      }
      useBranchesStore.getState().deleteBranch(branch.id);
      emitGitChanged();
      onOpenChange(false);
      onNavigateAway();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete branch");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Branch</DialogTitle>
          <DialogDescription>
            What would you like to do with the branch{" "}
            <strong>{branch.branch}</strong>?
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          <strong>Stop Tracking</strong> will remove the branch from the sidebar
          but keep it in git. <strong>Delete Branch</strong> will permanently
          delete the git branch.
        </p>

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
            type="button"
            variant="secondary"
            onClick={handleStopTracking}
            disabled={isLoading}
          >
            Stop Tracking
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteBranch}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Branch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
