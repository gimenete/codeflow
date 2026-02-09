import { Scrollable } from "@/components/flex-layout";
import { SaveQueryDialog } from "@/components/save-query-dialog";
import {
  SearchResultItemContent,
  SearchResultItemSkeleton,
} from "@/components/search-result-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

const searchSchema = z.object({
  state: z.enum(["open", "closed", "merged", "draft", "all"]).optional(),
  author: z.string().optional(),
  assignee: z.string().optional(),
  reviewRequested: z.string().optional(),
  teamReviewRequested: z.string().optional(),
  mentioned: z.string().optional(),
  q: z.string().optional(),
});

type QuerySearchFilters = z.infer<typeof searchSchema>;

function hasAdditionalUrlFilters(urlFilters: QuerySearchFilters): boolean {
  return Object.values(urlFilters).some(
    (v) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0),
  );
}

export const Route = createFileRoute("/accounts/$account/queries/$query")({
  validateSearch: (search: Record<string, unknown>): QuerySearchFilters => {
    const result = searchSchema.safeParse(search);
    return result.success ? result.data : {};
  },
  beforeLoad: ({ params }) => {
    const account = getAccount(params.account);
    if (!account) {
      throw redirect({ to: "/", search: { addAccount: false } });
    }
    return { account };
  },
  component: AccountQueryResults,
});

function AccountQueryResults() {
  const { account: accountSlug, query: queryId } = Route.useParams();
  const urlFilters = Route.useSearch();
  const { account } = Route.useRouteContext();
  const navigate = useNavigate();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const updateQuery = useSavedQueriesStore((state) => state.updateQuery);

  const repositoryId = `account:${account.id}`;

  // Get saved query by account key
  const savedQuery = useQueryById(repositoryId, queryId);

  // Combine saved query filters with URL filters — no repo filter for account-level
  const filters: QueryFilters = useMemo(() => {
    const base: QueryFilters = {
      ...savedQuery?.filters,
    };
    // Override with URL filters
    if (urlFilters.state !== undefined) base.state = urlFilters.state;
    if (urlFilters.author !== undefined)
      base.author = urlFilters.author || undefined;
    if (urlFilters.assignee !== undefined)
      base.assignee = urlFilters.assignee || undefined;
    if (urlFilters.reviewRequested !== undefined)
      base.reviewRequested = urlFilters.reviewRequested || undefined;
    if (urlFilters.teamReviewRequested !== undefined)
      base.teamReviewRequested = urlFilters.teamReviewRequested || undefined;
    if (urlFilters.mentioned !== undefined)
      base.mentioned = urlFilters.mentioned || undefined;
    if (urlFilters.q !== undefined) base.rawQuery = urlFilters.q || undefined;
    return base;
  }, [savedQuery?.filters, urlFilters]);

  const isPRSearch = filters.type === "pulls";

  const updateFilter = useCallback(
    <K extends keyof QuerySearchFilters>(
      key: K,
      value: QuerySearchFilters[K],
    ) => {
      const newFilters = { ...urlFilters };
      if (value === undefined || value === "") {
        if (savedQuery?.filters?.[key]) {
          newFilters[key] = "" as QuerySearchFilters[K];
        } else {
          delete newFilters[key];
        }
      } else {
        newFilters[key] = value;
      }
      void navigate({
        to: "/accounts/$account/queries/$query",
        params: { account: accountSlug, query: queryId },
        search: newFilters,
        replace: true,
      });
    },
    [urlFilters, navigate, accountSlug, queryId, savedQuery?.filters],
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
    queryKey: ["account-query-search", account.id, queryId, filters],
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
    queryKey: ["account-query-cursors", account.id, queryId, filters],
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
    for (const key of Object.keys(urlFilters) as (keyof QuerySearchFilters)[]) {
      if (key === "q") {
        if (urlFilters.q) {
          mergedFilters.rawQuery = urlFilters.q;
        } else {
          delete mergedFilters.rawQuery;
        }
        continue;
      }
      const value = urlFilters[key];
      if (value === "") {
        delete mergedFilters[key];
      } else if (value !== undefined) {
        (mergedFilters as Record<string, unknown>)[key] = value;
      }
    }
    updateQuery(repositoryId, savedQuery.id, { filters: mergedFilters });
    void navigate({
      to: "/accounts/$account/queries/$query",
      params: { account: accountSlug, query: queryId },
      search: {},
      replace: true,
    });
  }, [
    savedQuery,
    urlFilters,
    updateQuery,
    repositoryId,
    navigate,
    accountSlug,
    queryId,
  ]);

  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [rawQueryInput, setRawQueryInput] = useState(urlFilters.q ?? "");
  const rawQueryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRawQueryChange = useCallback(
    (value: string) => {
      setRawQueryInput(value);
      if (rawQueryTimerRef.current) clearTimeout(rawQueryTimerRef.current);
      rawQueryTimerRef.current = setTimeout(() => {
        const newFilters = { ...urlFilters };
        if (value) {
          newFilters.q = value;
        } else {
          delete newFilters.q;
        }
        void navigate({
          to: "/accounts/$account/queries/$query",
          params: { account: accountSlug, query: queryId },
          search: newFilters,
          replace: true,
        });
      }, 500);
    },
    [urlFilters, navigate, accountSlug, queryId],
  );

  // Keep local input in sync when URL changes externally
  const [prevUrlQ, setPrevUrlQ] = useState(urlFilters.q);
  if (urlFilters.q !== prevUrlQ) {
    setPrevUrlQ(urlFilters.q);
    setRawQueryInput(urlFilters.q ?? "");
  }

  const hasUrlFilters = hasAdditionalUrlFilters(urlFilters);
  const canUpdateCurrent = savedQuery && !isSystemQuery(queryId);

  const hasExpandedFilters = !!urlFilters.q;

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
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => setFiltersExpanded((prev) => !prev)}
            aria-label={filtersExpanded ? "Collapse filters" : "Expand filters"}
          >
            {filtersExpanded || hasExpandedFilters ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

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

        {/* Expandable filters row */}
        {(filtersExpanded || hasExpandedFilters) && (
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              value={rawQueryInput}
              onChange={(e) => handleRawQueryChange(e.target.value)}
              placeholder="Additional query (e.g. language:go linked:pr)"
              className="h-8 flex-1 min-w-48 text-sm"
            />
          </div>
        )}
      </div>

      <SaveQueryDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        repositoryId={repositoryId}
        accountSlug={accountSlug}
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
              {results.map((item) => {
                const [owner, repo] = item.repository.split("/");
                return (
                  <AccountSearchResultItem
                    key={item.id}
                    item={item}
                    accountSlug={accountSlug}
                    isPR={isPRSearch}
                    accountId={account.id}
                    owner={owner}
                    repo={repo}
                  />
                );
              })}
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

function AccountSearchResultItem({
  item,
  accountSlug,
  isPR,
  accountId,
  owner,
  repo,
}: {
  item: (PullRequest | Issue) & { cursor?: string };
  accountSlug: string;
  isPR: boolean;
  accountId: string;
  owner: string;
  repo: string;
}) {
  return (
    <Link
      to={
        isPR
          ? "/accounts/$account/pulls/$owner/$repo/$number"
          : "/accounts/$account/issues/$owner/$repo/$number"
      }
      params={{
        account: accountSlug,
        owner,
        repo,
        number: String(item.number),
      }}
      className="block"
    >
      <SearchResultItemContent
        item={item}
        isPR={isPR}
        accountId={accountId}
        owner={owner}
        repo={repo}
        isUnread={false}
        showRepository
      />
    </Link>
  );
}
