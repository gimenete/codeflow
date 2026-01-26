import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useState, useMemo, useCallback } from "react";
import { RefreshCw, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useRepository,
  useGitStatus,
  useBranches,
  gitFetch,
  gitPull,
  gitPush,
  checkoutBranch,
} from "@/lib/git";
import { useBreadcrumbs } from "@/lib/breadcrumbs";
import { CreateBranchDialog } from "@/components/create-branch-dialog";

export const Route = createFileRoute("/git/$repo/$branch")({
  beforeLoad: ({ params, location }) => {
    // Redirect /git/$repo/$branch to /git/$repo/$branch/changes
    const pathWithoutTrailingSlash = location.pathname.replace(/\/$/, "");
    const isExactMatch =
      pathWithoutTrailingSlash === `/git/${params.repo}/${params.branch}`;
    if (isExactMatch) {
      throw redirect({
        to: "/git/$repo/$branch/changes",
        params: { repo: params.repo, branch: params.branch },
      });
    }
  },
  component: BranchLayout,
});

export function useBranchLayoutContext() {
  const { repo, branch } = Route.useParams();
  const repository = useRepository(repo);
  const { status, refresh: refreshStatus } = useGitStatus(repository?.path);

  return { repo, branch, repository, status, refreshStatus };
}

function BranchLayout() {
  const { repo, branch } = Route.useParams();
  const navigate = useNavigate();
  const repository = useRepository(repo);
  const { branches, currentBranch } = useBranches(repository?.path);
  const { status, refresh: refreshStatus } = useGitStatus(repository?.path);

  const [isFetching, setIsFetching] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [createBranchOpen, setCreateBranchOpen] = useState(false);

  const handleFetch = async () => {
    if (!repository?.path) return;
    setIsFetching(true);
    await gitFetch(repository.path);
    await refreshStatus();
    setIsFetching(false);
  };

  const handlePull = async () => {
    if (!repository?.path) return;
    setIsPulling(true);
    await gitPull(repository.path, "origin", branch);
    await refreshStatus();
    setIsPulling(false);
  };

  const handlePush = async () => {
    if (!repository?.path) return;
    setIsPushing(true);
    await gitPush(repository.path, "origin", branch);
    await refreshStatus();
    setIsPushing(false);
  };

  const handleCheckoutBranch = useCallback(
    async (targetBranch: string) => {
      if (!repository?.path || targetBranch === currentBranch) return;
      const result = await checkoutBranch(repository.path, targetBranch);
      if (result.success) {
        void navigate({
          to: "/git/$repo/$branch/changes",
          params: { repo, branch: targetBranch },
        });
      }
    },
    [repository?.path, currentBranch, navigate, repo],
  );

  const handleBranchCreated = useCallback(
    (newBranch: string) => {
      void navigate({
        to: "/git/$repo/$branch/changes",
        params: { repo, branch: newBranch },
      });
    },
    [navigate, repo],
  );

  const breadcrumbs = useMemo(() => {
    if (!repository) return [];
    return [
      {
        label: repository.name,
        href: `/git/${repo}/${branch}/changes`,
        dropdown: {
          items: [
            {
              label: "All Repositories",
              onClick: () => navigate({ to: "/git" }),
            },
          ],
        },
      },
      {
        label: branch,
        href: `/git/${repo}/${branch}/changes`,
        dropdown: {
          items: [
            {
              label: "New Branch...",
              onClick: () => setCreateBranchOpen(true),
            },
            { type: "separator" as const },
            ...branches.map((b) => ({
              label: b === currentBranch ? `${b} (current)` : b,
              onClick: () => handleCheckoutBranch(b),
            })),
          ],
        },
      },
    ];
  }, [
    repository?.name,
    branch,
    branches,
    currentBranch,
    repo,
    handleCheckoutBranch,
    navigate,
  ]);

  useBreadcrumbs(breadcrumbs);

  if (!repository) {
    return (
      <div className="container mx-auto py-6 px-4">
        <p className="text-muted-foreground">Repository not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="border-b px-4 py-2 flex items-center justify-between shrink-0">
        {(status?.ahead !== undefined && status?.ahead > 0) ||
        (status?.behind !== undefined && status?.behind > 0) ? (
          <span className="text-sm text-muted-foreground">
            {status?.ahead !== undefined && status.ahead > 0 && (
              <span className="text-green-600">↑{status.ahead}</span>
            )}
            {status?.behind !== undefined && status.behind > 0 && (
              <span className="text-orange-600 ml-1">↓{status.behind}</span>
            )}
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFetch}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`}
            />
            Fetch
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePull}
            disabled={isPulling}
          >
            <ArrowDown
              className={`h-4 w-4 mr-1 ${isPulling ? "animate-bounce" : ""}`}
            />
            Pull
            {status?.behind !== undefined && status.behind > 0 && (
              <Badge variant="secondary" className="ml-1">
                {status.behind}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePush}
            disabled={isPushing}
          >
            <ArrowUp
              className={`h-4 w-4 mr-1 ${isPushing ? "animate-bounce" : ""}`}
            />
            Push
            {status?.ahead !== undefined && status.ahead > 0 && (
              <Badge variant="secondary" className="ml-1">
                {status.ahead}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <Outlet />

      {repository && (
        <CreateBranchDialog
          open={createBranchOpen}
          onOpenChange={setCreateBranchOpen}
          repoPath={repository.path}
          onBranchCreated={handleBranchCreated}
        />
      )}
    </div>
  );
}
