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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renameBranch, emitGitChanged } from "@/lib/git";
import { useBranchesStore } from "@/lib/branches-store";
import type { TrackedBranch } from "@/lib/github-types";

interface RenameBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: TrackedBranch;
  repositoryPath: string;
}

export function RenameBranchDialog({
  open,
  onOpenChange,
  branch,
  repositoryPath,
}: RenameBranchDialogProps) {
  const [newName, setNewName] = useState(branch.branch);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setNewName(branch.branch);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || trimmed === branch.branch) return;

    setError(null);
    setIsLoading(true);

    try {
      const result = await renameBranch(repositoryPath, branch.branch, trimmed);
      if (!result.success) {
        setError(result.error ?? "Failed to rename branch");
        return;
      }
      useBranchesStore.getState().updateBranch(branch.id, { branch: trimmed });
      emitGitChanged();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename branch");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Branch</DialogTitle>
          <DialogDescription>
            Rename the branch <strong>{branch.branch}</strong> to a new name.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-2 py-4">
            <Label htmlFor="newBranchName">New Branch Name</Label>
            <Input
              id="newBranchName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="new-branch-name"
            />
          </div>

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
                isLoading || !newName.trim() || newName.trim() === branch.branch
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
