import { useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { SearchResultItemSkeleton } from "@/components/search-result-item";
import { useRepositoriesStore } from "@/lib/repositories-store";
import { getAccount } from "@/lib/auth";
import { searchIssuesAndPulls } from "@/lib/github";
import type { QueryFilters, Issue } from "@/lib/github-types";
import { GitHubLabel } from "@/components/github-label";
import { IssueStateIcon } from "@/components/issue-state-icon";
import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const navigate = useNavigate();
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
      navigate={navigate}
    />
  );
}

function RepositoryIssuesList({
  repositorySlug,
  accountId,
  owner,
  repo,
  filter,
  navigate,
}: {
  repositorySlug: string;
  accountId: string;
  owner: string;
  repo: string;
  filter: string;
  navigate: ReturnType<typeof useNavigate>;
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
            void navigate({
              to: "/repositories/$repository/issues",
              params: { repository: repositorySlug },
              search: {
                filter: value as "open" | "created" | "assigned" | "all",
              },
              replace: true,
            });
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
                  to="/repositories/$repository/issues/$number"
                  params={{
                    repository: repositorySlug,
                    number: String(item.number),
                  }}
                  className="block"
                >
                  <IssueListItem item={item as Issue} />
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

function IssueListItem({ item }: { item: Issue }) {
  return (
    <div className="px-4 py-2 hover:bg-accent/50 transition-colors">
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-3 gap-y-0.5">
        {/* Icon */}
        <div className="shrink-0">
          <IssueStateIcon state={item.state} size="sm" />
        </div>

        {/* Title */}
        <div className="min-w-0 flex-1">
          <span className="font-medium" title={item.title}>
            {item.title}
          </span>
          <span className="text-muted-foreground ml-1">#{item.number}</span>
        </div>

        {/* Timestamp */}
        <span className="text-xs lg:text-sm text-muted-foreground shrink-0 lg:order-last lg:w-24 lg:text-right">
          <RelativeTime date={item.updatedAt} />
        </span>

        {/* Line break for small screens */}
        <div className="basis-full h-0 lg:hidden" />

        {/* Author */}
        <div className="flex items-center gap-1 ml-6 lg:ml-0 lg:order-2 flex-1 lg:flex-none lg:w-32 text-xs lg:text-sm text-muted-foreground">
          <Avatar className="h-4 w-4 lg:h-5 lg:w-5 shrink-0">
            <AvatarImage src={item.author.avatarUrl} />
            <AvatarFallback>
              {item.author.login.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{item.author.login}</span>
        </div>
      </div>

      {item.labels.length > 0 && (
        <div className="flex items-center gap-1 mt-1 ml-6">
          {item.labels.slice(0, 4).map((label) => (
            <GitHubLabel
              key={label.name}
              name={label.name}
              color={label.color}
            />
          ))}
          {item.labels.length > 4 && (
            <span className="text-xs text-muted-foreground">
              +{item.labels.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
