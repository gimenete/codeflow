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
import { openFolderPicker, parseRemoteUrl as parseGitRemote } from "@/lib/git";
import { isElectron } from "@/lib/platform";
import { useRepositoriesStore } from "@/lib/repositories-store";
import { useAccounts } from "@/lib/auth";
import { buildRemoteUrl, isGitHubUrl } from "@/lib/remote-url";

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
  const [accountId, setAccountId] = useState<string | null>(null);
  const [detectedRemote, setDetectedRemote] = useState<{
    owner: string | null;
    repo: string | null;
    host: string | null;
  }>({ owner: null, repo: null, host: null });
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRepository = useRepositoriesStore((state) => state.addRepository);
  const { accounts } = useAccounts();
  const navigate = useNavigate();

  // Detect remote URL when path changes
  useEffect(() => {
    if (!path) {
      setDetectedRemote({ owner: null, repo: null, host: null });
      return;
    }

    async function detectRemote() {
      setIsDetecting(true);
      try {
        const result = await parseGitRemote(path);
        setDetectedRemote(result);

        // Auto-select matching account
        if (result.host && result.owner) {
          const matchingAccount = accounts.find(
            (a) => a.host === result.host || a.host === `${result.host}`,
          );
          if (matchingAccount) {
            setAccountId(matchingAccount.id);
          }
        }
      } catch {
        setDetectedRemote({ owner: null, repo: null, host: null });
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
      setError("Please enter a repository name");
      return;
    }

    setIsLoading(true);

    try {
      // Build remote URL from detected remote info
      let remoteUrl: string | null = null;
      if (detectedRemote.host && detectedRemote.owner && detectedRemote.repo) {
        remoteUrl = buildRemoteUrl(
          detectedRemote.host,
          detectedRemote.owner,
          detectedRemote.repo,
        );
      }

      // Determine issue tracker based on remote URL
      const issueTracker = isGitHubUrl(remoteUrl) ? "github" : null;

      const repository = addRepository({
        name: name.trim(),
        path: path.trim() || null,
        accountId,
        remoteUrl,
        agent: "claude",
        issueTracker,
      });

      setPath("");
      setName("");
      setAccountId(null);
      setDetectedRemote({ owner: null, repo: null, host: null });
      onOpenChange(false);

      void navigate({
        to: "/repositories/$repository",
        params: { repository: repository.slug },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add repository");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPath("");
      setName("");
      setAccountId(null);
      setDetectedRemote({ owner: null, repo: null, host: null });
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
          <DialogTitle>Add Repository</DialogTitle>
          <DialogDescription>
            Add a local git repository to track branches and work with Claude.
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
                  Detecting remote...
                </p>
              )}
              {detectedRemote.owner && detectedRemote.repo && (
                <p className="text-xs text-muted-foreground">
                  Detected: {detectedRemote.owner}/{detectedRemote.repo}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Repository Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Repository"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Account (optional)</Label>
              <Select
                value={accountId ?? "none"}
                onValueChange={(value) =>
                  setAccountId(value === "none" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an account" />
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
                Link an account to view issues and pull requests.
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
              Add Repository
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
