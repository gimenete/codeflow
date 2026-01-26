import { Scrollable } from "@/components/flex-layout";
import { RepoCombobox } from "@/components/repo-combobox";
import { SaveQueryDialog } from "@/components/save-query-dialog";
import {
  SearchResultItem,
  SearchResultItemSkeleton,
} from "@/components/search-result-item";
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
  useBreadcrumbs,
  useAccountBreadcrumbDropdown,
  useSavedSearchBreadcrumbDropdown,
  type BreadcrumbDropdownElement,
} from "@/lib/breadcrumbs";
import type { QueryFilters } from "@/lib/github-types";
import { useCombinedFilters, useSearchResults } from "@/lib/queries";
import {
  useSavedQueriesStore,
  useQueryById,
  isSystemQuery,
} from "@/lib/saved-queries-store";
import { searchFiltersSchema, type SearchFilters } from "@/lib/search-params";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Filter } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function hasAdditionalUrlFilters(urlFilters: SearchFilters): boolean {
  return Object.values(urlFilters).some((v) => v !== undefined && v !== "");
}

export const Route = createFileRoute("/$account/$search/")({
  validateSearch: (search: Record<string, unknown>): SearchFilters => {
    const result = searchFiltersSchema.safeParse(search);
    return result.success ? result.data : { state: "open" };
  },
  beforeLoad: ({ params }) => {
    const account = getAccount(params.account);
    if (!account) {
      throw redirect({ to: "/", search: { addAccount: false } });
    }
    const query = useSavedQueriesStore
      .getState()
      .getQueryById(params.account, params.search);
    return { account, query };
  },
  component: SearchResults,
});

function SearchResults() {
  const { account, search } = Route.useParams();
  const urlFilters = Route.useSearch();
  const filters = useCombinedFilters(account, search, urlFilters);
  const { account: accountData } = Route.useRouteContext();
  // Use the reactive hook to get updates when query changes
  const query = useQueryById(account, search);
  const navigate = useNavigate();
  const accountDropdownItems = useAccountBreadcrumbDropdown();
  const savedSearchDropdownItems = useSavedSearchBreadcrumbDropdown(account);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const updateQuery = useSavedQueriesStore((state) => state.updateQuery);

  const updateFilter = useCallback(
    <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
      const newFilters = { ...urlFilters };
      if (value === undefined || value === "") {
        // If this filter exists in saved search, keep empty string to override
        // Otherwise delete it from URL
        if (query?.filters?.[key]) {
          newFilters[key] = "" as SearchFilters[K];
        } else {
          delete newFilters[key];
        }
      } else {
        newFilters[key] = value;
      }
      navigate({
        to: "/$account/$search",
        params: { account, search },
        search: newFilters,
        replace: true,
      });
    },
    [urlFilters, navigate, account, search, query?.filters],
  );

  const {
    results,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useSearchResults(account, search, urlFilters);

  // Infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const isPRSearch = filters.type === "pulls";

  const handleUpdateCurrent = useCallback(() => {
    if (!query) return;
    const mergedFilters: QueryFilters = { ...query.filters, ...urlFilters };
    // Remove empty string values
    for (const key of Object.keys(mergedFilters) as (keyof QueryFilters)[]) {
      if (mergedFilters[key] === "") {
        delete mergedFilters[key];
      }
    }
    updateQuery(account, query.id, { filters: mergedFilters });
    navigate({
      to: "/$account/$search",
      params: { account, search },
      search: {},
      replace: true,
    });
  }, [query, urlFilters, updateQuery, account, search, navigate]);

  const hasUrlFilters = hasAdditionalUrlFilters(urlFilters);
  const canUpdateCurrent = query && !isSystemQuery(search);

  // Build dropdown items with save options prepended when URL filters are present
  const searchDropdownItems = useMemo(() => {
    const items: BreadcrumbDropdownElement[] = [];
    if (hasUrlFilters) {
      items.push({
        label: "Save as new",
        onClick: () => setShowSaveDialog(true),
      });
      if (canUpdateCurrent) {
        items.push({
          label: "Update current",
          onClick: handleUpdateCurrent,
        });
      }
      items.push({ type: "separator" as const });
    }
    items.push(...savedSearchDropdownItems);
    return items;
  }, [
    savedSearchDropdownItems,
    hasUrlFilters,
    canUpdateCurrent,
    handleUpdateCurrent,
  ]);

  const breadcrumbs = useMemo(
    () => [
      {
        label: `@${accountData.login}`,
        href: `/${account}`,
        dropdown: { items: accountDropdownItems },
      },
      {
        label: query?.name ?? search,
        href: `/${account}/${search}`,
        dropdown: { items: searchDropdownItems },
        isModified: hasUrlFilters,
      },
    ],
    [
      accountData.login,
      account,
      accountDropdownItems,
      query?.name,
      search,
      searchDropdownItems,
      hasUrlFilters,
    ],
  );

  useBreadcrumbs(breadcrumbs);

  return (
    <>
      <div className="border-b px-4 py-3 bg-background space-y-2">
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
                // Clear PR-only states
                if (
                  newFilters.state === "merged" ||
                  newFilters.state === "draft"
                ) {
                  newFilters.state = "open";
                }
              }
              navigate({
                to: "/$account/$search",
                params: { account, search },
                search: newFilters,
                replace: true,
              });
            }}
          >
            <SelectTrigger className="w-36 h-8">
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
              updateFilter("state", v as SearchFilters["state"])
            }
          >
            <SelectTrigger className="w-32 h-8">
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
            accountId={account}
            placeholder="Author"
            label="Author"
            className="w-40"
          />

          {/* Assignee filter */}
          <UserCombobox
            value={filters.assignee}
            onChange={(v) => updateFilter("assignee", v)}
            accountId={account}
            placeholder="Assignee"
            label="Assignee"
            className="w-40"
          />

          {/* Review requested filter (PR only) */}
          {isPRSearch && (
            <UserCombobox
              value={filters.reviewRequested}
              onChange={(v) => updateFilter("reviewRequested", v)}
              accountId={account}
              placeholder="Reviewer"
              label="Reviewer"
              className="w-40"
            />
          )}

          {/* Mentioned filter */}
          <UserCombobox
            value={filters.mentioned}
            onChange={(v) => updateFilter("mentioned", v)}
            accountId={account}
            placeholder="Mentioned"
            label="Mentioned"
            className="w-40"
          />

          {/* Repo filter */}
          <RepoCombobox
            value={filters.repo}
            onChange={(v) => updateFilter("repo", v)}
            accountId={account}
          />
        </div>
      </div>

      <SaveQueryDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        accountId={account}
        currentFilters={filters}
      />

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
                <SearchResultItem
                  key={item.id}
                  item={item}
                  accountId={account}
                  searchId={search}
                  isPR={isPRSearch}
                  urlFilters={urlFilters}
                />
              ))}
            </div>
            {/* Infinite scroll sentinel and loading skeletons */}
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
    </>
  );
}
