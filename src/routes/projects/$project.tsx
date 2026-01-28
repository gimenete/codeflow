import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { useProjectsStore } from "@/lib/projects-store";
import { ProjectSidebar } from "@/components/projects/project-sidebar";

export const Route = createFileRoute("/projects/$project")({
  beforeLoad: ({ params, location }) => {
    const project = useProjectsStore
      .getState()
      .getProjectBySlug(params.project);
    if (!project) {
      throw redirect({ to: "/", search: { addAccount: false } });
    }

    // Redirect to tasks if navigating directly to /projects/$project
    const isExactMatch = location.pathname === `/projects/${params.project}`;
    if (isExactMatch) {
      throw redirect({
        to: "/projects/$project/tasks",
        params: { project: params.project },
      });
    }

    return { project };
  },
  component: ProjectLayout,
});

function ProjectLayout() {
  const { project } = Route.useRouteContext();

  return (
    <div className="flex h-full">
      <ProjectSidebar project={project} />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
