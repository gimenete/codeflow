import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSavedQueriesStore } from "@/lib/saved-queries-store";
import type { SavedQuery } from "@/lib/github-types";

interface DeleteQueryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  query: SavedQuery;
}

export function DeleteQueryDialog({
  open,
  onOpenChange,
  accountId,
  query,
}: DeleteQueryDialogProps) {
  const deleteQuery = useSavedQueriesStore((state) => state.deleteQuery);

  const handleDelete = () => {
    deleteQuery(accountId, query.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Query</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{query.name}"? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
