import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { openFolderPicker, parseRemoteUrl } from "@/lib/git";
import { isElectron } from "@/lib/platform";
import { useProjectsStore } from "@/lib/projects-store";
import { useAccounts } from "@/lib/auth";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [githubAccountId, setGithubAccountId] = useState<string | null>(null);
  const [detectedGithub, setDetectedGithub] = useState<{
    owner: string | null;
    repo: string | null;
    host: string | null;
  }>({ owner: null, repo: null, host: null });
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addProject = useProjectsStore((state) => state.addProject);
  const { accounts } = useAccounts();
  const navigate = useNavigate();

  // Detect GitHub remote when path changes
  useEffect(() => {
    if (!path) {
      setDetectedGithub({ owner: null, repo: null, host: null });
      return;
    }

    async function detectRemote() {
      setIsDetecting(true);
      try {
        const result = await parseRemoteUrl(path);
        setDetectedGithub(result);

        // Auto-select matching GitHub account
        if (result.host && result.owner) {
          const matchingAccount = accounts.find(
            (a) => a.host === result.host || a.host === `${result.host}`,
          );
          if (matchingAccount) {
            setGithubAccountId(matchingAccount.id);
          }
        }
      } catch {
        setDetectedGithub({ owner: null, repo: null, host: null });
      } finally {
        setIsDetecting(false);
      }
    }

    void detectRemote();
  }, [path, accounts]);

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

    if (!name.trim()) {
      setError("Please enter a project name");
      return;
    }

    setIsLoading(true);

    try {
      const project = addProject({
        name: name.trim(),
        path: path.trim(),
        githubAccountId,
        githubOwner: detectedGithub.owner,
        githubRepo: detectedGithub.repo,
      });

      setPath("");
      setName("");
      setGithubAccountId(null);
      setDetectedGithub({ owner: null, repo: null, host: null });
      onOpenChange(false);

      void navigate({
        to: "/projects/$project",
        params: { project: project.slug },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPath("");
      setName("");
      setGithubAccountId(null);
      setDetectedGithub({ owner: null, repo: null, host: null });
      setError(null);
    }
    onOpenChange(newOpen);
  };

  if (!isElectron()) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new project from a local git repository.
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
              {isDetecting && (
                <p className="text-xs text-muted-foreground">
                  Detecting GitHub remote...
                </p>
              )}
              {detectedGithub.owner && detectedGithub.repo && (
                <p className="text-xs text-muted-foreground">
                  Detected: {detectedGithub.owner}/{detectedGithub.repo}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Project"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">GitHub Account (optional)</Label>
              <Select
                value={githubAccountId ?? "none"}
                onValueChange={(value) =>
                  setGithubAccountId(value === "none" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a GitHub account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No account</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      @{account.login} ({account.host})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link a GitHub account to view issues and pull requests.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!path.trim() || !name.trim() || isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
