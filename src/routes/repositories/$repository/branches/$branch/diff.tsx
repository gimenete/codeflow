import { createFileRoute } from "@tanstack/react-router";

// Content is rendered in the parent layout using Activity for state preservation.
// This route file exists for URL matching and browser history support.
export const Route = createFileRoute(
  "/repositories/$repository/branches/$branch/diff",
)({
  component: () => null,
});
