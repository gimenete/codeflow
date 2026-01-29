import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { usePRCommits } from "@/lib/github";
import { CommitsList } from "@/components/detail-components";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute(
  "/repositories/$repository/pulls/$number/commits",
)({
  component: PullCommitsTab,
});

function PullCommitsTab() {
  const { repository: repositorySlug, number } = Route.useParams();
  const { account, remoteInfo } = Route.useRouteContext();
  const navigate = useNavigate();
  const owner = remoteInfo.owner;
  const repo = remoteInfo.repo;

  const {
    data: commitsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isCommitsLoading,
  } = usePRCommits(account.id, owner, repo, parseInt(number));

  const commits = useMemo(() => {
    if (!commitsData?.pages) return [];
    return commitsData.pages.flatMap((page) => page.items);
  }, [commitsData]);

  const handleCommitClick = (sha: string) => {
    void navigate({
      to: "/repositories/$repository/pulls/$number/files",
      params: { repository: repositorySlug, number },
      search: { commit: sha },
    });
  };

  if (isCommitsLoading) {
    return (
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <CommitsList
      commits={commits}
      hasNextPage={hasNextPage ?? false}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      onCommitClick={handleCommitClick}
    />
  );
}
