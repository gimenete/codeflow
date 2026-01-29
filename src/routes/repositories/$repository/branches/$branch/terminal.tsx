import { TerminalPanel } from "@/components/terminal/terminal-panel";
import { useBranchById } from "@/lib/branches-store";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/repositories/$repository/branches/$branch/terminal",
)({
  component: BranchTerminalTab,
});

function BranchTerminalTab() {
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

  return <TerminalPanel cwd={cwd} className="h-full w-full" active={true} />;
}
