import { GitHubPull } from "@/components/github-pull";
import { CreatePullRequestForm } from "@/components/repositories/create-pull-request-form";
import { useBranchesStore } from "@/lib/branches-store";
import type { TrackedBranch } from "@/lib/github-types";

interface BranchPullRequestViewProps {
  branch: TrackedBranch;
  accountId: string;
  owner: string;
  repo: string;
  repositoryPath: string;
  basePath: string; // e.g., "/repositories/my-repo/branches/branch-id/pull"
}

export function BranchPullRequestView({
  branch,
  accountId,
  owner,
  repo,
  repositoryPath,
  basePath,
}: BranchPullRequestViewProps) {
  const { associatePullRequest } = useBranchesStore();

  const handlePullRequestCreated = (
    pullNumber: number,
    pullOwner: string,
    pullRepo: string,
  ) => {
    associatePullRequest(branch.id, pullNumber, pullOwner, pullRepo);
  };

  // If branch has an associated PR, show the PR view
  if (branch.pullNumber && branch.pullOwner && branch.pullRepo) {
    return (
      <GitHubPull
        accountId={accountId}
        owner={branch.pullOwner}
        repo={branch.pullRepo}
        number={branch.pullNumber}
        basePath={basePath}
      />
    );
  }

  // Otherwise, show the create PR form
  return (
    <CreatePullRequestForm
      accountId={accountId}
      owner={owner}
      repo={repo}
      branch={branch}
      repositoryPath={repositoryPath}
      onPullRequestCreated={handlePullRequestCreated}
    />
  );
}
