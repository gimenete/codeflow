import { BranchCommitsView } from "@/components/repositories/branch-commits-view";
import { useBranchById } from "@/lib/branches-store";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/repositories/$repository/branches/$branch/commits",
)({
  component: BranchCommitsTab,
});

function BranchCommitsTab() {
  const { repository } = Route.useRouteContext();
  const { branch: branchId } = Route.useParams();
  const branch = useBranchById(branchId);

  if (!branch) {
    return null;
  }

  const cwd = branch.worktreePath || repository.path;

  if (!cwd) {
    return null;
  }

  return <BranchCommitsView branch={branch} repositoryPath={cwd} />;
}
