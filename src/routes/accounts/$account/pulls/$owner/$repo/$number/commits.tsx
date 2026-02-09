import { createFileRoute } from "@tanstack/react-router";

// This route exists for URL matching.
// The parent route renders GitHubPull which handles all content.
export const Route = createFileRoute(
  "/accounts/$account/pulls/$owner/$repo/$number/commits",
)({
  component: () => null,
});
