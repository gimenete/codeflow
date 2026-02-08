import { useState, useMemo } from "react";
import {
  AlertCircle,
  ChevronDown,
  GitPullRequest,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitHubCommentTextarea } from "@/components/github-comment-textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAccount } from "@/lib/auth";
import { gitPush } from "@/lib/git";
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
  repositoryPath: string;
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
type CreateMode = "ready" | "draft";

const CREATE_MODE_LABELS: Record<CreateMode, string> = {
  ready: "Create Pull Request",
  draft: "Create Draft Pull Request",
};

const CREATE_MODE_DESCRIPTIONS: Record<CreateMode, string> = {
  ready: "Open a pull request that is ready for review",
  draft: "Cannot be merged until marked ready for review",
};

export function CreatePullRequestForm({
  accountId,
  owner,
  repo,
  branch,
  repositoryPath,
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
  const [createMode, setCreateMode] = useState<CreateMode>("ready");
  const [popoverOpen, setPopoverOpen] = useState(false);
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

  // Set default target branch when repo info loads
  if (repoInfo && !targetBranch) {
    if (repoInfo.isFork && repoInfo.parent) {
      setTargetRepo("parent");
      setTargetBranch(repoInfo.parent.defaultBranch);
    } else {
      setTargetBranch(repoInfo.defaultBranch);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account || !title.trim() || !targetBranch) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // First, push the branch to the remote
      const pushResult = await gitPush(
        repositoryPath,
        "origin",
        branch.branch,
        false,
      );
      if (!pushResult.success) {
        throw new Error(pushResult.error ?? "Failed to push branch to remote");
      }

      // Head always needs to be "owner:branch" format to be explicit about
      // where the branch lives. For same-repo PRs, owner is the repo owner.
      // For fork PRs to parent, owner is the fork owner.
      const head = `${owner}:${branch.branch}`;

      const result = await createPullRequest(account, {
        owner: targetOwner,
        repo: targetRepoName,
        title: title.trim(),
        body: description.trim(),
        head,
        base: targetBranch,
        draft: createMode === "draft",
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
      <div className="w-full p-6 flex flex-col flex-1 min-h-0">
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
                onValueChange={(value: TargetRepo) => {
                  setTargetRepo(value);
                  // Update target branch to match the new target repo's default
                  if (repoInfo) {
                    if (value === "parent" && repoInfo.parent) {
                      setTargetBranch(repoInfo.parent.defaultBranch);
                    } else {
                      setTargetBranch(repoInfo.defaultBranch);
                    }
                  }
                }}
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
            <GitHubCommentTextarea
              id="description"
              value={description}
              onChange={setDescription}
              accountId={accountId}
              owner={owner}
              repo={repo}
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
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <div className="flex items-center">
                <Button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !targetBranch}
                  className="rounded-r-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    CREATE_MODE_LABELS[createMode]
                  )}
                </Button>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    className="rounded-l-none border-l border-l-primary-foreground/20 px-2"
                    disabled={isSubmitting}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
              </div>
              <PopoverContent align="end" className="w-80 space-y-3">
                <RadioGroup
                  value={createMode}
                  onValueChange={(v) => {
                    setCreateMode(v as CreateMode);
                    setPopoverOpen(false);
                  }}
                >
                  {(["ready", "draft"] as const).map((mode) => (
                    <div key={mode} className="flex items-start gap-2">
                      <RadioGroupItem
                        value={mode}
                        id={`create-mode-${mode}`}
                        className="mt-0.5"
                      />
                      <div className="grid gap-0.5">
                        <Label htmlFor={`create-mode-${mode}`}>
                          {CREATE_MODE_LABELS[mode]}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {CREATE_MODE_DESCRIPTIONS[mode]}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </PopoverContent>
            </Popover>
          </div>
        </form>
      </div>
    </div>
  );
}
