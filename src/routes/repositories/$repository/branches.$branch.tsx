import { useEffect } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useRepositoriesStore } from "@/lib/repositories-store";
import { useBranchesStore, useBranchById } from "@/lib/branches-store";
import { BranchChat } from "@/components/repositories/branch-chat";
import { BranchDiffPanel } from "@/components/repositories/branch-diff-panel";

export const Route = createFileRoute(
  "/repositories/$repository/branches/$branch",
)({
  beforeLoad: ({ params }) => {
    const repository = useRepositoriesStore
      .getState()
      .getRepositoryBySlug(params.repository);
    if (!repository) {
      throw redirect({ to: "/", search: { addAccount: false } });
    }

    return { repository };
  },
  component: BranchDetailPage,
});

function BranchDetailPage() {
  const { repository } = Route.useRouteContext();
  const { branch: branchId } = Route.useParams();
  const branch = useBranchById(branchId);
  const navigate = useNavigate();

  // Redirect if branch not found (after hydration)
  useEffect(() => {
    if (branch === null) {
      // Give hydration a moment, then redirect if still not found
      const timeout = setTimeout(() => {
        const currentBranch = useBranchesStore
          .getState()
          .getBranchById(branchId);
        if (!currentBranch || currentBranch.repositoryId !== repository.id) {
          void navigate({
            to: "/repositories/$repository/branches",
            params: { repository: repository.slug },
          });
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [branch, branchId, repository, navigate]);

  if (!branch) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading branch...</div>
      </div>
    );
  }

  const cwd = branch.worktreePath || repository.path;

  return (
    <div className="flex h-full">
      {/* Chat Panel */}
      <div className="flex-1 min-w-0">
        <BranchChat branch={branch} cwd={cwd} />
      </div>

      {/* Diff Panel */}
      <div className="w-80 shrink-0">
        <BranchDiffPanel branch={branch} repositoryPath={cwd} />
      </div>
    </div>
  );
}
