import { BranchChat } from "@/components/repositories/branch-chat";
import { useBranchById } from "@/lib/branches-store";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/repositories/$repository/branches/$branch/agent",
)({
  component: BranchAgentTab,
});

function BranchAgentTab() {
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

  return <BranchChat branch={branch} cwd={cwd} />;
}
