import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fuzzyMatch } from "@/lib/fuzzy-search";
import type { SearchResult } from "@/lib/fs";

export interface FileSearchResult extends SearchResult {
  relativePath: string;
}

interface UseFileSearchOptions {
  rootPath: string;
  enabled?: boolean;
  limit?: number;
}

/**
 * Shared hook for file search with caching
 * Uses useQuery to cache file list via listAllFiles() IPC
 * Returns a search function that performs in-memory fuzzy filtering
 */
export function useFileSearch({
  rootPath,
  enabled = true,
  limit = 10000,
}: UseFileSearchOptions) {
  // Load all files with React Query (cached for 5 minutes)
  const {
    data: allFiles = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["all-files", rootPath],
    queryFn: () =>
      window.fsAPI?.listAllFiles(rootPath, limit) ?? Promise.resolve([]),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: enabled && !!rootPath,
  });

  // In-memory fuzzy search function
  const search = useCallback(
    (pattern: string, searchLimit = 50): FileSearchResult[] => {
      if (!pattern.trim()) {
        // Return first N files when no search pattern
        return allFiles.slice(0, searchLimit).map((file) => ({
          path: `${rootPath}/${file.path}`,
          relativePath: file.path,
          name: file.name,
          score: 0,
          matches: [],
        }));
      }

      const results: FileSearchResult[] = [];
      const trimmedPattern = pattern.trim();

      for (const file of allFiles) {
        const match = fuzzyMatch(trimmedPattern, file.name);
        if (match) {
          results.push({
            path: `${rootPath}/${file.path}`,
            relativePath: file.path,
            name: file.name,
            score: match.score,
            matches: match.matchIndices,
          });
        }
      }

      // Sort by score descending
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, searchLimit);
    },
    [allFiles, rootPath],
  );

  // Memoized search results for a given pattern
  const useSearchResults = (pattern: string, searchLimit = 50) => {
    return useMemo(() => search(pattern, searchLimit), [pattern, searchLimit]);
  };

  return {
    allFiles,
    isLoading,
    error,
    search,
    useSearchResults,
  };
}
