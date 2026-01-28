import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/repositories/$repository/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/repositories/$repository/branches",
      params: { repository: params.repository },
    });
  },
});
