import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { useRepositoriesStore } from "@/lib/repositories-store";
import { RepositorySidebar } from "@/components/repositories/repository-sidebar";

export const Route = createFileRoute("/repositories/$repository")({
  beforeLoad: ({ params, location }) => {
    const repository = useRepositoriesStore
      .getState()
      .getRepositoryBySlug(params.repository);
    if (!repository) {
      throw redirect({ to: "/", search: { addAccount: false } });
    }

    // Redirect to branches if navigating directly to /repositories/$repository
    const isExactMatch =
      location.pathname === `/repositories/${params.repository}`;
    if (isExactMatch) {
      throw redirect({
        to: "/repositories/$repository/branches",
        params: { repository: params.repository },
      });
    }

    return { repository };
  },
  component: RepositoryLayout,
});

function RepositoryLayout() {
  const { repository } = Route.useRouteContext();

  return (
    <div className="flex h-full">
      <RepositorySidebar repository={repository} />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
