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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useBranches, mergeBranch, emitGitChanged } from "@/lib/git";
import type { TrackedBranch } from "@/lib/github-types";

type MergeStrategy = "merge" | "squash" | "rebase";

interface MergeBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: TrackedBranch;
  repositoryPath: string;
}

export function MergeBranchDialog({
  open,
  onOpenChange,
  branch,
  repositoryPath,
}: MergeBranchDialogProps) {
  const { branches } = useBranches(repositoryPath);
  const [targetBranch, setTargetBranch] = useState("");
  const [strategy, setStrategy] = useState<MergeStrategy>("merge");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableBranches = branches.filter((b) => b !== branch.branch);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTargetBranch("");
      setStrategy("merge");
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBranch) return;

    setError(null);
    setIsLoading(true);

    try {
      const result = await mergeBranch(
        repositoryPath,
        branch.branch,
        targetBranch,
        strategy,
      );
      if (!result.success) {
        setError(result.error ?? "Failed to merge branch");
        return;
      }
      emitGitChanged();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge branch");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge Branch</DialogTitle>
          <DialogDescription>
            Merge <strong>{branch.branch}</strong> into another branch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="targetBranch">Target Branch</Label>
              <Select value={targetBranch} onValueChange={setTargetBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target branch" />
                </SelectTrigger>
                <SelectContent>
                  {availableBranches.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Strategy</Label>
              <RadioGroup
                value={strategy}
                onValueChange={(v) => setStrategy(v as MergeStrategy)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="merge" id="strategy-merge" />
                  <Label htmlFor="strategy-merge" className="font-normal">
                    Merge commit
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="squash" id="strategy-squash" />
                  <Label htmlFor="strategy-squash" className="font-normal">
                    Squash and merge
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rebase" id="strategy-rebase" />
                  <Label htmlFor="strategy-rebase" className="font-normal">
                    Rebase
                  </Label>
                </div>
              </RadioGroup>
            </div>
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
            <Button type="submit" disabled={isLoading || !targetBranch}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {strategy === "squash"
                ? "Squash and merge"
                : strategy === "rebase"
                  ? "Rebase"
                  : "Merge"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
