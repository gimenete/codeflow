import { BranchCodeView } from "@/components/repositories/branch-code-view";
import { useBranchById } from "@/lib/branches-store";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/repositories/$repository/branches/$branch/code",
)({
  component: BranchCodeTab,
});

function BranchCodeTab() {
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

  return <BranchCodeView branch={branch} repositoryPath={cwd} />;
}
