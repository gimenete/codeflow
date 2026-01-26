import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/git/$repo/$branch/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/git/$repo/$branch/changes",
      params: { repo: params.repo, branch: params.branch },
    });
  },
});
