import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { QueryFilters, PullRequest, Issue } from "./github-types";
import {
  getQueryCount,
  searchIssuesAndPulls,
  searchGitHubUsers,
  searchGitHubRepos,
  buildSearchQuery,
  searchWithCursors,
  searchAdjacentItems,
} from "./github";
import { getAccount } from "./auth";
import { useQueryById, getQueryById } from "./saved-queries-store";

export { getQueryById };

/**
 * Combines filters from a saved search with URL query string filters.
 * URL filters override saved search filters (even when set to empty string).
 */
export function useCombinedFilters(
  accountId: string,
  queryId: string,
  additionalFilters?: Partial<QueryFilters>,
): QueryFilters {
  const query = useQueryById(accountId, queryId);
  return useMemo(() => {
    const base = { ...query?.filters };
    if (additionalFilters) {
      // Explicit keys in additionalFilters override base (even if undefined/empty)
      for (const key of Object.keys(
        additionalFilters,
      ) as (keyof QueryFilters)[]) {
        base[key] = additionalFilters[key] as never;
      }
    }
    return base;
  }, [query?.filters, additionalFilters]);
}

export function useQueryCount(accountId: string, queryId: string) {
  const query = getQueryById(accountId, queryId);
  const account = getAccount(accountId);

  const { data, isLoading } = useQuery({
    queryKey: ["github-count", accountId, queryId],
    queryFn: async () => {
      if (!account || !query) return 0;
      return getQueryCount(account, query);
    },
    staleTime: 60000,
    enabled: !!account && !!query,
  });

  return { count: data ?? 0, isLoading };
}

export interface SearchResultWithCursorItem extends PullRequest {
  cursor?: string;
}

export interface IssueWithCursor extends Issue {
  cursor?: string;
}

export function useSearchResults(
  accountId: string,
  queryId: string,
  additionalFilters?: Partial<QueryFilters>,
) {
  const accountData = getAccount(accountId);
  const filters = useCombinedFilters(accountId, queryId, additionalFilters);
  const isPR = filters.type === "pulls";

  // Main REST search for rich data
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["github-search", accountId, queryId, filters],
    queryFn: async ({ pageParam }) => {
      if (!accountData) throw new Error("Account not found");
      return searchIssuesAndPulls(accountData, filters, isPR, pageParam);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNextPage ? lastPageParam + 1 : undefined,
    staleTime: 30000,
    enabled: !!accountData,
  });

  // Build the search query string for cursor fetching
  const searchQueryString = useMemo(() => {
    if (!accountData) return null;
    return buildSearchQuery(accountData, filters, isPR);
  }, [accountData, filters, isPR]);

  // Parallel GraphQL search for cursors
  const { data: cursorData } = useInfiniteQuery({
    queryKey: ["github-search-cursors", accountId, queryId, filters],
    queryFn: async ({ pageParam }) => {
      if (!accountData || !searchQueryString)
        throw new Error("Account not found");
      return searchWithCursors(accountData, searchQueryString, 50, pageParam);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? (lastPage.endCursor ?? undefined) : undefined,
    staleTime: 30000,
    enabled: !!accountData && !!searchQueryString,
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
    ) as (SearchResultWithCursorItem | IssueWithCursor)[];
  }, [data, cursorMap]);

  return {
    results,
    isLoading,
    error,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,
  };
}

export function useUserSearch(accountId: string, query: string) {
  const account = getAccount(accountId);

  return useQuery({
    queryKey: ["user-search", accountId, query],
    queryFn: () => searchGitHubUsers(account!, query),
    enabled: !!account && query.length >= 2,
    staleTime: 60000,
  });
}

export function useRepoSearch(accountId: string, query: string) {
  const account = getAccount(accountId);

  return useQuery({
    queryKey: ["repo-search", accountId, query],
    queryFn: () => searchGitHubRepos(account!, query),
    enabled: !!account && query.length >= 2,
    staleTime: 60000,
  });
}

export function useAdjacentItems(
  accountId: string,
  queryId: string,
  additionalFilters: Partial<QueryFilters> | undefined,
  cursor: string | undefined,
) {
  const accountData = getAccount(accountId);
  const filters = useCombinedFilters(accountId, queryId, additionalFilters);
  const isPR = filters.type === "pulls";

  const searchQueryString = useMemo(() => {
    if (!accountData) return null;
    return buildSearchQuery(accountData, filters, isPR);
  }, [accountData, filters, isPR]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["github-adjacent-items", accountId, queryId, filters, cursor],
    queryFn: async () => {
      if (!accountData || !searchQueryString || !cursor)
        throw new Error("Missing required data");
      return searchAdjacentItems(accountData, searchQueryString, cursor);
    },
    staleTime: 30000,
    enabled: !!accountData && !!searchQueryString && !!cursor,
  });

  return {
    prev: data?.prev ?? null,
    next: data?.next ?? null,
    isLoading,
    error,
  };
}
