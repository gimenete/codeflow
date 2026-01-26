import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getRepository, getCurrentBranch } from "@/lib/git";

export const Route = createFileRoute("/git/$repo")({
  beforeLoad: async ({ params, location }) => {
    const repo = getRepository(params.repo);
    if (!repo) {
      throw redirect({ to: "/git" });
    }

    // Only redirect if navigating directly to /git/$repo (not to child routes)
    // Child routes like /git/$repo/$branch will have a longer pathname
    const isExactMatch = location.pathname === `/git/${params.repo}`;
    if (isExactMatch) {
      const currentBranch = await getCurrentBranch(repo.path);
      throw redirect({
        to: "/git/$repo/$branch/changes",
        params: { repo: params.repo, branch: currentBranch },
      });
    }
  },
  component: () => <Outlet />,
});
