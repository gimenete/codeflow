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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useRemoteBranches } from "@/lib/github";
import { Skeleton } from "@/components/ui/skeleton";

interface EditBaseBranchDialogProps {
  accountId: string;
  owner: string;
  repo: string;
  pullRequestId: string;
  currentBaseBranch: string;
  headBranch: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (pullRequestId: string, baseRefName: string) => Promise<void>;
}

export function EditBaseBranchDialog({
  accountId,
  owner,
  repo,
  pullRequestId,
  currentBaseBranch,
  headBranch,
  open,
  onOpenChange,
  onSave,
}: EditBaseBranchDialogProps) {
  const [selectedBranch, setSelectedBranch] = useState(currentBaseBranch);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: branches, isLoading: isBranchesLoading } = useRemoteBranches(
    accountId,
    open ? owner : undefined,
    open ? repo : undefined,
  );

  const handleSave = async () => {
    if (selectedBranch === currentBaseBranch) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(pullRequestId, selectedBranch);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update base branch",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Filter out the head branch from selectable base branches
  const availableBranches = branches?.filter((b) => b.name !== headBranch);

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          setSelectedBranch(currentBaseBranch);
          setError(null);
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Base Branch</DialogTitle>
          <DialogDescription>
            Change the base branch that this pull request will be merged into.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseBranch">Base branch</Label>
            {isBranchesLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {availableBranches?.map((branch) => (
                    <SelectItem key={branch.name} value={branch.name}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isLoading ||
              isBranchesLoading ||
              selectedBranch === currentBaseBranch
            }
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
