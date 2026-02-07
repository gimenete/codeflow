import { createFileRoute } from "@tanstack/react-router";

// This route exists for URL matching.
// The parent route renders GitHubPull which handles all content.
export const Route = createFileRoute(
  "/repositories/$repository/pulls/$number/files",
)({
  component: () => null,
  validateSearch: (search: Record<string, unknown>) => ({
    commit: (search.commit as string) ?? undefined,
  }),
});
