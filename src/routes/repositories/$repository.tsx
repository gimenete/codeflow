import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import {
  useRepositoriesStore,
  useRepositoryBySlug,
} from "@/lib/repositories-store";
import { RepositorySidebar } from "@/components/repositories/repository-sidebar";
import { Scrollable } from "@/components/flex-layout";

export const Route = createFileRoute("/repositories/$repository")({
  beforeLoad: ({ params }) => {
    const repository = useRepositoriesStore
      .getState()
      .getRepositoryBySlug(params.repository);
    if (!repository) {
      throw redirect({ to: "/", search: { addAccount: false } });
    }

    return { repository };
  },
  component: RepositoryLayout,
});

function RepositoryLayout() {
  const { repository: contextRepository } = Route.useRouteContext();
  const repository = useRepositoryBySlug(contextRepository.slug);

  if (!repository) {
    return null;
  }

  return (
    <Scrollable.Layout direction="horizontal">
      <RepositorySidebar repository={repository} />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </Scrollable.Layout>
  );
}
