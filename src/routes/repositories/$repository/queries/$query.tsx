import { SaveQueryDialog } from "@/components/save-query-dialog";
import { SearchResultItemSkeleton } from "@/components/search-result-item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCombobox } from "@/components/user-combobox";
import { getAccount } from "@/lib/auth";
import {
  buildSearchQuery,
  searchIssuesAndPulls,
  searchWithCursors,
} from "@/lib/github";
import type { Issue, PullRequest, QueryFilters } from "@/lib/github-types";
import { parseRemoteUrl } from "@/lib/remote-url";
import { useRepositoriesStore } from "@/lib/repositories-store";
import {
  isSystemQuery,
  useQueryById,
  useSavedQueriesStore,
} from "@/lib/saved-queries-store";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { Filter } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

const searchSchema = z.object({
  type: z.enum(["pulls", "issues"]).optional(),
  state: z.enum(["open", "closed", "merged", "draft", "all"]).optional(),
  author: z.string().optional(),
  assignee: z.string().optional(),
  reviewRequested: z.string().optional(),
  mentioned: z.string().optional(),
});

type QuerySearchFilters = z.infer<typeof searchSchema>;

function hasAdditionalUrlFilters(urlFilters: QuerySearchFilters): boolean {
  return Object.values(urlFilters).some((v) => v !== undefined && v !== "");
}

export const Route = createFileRoute(
  "/repositories/$repository/queries/$query",
)({
  validateSearch: (search: Record<string, unknown>): QuerySearchFilters => {
    const result = searchSchema.safeParse(search);
    return result.success ? result.data : {};
  },
  beforeLoad: ({ params }) => {
    const repository = useRepositoriesStore
      .getState()
      .getRepositoryBySlug(params.repository);
    if (!repository) {
      throw redirect({ to: "/", search: { addAccount: false } });
    }
    const remoteInfo = parseRemoteUrl(repository.remoteUrl);
    if (!repository.accountId || !remoteInfo) {
      throw redirect({
        to: "/repositories/$repository/branches",
        params: { repository: params.repository },
      });
    }
    const account = getAccount(repository.accountId);
    if (!account) {
      throw redirect({ to: "/", search: { addAccount: false } });
    }
    return { repository, account, remoteInfo };
  },
  component: SavedQueryResults,
});

