import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CircleDot } from "lucide-react";
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
    .enum(["open", "created", "assigned", "all"])
    .optional()
    .default("open"),
});

export const Route = createFileRoute("/repositories/$repository/issues")({
  validateSearch: searchSchema,
  component: RepositoryIssuesPage,
});

function RepositoryIssuesPage() {
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
          <CircleDot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">GitHub not configured</h3>
          <p className="text-sm">
            This repository is not linked to a GitHub repository.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RepositoryIssuesList
      repositorySlug={repositorySlug}
      accountId={repository.githubAccountId}
      owner={repository.githubOwner}
      repo={repository.githubRepo}
      filter={filter}
    />
  );
}

function RepositoryIssuesList({
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
    type: "issues",
    repo: `${owner}/${repo}`,
    state: filter === "all" ? undefined : "open",
    author: filter === "created" ? "@me" : undefined,
    assignee: filter === "assigned" ? "@me" : undefined,
  };

  const {
    data,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["repository-issues", accountId, owner, repo, filter],
    queryFn: async ({ pageParam }) => {
      if (!account) throw new Error("Account not found");
      return searchIssuesAndPulls(account, filters, false, pageParam);
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
          <h1 className="text-xl font-semibold">Issues</h1>
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
              `/repositories/${repositorySlug}/issues?filter=${value}`,
            );
            window.location.reload();
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="created">Created by me</SelectItem>
            <SelectItem value="assigned">Assigned to me</SelectItem>
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
            <CircleDot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No issues found</h3>
            <p className="text-sm">
              {filter === "created" &&
                "You haven't created any issues in this repo."}
              {filter === "assigned" && "No issues assigned to you."}
              {filter === "open" && "No open issues in this repository."}
              {filter === "all" && "No issues in this repository."}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y">
              {results.map((item) => (
                <Link
                  key={item.id}
                  to="/$account/$search/$owner/$repo/issues/$number"
                  params={{
                    account: accountId,
                    search: "issues",
                    owner: owner,
                    repo: repo,
                    number: String(item.number),
                  }}
                  className="block"
                >
                  <SearchResultItem
                    item={item}
                    accountId={accountId}
                    searchId="issues"
                    isPR={false}
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
