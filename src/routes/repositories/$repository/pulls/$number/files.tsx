import { createFileRoute } from "@tanstack/react-router";

// This route exists for URL matching.
// The parent route renders GitHubPull which handles all content.
export const Route = createFileRoute(
  "/repositories/$repository/pulls/$number/files",
)({
  component: () => null,
});
