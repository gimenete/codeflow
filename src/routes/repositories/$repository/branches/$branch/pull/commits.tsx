import { createFileRoute } from "@tanstack/react-router";

// This route exists for URL matching (commits tab).
// The parent route renders the content.
export const Route = createFileRoute(
  "/repositories/$repository/branches/$branch/pull/commits",
)({
  component: () => null,
});
