import { useState, useMemo, useEffect } from "react";
import { AlertCircle, GitPullRequest, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAccount } from "@/lib/auth";
import {
  useRepositoryInfo,
  useRemoteBranches,
  createPullRequest,
} from "@/lib/github";
import type { TrackedBranch } from "@/lib/github-types";

interface CreatePullRequestFormProps {
  accountId: string;
  owner: string;
  repo: string;
  branch: TrackedBranch;
  onPullRequestCreated: (
    pullNumber: number,
    pullOwner: string,
    pullRepo: string,
  ) => void;
}

// Helper to convert branch name to human-readable title
function humanizeBranchName(branch: string): string {
  // Remove common prefixes
  let name = branch
    .replace(/^(feature|fix|bugfix|hotfix|chore|docs|refactor|test|ci)\//, "")
    .replace(/^(feat|bug|doc)\//, "");

  // Replace separators with spaces
  name = name.replace(/[-_]/g, " ");

  // Capitalize first letter
  name = name.charAt(0).toUpperCase() + name.slice(1);

  return name;
}

type TargetRepo = "current" | "parent";

export function CreatePullRequestForm({
  accountId,
  owner,
  repo,
  branch,
  onPullRequestCreated,
}: CreatePullRequestFormProps) {
  const account = getAccount(accountId);

  // Fetch repository info to detect fork status
  const { data: repoInfo, isLoading: isRepoInfoLoading } = useRepositoryInfo(
    accountId,
    owner,
    repo,
  );

  // Form state
  const [title, setTitle] = useState(() => humanizeBranchName(branch.branch));
  const [description, setDescription] = useState("");
  const [targetRepo, setTargetRepo] = useState<TargetRepo>("current");
  const [targetBranch, setTargetBranch] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine target repo owner/name based on selection
  const targetOwner = useMemo(() => {
    if (targetRepo === "parent" && repoInfo?.parent) {
      return repoInfo.parent.owner;
    }
    return owner;
  }, [targetRepo, repoInfo, owner]);

  const targetRepoName = useMemo(() => {
    if (targetRepo === "parent" && repoInfo?.parent) {
      return repoInfo.parent.name;
    }
    return repo;
  }, [targetRepo, repoInfo, repo]);

  // Fetch branches from target repo
  const { data: remoteBranches, isLoading: isBranchesLoading } =
    useRemoteBranches(accountId, targetOwner, targetRepoName);

  // Set default target branch when repo info or branches load
  useEffect(() => {
    if (repoInfo && !targetBranch) {
      // Default to parent's default branch for forks, otherwise current repo's default
      if (repoInfo.isFork && repoInfo.parent) {
        setTargetRepo("parent");
        setTargetBranch(repoInfo.parent.defaultBranch);
      } else {
        setTargetBranch(repoInfo.defaultBranch);
      }
    }
  }, [repoInfo, targetBranch]);

  // Update target branch when target repo changes
  useEffect(() => {
    if (repoInfo) {
      if (targetRepo === "parent" && repoInfo.parent) {
        setTargetBranch(repoInfo.parent.defaultBranch);
      } else {
        setTargetBranch(repoInfo.defaultBranch);
      }
    }
  }, [targetRepo, repoInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account || !title.trim() || !targetBranch) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // For forks, head needs to be "username:branch"
      // For same repo, head is just "branch"
      const head =
        targetRepo === "parent" ? `${owner}:${branch.branch}` : branch.branch;

      const result = await createPullRequest(account, {
        owner: targetOwner,
        repo: targetRepoName,
        title: title.trim(),
        body: description.trim(),
        head,
        base: targetBranch,
      });

      onPullRequestCreated(result.number, targetOwner, targetRepoName);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create pull request",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRepoInfoLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading repository info...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="max-w-2xl mx-auto w-full p-6 flex flex-col flex-1 min-h-0">
        <div className="mb-6 shrink-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GitPullRequest className="h-5 w-5" />
            Create Pull Request
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Open a pull request from{" "}
            <code className="px-1 py-0.5 bg-muted rounded text-xs">
              {branch.branch}
            </code>
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 gap-4"
        >
          {/* Target Repository (only show for forks) */}
          {repoInfo?.isFork && repoInfo.parent && (
            <div className="space-y-2 shrink-0">
              <Label htmlFor="target-repo">Target Repository</Label>
              <Select
                value={targetRepo}
                onValueChange={(value: TargetRepo) => setTargetRepo(value)}
              >
                <SelectTrigger id="target-repo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">
                    {repoInfo.parent.owner}/{repoInfo.parent.name} (upstream)
                  </SelectItem>
                  <SelectItem value="current">
                    {owner}/{repo} (fork)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Base Branch */}
          <div className="space-y-2 shrink-0">
            <Label htmlFor="target-branch">Base Branch</Label>
            <Select value={targetBranch} onValueChange={setTargetBranch}>
              <SelectTrigger id="target-branch">
                <SelectValue placeholder="Select base branch" />
              </SelectTrigger>
              <SelectContent>
                {isBranchesLoading ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Loading branches...
                  </div>
                ) : (
                  remoteBranches?.map((b) => (
                    <SelectItem key={b.name} value={b.name}>
                      {b.name}
                      {b.protected && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (protected)
                        </span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2 shrink-0">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pull request title"
              required
            />
          </div>

          {/* Description - grows to fill available space */}
          <div className="flex flex-col flex-1 min-h-0 space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your changes..."
              className="flex-1 min-h-[200px] resize-none"
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm shrink-0">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit button */}
          <div className="flex justify-end shrink-0">
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !targetBranch}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Pull Request"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
