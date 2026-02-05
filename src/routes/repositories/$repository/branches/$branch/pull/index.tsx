import { createFileRoute } from "@tanstack/react-router";

// This route exists for URL matching (conversation tab).
// The parent route renders the content.
export const Route = createFileRoute(
  "/repositories/$repository/branches/$branch/pull/",
)({
  component: () => null,
});
