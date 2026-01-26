import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createBranch } from "@/lib/git";

interface CreateBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repoPath: string;
  onBranchCreated: (branchName: string) => void;
}

export function CreateBranchDialog({
  open,
  onOpenChange,
  repoPath,
  onBranchCreated,
}: CreateBranchDialogProps) {
  const [branchName, setBranchName] = useState("");
  const [checkoutAfterCreate, setCheckoutAfterCreate] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!branchName.trim()) return;

    setIsCreating(true);
    setError(null);

    const result = await createBranch(
      repoPath,
      branchName.trim(),
      checkoutAfterCreate,
    );

    if (result.success) {
      onBranchCreated(branchName.trim());
      setBranchName("");
      setCheckoutAfterCreate(true);
      onOpenChange(false);
    } else {
      setError(result.error ?? "Failed to create branch");
    }

    setIsCreating(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setBranchName("");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Branch</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="branch-name">Branch name</Label>
            <Input
              id="branch-name"
              placeholder="feature/my-new-branch"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && branchName.trim()) {
                  void handleCreate();
                }
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="checkout-after-create"
              checked={checkoutAfterCreate}
              onChange={() => setCheckoutAfterCreate(!checkoutAfterCreate)}
            />
            <Label htmlFor="checkout-after-create" className="cursor-pointer">
              Switch to new branch after creating
            </Label>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !branchName.trim()}
          >
            {isCreating ? "Creating..." : "Create Branch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
