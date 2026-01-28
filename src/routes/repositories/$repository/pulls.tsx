import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { GitPullRequest } from "lucide-react";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SearchResultItem,
  SearchResultItemSkeleton,
} from "@/components/search-result-item";
import { useRepositoriesStore } from "@/lib/repositories-store";
import { getAccount } from "@/lib/auth";
import { searchIssuesAndPulls } from "@/lib/github";
import type { QueryFilters } from "@/lib/github-types";

const searchSchema = z.object({
  filter: z
    .enum(["open", "created", "review", "all"])
    .optional()
    .default("open"),
});

export const Route = createFileRoute("/repositories/$repository/pulls")({
  validateSearch: searchSchema,
  component: RepositoryPullsPage,
});

function RepositoryPullsPage() {
  const { repository: repositorySlug } = Route.useParams();
  const { filter } = Route.useSearch();
  const repository = useRepositoriesStore((state) =>
    state.getRepositoryBySlug(repositorySlug),
  );

  if (
    !repository ||
    !repository.githubAccountId ||
    !repository.githubOwner ||
    !repository.githubRepo
  ) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <GitPullRequest className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">GitHub not configured</h3>
          <p className="text-sm">
            This repository is not linked to a GitHub repository.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RepositoryPullsList
      repositorySlug={repositorySlug}
      accountId={repository.githubAccountId}
      owner={repository.githubOwner}
      repo={repository.githubRepo}
      filter={filter}
    />
  );
}

function RepositoryPullsList({
  repositorySlug,
  accountId,
  owner,
  repo,
  filter,
}: {
  repositorySlug: string;
  accountId: string;
  owner: string;
  repo: string;
  filter: string;
}) {
  const account = getAccount(accountId);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Build filters based on selected filter
  const filters: QueryFilters = {
    type: "pulls",
    repo: `${owner}/${repo}`,
    state: filter === "all" ? undefined : "open",
    author: filter === "created" ? "@me" : undefined,
    reviewRequested: filter === "review" ? "@me" : undefined,
  };

  const {
    data,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["repository-pulls", accountId, owner, repo, filter],
    queryFn: async ({ pageParam }) => {
      if (!account) throw new Error("Account not found");
      return searchIssuesAndPulls(account, filters, true, pageParam);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNextPage ? lastPageParam + 1 : undefined,
    staleTime: 30000,
    enabled: !!account,
  });

  // Infinite scroll
  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const results = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b">
        <div>
          <h1 className="text-xl font-semibold">Pull Requests</h1>
          <p className="text-sm text-muted-foreground">
            {owner}/{repo}
          </p>
        </div>

        <Select
          value={filter}
          onValueChange={(value) => {
            // Navigate with new filter
            window.history.replaceState(
              {},
              "",
              `/repositories/${repositorySlug}/pulls?filter=${value}`,
            );
            window.location.reload();
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="created">Created by me</SelectItem>
            <SelectItem value="review">Review requested</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <SearchResultItemSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive">
            Error: {error.message}
          </div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <GitPullRequest className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No pull requests found</h3>
            <p className="text-sm">
              {filter === "created" &&
                "You haven't created any pull requests in this repo."}
              {filter === "review" &&
                "No pull requests waiting for your review."}
              {filter === "open" && "No open pull requests in this repository."}
              {filter === "all" && "No pull requests in this repository."}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y">
              {results.map((item) => (
                <Link
                  key={item.id}
                  to="/$account/$search/$owner/$repo/pull/$number"
                  params={{
                    account: accountId,
                    search: "pulls",
                    owner: owner,
                    repo: repo,
                    number: String(item.number),
                  }}
                  className="block"
                >
                  <SearchResultItem
                    item={item}
                    accountId={accountId}
                    searchId="pulls"
                    isPR={true}
                    urlFilters={{}}
                  />
                </Link>
              ))}
            </div>
            <div ref={loadMoreRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="divide-y border-t">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SearchResultItemSkeleton key={`loading-${i}`} />
                ))}
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}
