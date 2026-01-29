import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/repositories/$repository/branches/$branch/terminal",
)({
  component: BranchTerminalTab,
});

// Terminal is rendered in parent layout for session persistence
function BranchTerminalTab() {
  return null;
}
