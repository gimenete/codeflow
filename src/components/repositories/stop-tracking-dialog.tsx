import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBranchesStore } from "@/lib/branches-store";
import type { TrackedBranch } from "@/lib/github-types";

interface StopTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: TrackedBranch;
  onConfirmed: () => void;
}

export function StopTrackingDialog({
  open,
  onOpenChange,
  branch,
  onConfirmed,
}: StopTrackingDialogProps) {
  const handleStopTracking = () => {
    useBranchesStore.getState().deleteBranch(branch.id);
    onOpenChange(false);
    onConfirmed();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stop Tracking</DialogTitle>
          <DialogDescription>
            Stop tracking the branch <strong>{branch.branch}</strong>? It will
            be removed from the sidebar but the git branch will be kept.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleStopTracking}>
            Stop Tracking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
