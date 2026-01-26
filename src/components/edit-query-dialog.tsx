import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSavedQueriesStore } from "@/lib/saved-queries-store";
import { iconOptions } from "@/lib/query-icons";
import type { SavedQuery } from "@/lib/github-types";

interface EditQueryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  query: SavedQuery;
}

export function EditQueryDialog({
  open,
  onOpenChange,
  accountId,
  query,
}: EditQueryDialogProps) {
  const updateQuery = useSavedQueriesStore((state) => state.updateQuery);

  const [name, setName] = useState(query.name);
  const [icon, setIcon] = useState(query.icon);

  useEffect(() => {
    if (open) {
      setName(query.name);
      setIcon(query.icon);
    }
  }, [open, query.name, query.icon]);

  const handleSave = () => {
    if (!name.trim()) return;

    updateQuery(accountId, query.id, {
      name: name.trim(),
      icon,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Query</DialogTitle>
          <DialogDescription>
            Update the name and icon for this saved query.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="query-name">Name</Label>
            <Input
              id="query-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My saved query"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-8 gap-2">
              {iconOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setIcon(option.id)}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md border transition-colors",
                      icon === option.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon size={20} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
