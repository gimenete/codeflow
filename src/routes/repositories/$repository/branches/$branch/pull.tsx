import { createFileRoute } from "@tanstack/react-router";

// This route exists for URL matching.
// The parent route (branches.$branch.tsx) renders the content.
export const Route = createFileRoute(
  "/repositories/$repository/branches/$branch/pull",
)({
  component: () => null,
});
