import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$project/tasks")({
  component: TasksLayout,
});

function TasksLayout() {
  return <Outlet />;
}
