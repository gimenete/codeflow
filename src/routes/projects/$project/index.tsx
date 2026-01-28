import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$project/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/projects/$project/tasks",
      params: { project: params.project },
    });
  },
});
