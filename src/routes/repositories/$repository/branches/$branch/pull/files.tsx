import { createFileRoute } from "@tanstack/react-router";

// This route exists for URL matching (files tab).
// The parent route renders the content.
export const Route = createFileRoute(
  "/repositories/$repository/branches/$branch/pull/files",
)({
  component: () => null,
  validateSearch: (search: Record<string, unknown>) => ({
    commit: (search.commit as string) ?? undefined,
  }),
});
