import { BranchFilesView } from "@/components/repositories/branch-files-view";
import { useBranchById } from "@/lib/branches-store";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/repositories/$repository/branches/$branch/diff",
)({
  component: BranchDiffTab,
});

function BranchDiffTab() {
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

  return <BranchFilesView branch={branch} repositoryPath={cwd} />;
}