function SavedQueryResults() {
  const { repository: repositorySlug, query: queryId } = Route.useParams();
  const urlFilters = Route.useSearch();
  const { repository, account, remoteInfo } = Route.useRouteContext();
  const navigate = useNavigate();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const updateQuery = useSavedQueriesStore((state) => state.updateQuery);

  const owner = remoteInfo.owner;
  const repo = remoteInfo.repo;

  // Get saved query by repository ID
  const savedQuery = useQueryById(repository.id, queryId);

  // Combine saved query filters with URL filters
  const filters: QueryFilters = useMemo(() => {
    const base: QueryFilters = {
      ...savedQuery?.filters,
      repo: `${owner}/${repo}`, // Always scope to this repo
    };
    // Override with URL filters
    if (urlFilters.type !== undefined) base.type = urlFilters.type;
    if (urlFilters.state !== undefined) base.state = urlFilters.state;
    if (urlFilters.author !== undefined)
      base.author = urlFilters.author || undefined;
    if (urlFilters.assignee !== undefined)
      base.assignee = urlFilters.assignee || undefined;
    if (urlFilters.reviewRequested !== undefined)
      base.reviewRequested = urlFilters.reviewRequested || undefined;
    if (urlFilters.mentioned !== undefined)
      base.mentioned = urlFilters.mentioned || undefined;
    return base;
  }, [savedQuery?.filters, urlFilters, owner, repo]);

  const isPRSearch = filters.type === "pulls";

  const updateFilter = useCallback(
    <K extends keyof QuerySearchFilters>(
      key: K,
      value: QuerySearchFilters[K],
    ) => {
      const newFilters = { ...urlFilters };
      if (value === undefined || value === "") {
        // If this filter exists in saved search, keep empty string to override
        if (savedQuery?.filters?.[key]) {
          newFilters[key] = "" as QuerySearchFilters[K];
        } else {
          delete newFilters[key];
        }
      } else {
        newFilters[key] = value;
      }
      void navigate({
        to: "/repositories/$repository/queries/$query",
        params: { repository: repositorySlug, query: queryId },
        search: newFilters,
        replace: true,
      });
    },
    [urlFilters, navigate, repositorySlug, queryId, savedQuery?.filters],
  );

  // Main search query
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["repository-query-search", repository.id, queryId, filters],
    queryFn: async ({ pageParam }) => {
      return searchIssuesAndPulls(account, filters, isPRSearch, pageParam);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNextPage ? lastPageParam + 1 : undefined,
    staleTime: 30000,
  });

  // GraphQL search for cursors (for navigation)
  const searchQueryString = useMemo(() => {
    return buildSearchQuery(account, filters, isPRSearch);
  }, [account, filters, isPRSearch]);

  const { data: cursorData } = useInfiniteQuery({
    queryKey: ["repository-query-cursors", repository.id, queryId, filters],
    queryFn: async ({ pageParam }) => {
      return searchWithCursors(account, searchQueryString, 50, pageParam);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? (lastPage.endCursor ?? undefined) : undefined,
    staleTime: 30000,
  });

  // Create a map of cursors by number+repo for quick lookup
  const cursorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!cursorData) return map;
    for (const page of cursorData.pages) {
      for (const item of page.items) {
        const key = `${item.owner}/${item.repo}#${item.number}`;
        map.set(key, item.cursor);
      }
    }
    return map;
  }, [cursorData]);

  // Merge REST results with cursors
  const results = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) =>
      page.items.map((item) => {
        const key = `${item.repository}#${item.number}`;
        return {
          ...item,
          cursor: cursorMap.get(key),
        };
      }),
    ) as ((PullRequest | Issue) & { cursor?: string })[];
  }, [data, cursorMap]);

  // Infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

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

  const handleUpdateCurrent = useCallback(() => {
    if (!savedQuery) return;
    const mergedFilters: QueryFilters = { ...savedQuery.filters };
    // Apply URL filters
    for (const key of Object.keys(urlFilters) as (keyof QuerySearchFilters)[]) {
      const value = urlFilters[key];
      if (value === "") {
        delete mergedFilters[key];
      } else if (value !== undefined) {
        (mergedFilters as Record<string, unknown>)[key] = value;
      }
    }
    updateQuery(repository.id, savedQuery.id, { filters: mergedFilters });
    void navigate({
      to: "/repositories/$repository/queries/$query",
      params: { repository: repositorySlug, query: queryId },
      search: {},
      replace: true,
    });
  }, [
    savedQuery,
    urlFilters,
    updateQuery,
    repository.id,
    navigate,
    repositorySlug,
    queryId,
  ]);

  const hasUrlFilters = hasAdditionalUrlFilters(urlFilters);
  const canUpdateCurrent = savedQuery && !isSystemQuery(queryId);

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="border-b px-4 py-3 bg-background space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">
              {savedQuery?.name ?? queryId}
            </h1>
            {hasUrlFilters && (
              <span className="text-xs text-muted-foreground">(modified)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasUrlFilters && (
              <>
                <button
                  className="text-sm text-primary hover:underline"
                  onClick={() => setShowSaveDialog(true)}
                >
                  Save as new
                </button>
                {canUpdateCurrent && (
                  <button
                    className="text-sm text-primary hover:underline"
                    onClick={handleUpdateCurrent}
                  >
                    Update current
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

          {/* Type filter */}
          <Select
            value={filters.type ?? "pulls"}
            onValueChange={(v) => {
              const newType = v as "pulls" | "issues";
              const newFilters = { ...urlFilters, type: newType };
              // Clear PR-only filters when switching to issues
              if (newType === "issues") {
                delete newFilters.reviewRequested;
                if (
                  newFilters.state === "merged" ||
                  newFilters.state === "draft"
                ) {
                  newFilters.state = "open";
                }
              }
              void navigate({
                to: "/repositories/$repository/queries/$query",
                params: { repository: repositorySlug, query: queryId },
                search: newFilters,
                replace: true,
              });
            }}
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue>
                {filters.type === "issues" ? "Issues" : "Pull Requests"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pulls">Pull Requests</SelectItem>
              <SelectItem value="issues">Issues</SelectItem>
            </SelectContent>
          </Select>

          {/* State filter */}
          <Select
            value={filters.state ?? "open"}
            onValueChange={(v) =>
              updateFilter("state", v as QuerySearchFilters["state"])
            }
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue>
                {filters.state &&
                  `State: ${filters.state.charAt(0).toUpperCase() + filters.state.slice(1)}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              {isPRSearch && <SelectItem value="merged">Merged</SelectItem>}
              {isPRSearch && <SelectItem value="draft">Draft</SelectItem>}
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          {/* Author filter */}
          <UserCombobox
            value={filters.author}
            onChange={(v) => updateFilter("author", v)}
            accountId={account.id}
            placeholder="Author"
            label="Author"
            className="w-40"
          />

          {/* Assignee filter */}
          <UserCombobox
            value={filters.assignee}
            onChange={(v) => updateFilter("assignee", v)}
            accountId={account.id}
            placeholder="Assignee"
            label="Assignee"
            className="w-40"
          />

          {/* Review requested filter (PR only) */}
          {isPRSearch && (
            <UserCombobox
              value={filters.reviewRequested}
              onChange={(v) => updateFilter("reviewRequested", v)}
              accountId={account.id}
              placeholder="Reviewer"
              label="Reviewer"
              className="w-40"
            />
          )}

          {/* Mentioned filter */}
          <UserCombobox
            value={filters.mentioned}
            onChange={(v) => updateFilter("mentioned", v)}
            accountId={account.id}
            placeholder="Mentioned"
            label="Mentioned"
            className="w-40"
          />
        </div>
      </div>

      <SaveQueryDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        repositoryId={repository.id}
        repositorySlug={repositorySlug}
        currentFilters={filters}
      />

      {/* Results */}
      <Scrollable.Vertical>
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
            No results found
          </div>
        ) : (
          <>
            <div className="divide-y">
              {results.map((item) => (
                <RepositorySearchResultItem
                  key={item.id}
                  item={item}
                  repositorySlug={repositorySlug}
                  isPR={isPRSearch}
                />
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
      </Scrollable.Vertical>
    </div>
  );
}

// Custom search result item that links to repository routes
function RepositorySearchResultItem({
  item,
  repositorySlug,
  isPR,
}: {
  item: (PullRequest | Issue) & { cursor?: string };
  repositorySlug: string;
  isPR: boolean;
}) {
  return (
    <Link
      to={
        isPR
          ? "/repositories/$repository/pulls/$number"
          : "/repositories/$repository/issues/$number"
      }
      params={{
        repository: repositorySlug,
        number: String(item.number),
      }}
      className="block"
    >
      <SearchResultItemContent item={item} isPR={isPR} />
    </Link>
  );
}

// Simplified search result content (no Link wrapper since parent provides it)
import { Scrollable } from "@/components/flex-layout";
import { GitHubLabel } from "@/components/github-label";
import { IssueStateIcon } from "@/components/issue-state-icon";
import { PullStateIcon } from "@/components/pull-state-icon";
import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function SearchResultItemContent({
  item,
  isPR,
}: {
  item: PullRequest | Issue;
  isPR: boolean;
}) {
  return (
    <div className="px-4 py-2 hover:bg-accent/50 transition-colors">
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-3 gap-y-0.5">
        {/* Icon */}
        <div className="shrink-0">
          {isPR ? (
            <PullStateIcon
              state={item.state}
              merged={item.state === "merged"}
              isDraft={(item as PullRequest).isDraft}
              size="sm"
            />
          ) : (
            <IssueStateIcon state={item.state} size="sm" />
          )}
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
