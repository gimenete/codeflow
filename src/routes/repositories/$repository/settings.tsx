import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FolderOpen } from "lucide-react";
import { useRepositoriesStore } from "@/lib/repositories-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scrollable } from "@/components/flex-layout";
import { useAccounts } from "@/lib/auth";
import { buildRemoteUrl, getOwnerRepo } from "@/lib/remote-url";
import { openFolderPicker } from "@/lib/git";
import { RepoCombobox } from "@/components/repo-combobox";

export const Route = createFileRoute("/repositories/$repository/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { repository } = Route.useRouteContext();
  const updateRepository = useRepositoriesStore(
    (state) => state.updateRepository,
  );
  const { accounts } = useAccounts();

  const [accountId, setAccountId] = useState<string | null>(
    repository.accountId,
  );
  const [selectedRepo, setSelectedRepo] = useState<string | undefined>(
    getOwnerRepo(repository.remoteUrl) ?? undefined,
  );
  const [path, setPath] = useState(repository.path ?? "");
  const [worktreesDirectory, setWorktreesDirectory] = useState(
    repository.worktreesDirectory ?? "",
  );
  const [branchPrefix, setBranchPrefix] = useState(
    repository.branchPrefix ?? "",
  );
  const [username, setUsername] = useState("");

  useEffect(() => {
    async function fetchUsername() {
      if (window.appAPI?.getUsername) {
        try {
          const name = await window.appAPI.getUsername();
          setUsername(name);
        } catch {
          // Ignore errors
        }
      }
    }
    void fetchUsername();
  }, []);

  const save = (
    updates: Partial<{
      remoteUrl: string | null;
      accountId: string | null;
      path: string | null;
      worktreesDirectory: string | null;
      branchPrefix: string | null;
    }>,
  ) => {
    updateRepository(repository.id, updates);
  };

  const handleAccountChange = (value: string) => {
    const newAccountId = value === "none" ? null : value;
    setAccountId(newAccountId);
    setSelectedRepo(undefined);
    save({ accountId: newAccountId, remoteUrl: null });
  };

  const handleRepoChange = (value: string | undefined) => {
    setSelectedRepo(value);
    if (value && accountId) {
      const account = accounts.find((a) => a.id === accountId);
      if (account) {
        const [owner, repo] = value.split("/");
        const remoteUrl = buildRemoteUrl(account.host, owner, repo);
        save({ remoteUrl });
      }
    } else {
      save({ remoteUrl: null });
    }
  };

  const handleBrowsePath = async () => {
    const selectedPath = await openFolderPicker();
    if (selectedPath) {
      setPath(selectedPath);
      save({ path: selectedPath });
    }
  };

  const handleBrowseWorktrees = async () => {
    const selectedPath = await openFolderPicker();
    if (selectedPath) {
      setWorktreesDirectory(selectedPath);
      save({ worktreesDirectory: selectedPath });
    }
  };

  return (
    <Scrollable.Vertical>
      <div className="max-w-2xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure repository settings.
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="account">GitHub Account</Label>
            <Select
              value={accountId ?? "none"}
              onValueChange={handleAccountChange}
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
              Link an account for GitHub API integration.
            </p>
          </div>

          {accountId && (
            <div className="space-y-2">
              <Label>GitHub Repository</Label>
              <RepoCombobox
                accountId={accountId}
                value={selectedRepo}
                onChange={handleRepoChange}
                placeholder="Search repositories..."
                showClearOption={true}
              />
              <p className="text-xs text-muted-foreground">
                The remote repository used for GitHub API integration.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="path">Local Repository Path</Label>
            <div className="flex gap-2">
              <Input
                id="path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                onBlur={() => save({ path: path || null })}
                placeholder="/path/to/repository"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleBrowsePath}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The local file system path to the git repository.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="worktreesDirectory">Worktrees Directory</Label>
            <div className="flex gap-2">
              <Input
                id="worktreesDirectory"
                value={worktreesDirectory}
                onChange={(e) => setWorktreesDirectory(e.target.value)}
                onBlur={() =>
                  save({
                    worktreesDirectory: worktreesDirectory || null,
                  })
                }
                placeholder="/path/to/worktrees"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleBrowseWorktrees}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Optional directory where git worktrees will be created for new
              branches.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchPrefix">Branch Prefix</Label>
            <Input
              id="branchPrefix"
              value={branchPrefix}
              onChange={(e) => setBranchPrefix(e.target.value)}
              onBlur={() => save({ branchPrefix: branchPrefix || null })}
              placeholder={username ? `${username}-` : "feature/"}
            />
            <p className="text-xs text-muted-foreground">
              Optional prefix pre-filled when creating new branches.
            </p>
          </div>
        </div>
      </div>
    </Scrollable.Vertical>
  );
}
