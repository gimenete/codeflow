import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FolderOpen, Loader2 } from "lucide-react";
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
import { useAddRepository, openFolderPicker } from "@/lib/git";
import { isTauri } from "@/lib/platform";

interface AddRepositoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddRepositoryDialog({
  open,
  onOpenChange,
}: AddRepositoryDialogProps) {
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addRepository } = useAddRepository();
  const navigate = useNavigate();

  const handleBrowse = async () => {
    const selectedPath = await openFolderPicker();
    if (selectedPath) {
      setPath(selectedPath);
      if (!name) {
        setName(selectedPath.split("/").pop() ?? "");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!path.trim()) {
      setError("Please select a repository path");
      return;
    }

    setIsLoading(true);

    try {
      const repo = await addRepository(path, name || undefined);
      setPath("");
      setName("");
      onOpenChange(false);
      navigate({ to: "/git/$repo", params: { repo: repo.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add repository");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isTauri()) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Local Repository</DialogTitle>
          <DialogDescription>
            Select a git repository from your filesystem.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="path">Repository Path</Label>
              <div className="flex gap-2">
                <Input
                  id="path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/path/to/repository"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleBrowse}>
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name (optional)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Project"
              />
              <p className="text-xs text-muted-foreground">
                If not specified, the folder name will be used.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!path.trim() || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Repository
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
