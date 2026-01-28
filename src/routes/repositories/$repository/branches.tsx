import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/repositories/$repository/branches")({
  component: BranchesLayout,
});

function BranchesLayout() {
  return <Outlet />;
}
