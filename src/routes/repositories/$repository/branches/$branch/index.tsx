import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/repositories/$repository/branches/$branch/",
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/repositories/$repository/branches/$branch/agent",
      params: { repository: params.repository, branch: params.branch },
    });
  },
});
