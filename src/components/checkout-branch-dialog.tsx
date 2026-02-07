import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { Branch } from "@/components/branch";
import { gitFetch, checkoutBranch } from "@/lib/git";
import {
  useBranchesStore,
  useBranchByName,
} from "@/lib/branches-store";
import type { Repository } from "@/lib/github-types";

interface CheckoutBranchDialogProps {
  repository: Repository;
  branchName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutBranchDialog({
  repository,
  branchName,
  open,
  onOpenChange,
}: CheckoutBranchDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const addBranch = useBranchesStore((state) => state.addBranch);
  const existingTrackedBranch = useBranchByName(repository.id, branchName);

  const handleCheckout = async () => {
    if (!repository.path) return;

    // If already tracked, navigate to it
    if (existingTrackedBranch) {
      onOpenChange(false);
      void navigate({
        to: "/repositories/$repository/branches/$branch",
        params: {
          repository: repository.slug,
          branch: existingTrackedBranch.id,
        },
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch from remote to ensure we have the latest refs
      const fetchResult = await gitFetch(repository.path);
      if (!fetchResult.success) {
        setError(fetchResult.error ?? "Failed to fetch from remote");
        setIsLoading(false);
        return;
      }

      // Checkout the branch (git will auto-track remote branch)
      const checkoutResult = await checkoutBranch(repository.path, branchName);
      if (!checkoutResult.success) {
        setError(checkoutResult.error ?? "Failed to check out branch");
        setIsLoading(false);
        return;
      }

      // Track the branch in the store
      const trackedBranch = addBranch({
        repositoryId: repository.id,
        branch: branchName,
        worktreePath: null,
        conversationId: null,
        pullNumber: null,
        pullOwner: null,
        pullRepo: null,
      });

      onOpenChange(false);

      // Navigate to the tracked branch
      void navigate({
        to: "/repositories/$repository/branches/$branch",
        params: {
          repository: repository.slug,
          branch: trackedBranch.id,
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to check out branch",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check Out Branch</DialogTitle>
          <DialogDescription>
            Fetch from remote and check out this branch locally.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Branch:</span>
            <Branch name={branchName} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Repository:</span>
            <span className="text-sm font-mono">{repository.path}</span>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCheckout} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingTrackedBranch ? "Go to Branch" : "Check Out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
