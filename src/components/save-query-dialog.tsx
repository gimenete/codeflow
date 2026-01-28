import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import type { QueryFilters } from "@/lib/github-types";

interface SaveQueryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositoryId: string;
  repositorySlug?: string;
  currentFilters: QueryFilters;
}

export function SaveQueryDialog({
  open,
  onOpenChange,
  repositoryId,
  repositorySlug,
  currentFilters,
}: SaveQueryDialogProps) {
  const navigate = useNavigate();
  const addQuery = useSavedQueriesStore((state) => state.addQuery);
  const isPR = currentFilters.type === "pulls";

  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(
    isPR ? "git-pull-request" : "issue-opened",
  );

  const handleSave = () => {
    if (!name.trim()) return;

    // Clean up empty filter values
    const cleanFilters: QueryFilters = {};
    for (const [key, value] of Object.entries(currentFilters)) {
      if (value !== undefined && value !== "") {
        cleanFilters[key as keyof QueryFilters] = value as never;
      }
    }

    const newQuery = addQuery(repositoryId, {
      name: name.trim(),
      icon,
      filters: cleanFilters,
    });

    // Reset form state
    setName("");
    setIcon(isPR ? "git-pull-request" : "issue-opened");

    // Close dialog
    onOpenChange(false);

    // Navigate to the new query if we have the slug
    if (repositorySlug) {
      void navigate({
        to: "/repositories/$repository/queries/$query",
        params: { repository: repositorySlug, query: newQuery.id },
        search: {},
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form state when closing
      setName("");
      setIcon(isPR ? "git-pull-request" : "issue-opened");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Query</DialogTitle>
          <DialogDescription>
            Save the current filters as a new saved query.
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
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
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
