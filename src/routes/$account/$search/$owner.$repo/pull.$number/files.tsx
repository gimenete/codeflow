import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  usePullMetadata,
  useDiff,
  usePRCommits,
  usePRFilesREST,
} from "@/lib/github";
import { FilesList } from "@/components/detail-components";
import { useParseDiffAsync } from "@/lib/hooks";
import { CommitHash } from "@/components/commit-hash";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { DiffSource } from "@/lib/github-types";

interface FilesSearch {
  commit?: string;
}

export const Route = createFileRoute(
  "/$account/$search/$owner/$repo/pull/$number/files",
)({
  validateSearch: (search: Record<string, unknown>): FilesSearch => ({
    commit: typeof search.commit === "string" ? search.commit : undefined,
  }),
  component: PullFilesTab,
});

function PullFilesTab() {
  const { account, owner, repo, number } = Route.useParams();
  const { commit } = Route.useSearch();
  const navigate = useNavigate();
  const prNumber = parseInt(number);

  const { data } = usePullMetadata(account, owner, repo, prNumber);

  // Fetch commits for the selector
  const {
    data: commitsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePRCommits(account, owner, repo, prNumber);

  const commits = useMemo(() => {
    if (!commitsData?.pages) return [];
    return commitsData.pages.flatMap((page) => page.items);
  }, [commitsData]);

  const totalCommits = commitsData?.pages[0]?.totalCount ?? 0;

  // Also fetch files list from REST API (for progressive loading in the future)
  const { data: filesData } = usePRFilesREST(account, owner, repo, prNumber);
  const restFiles = useMemo(() => {
    if (!filesData?.pages) return [];
    return filesData.pages.flatMap((page) => page.files);
  }, [filesData]);

  // Determine the diff source based on the current state
  const diffSource = useMemo((): DiffSource | null => {
    if (!data) return null;

    if (commit) {
      // Case 1: Selected commit → show that commit only
      return { type: "commit", sha: commit };
    }

    if (data.merged && data.mergeCommitSha) {
      // Case 2: Merged PR → compare first parent of merge commit with merge commit
      // This shows exactly what the PR introduced, even if base branch has moved
      return {
        type: "compare",
        base: `${data.mergeCommitSha}^1`,
        head: data.mergeCommitSha,
        headOwner: null,
      };
    }

    // Case 3: Open/closed PR → compare branches
    // For forks: use headOwner:headRef format
    return {
      type: "compare",
      base: data.baseRef,
      head: data.headRef,
      headOwner: data.isCrossRepository ? data.headRepositoryOwner : null,
    };
  }, [commit, data]);

  const { data: diffText, isLoading: isDiffLoading } = useDiff(
    account,
    owner,
    repo,
    diffSource,
  );

  // Use async parsing in a Web Worker to avoid blocking the main thread
  const { parsedDiffs, isParsing } = useParseDiffAsync(diffText);

  // Build a Map for O(1) patch lookup instead of O(n) .find()
  const patchMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const diff of parsedDiffs) {
      map.set(diff.path, diff.patch);
    }
    return map;
  }, [parsedDiffs]);

  const handleCommitSelect = (value: string) => {
    const newCommit = value === "all" ? undefined : value;
    navigate({
      to: ".",
      search: newCommit ? { commit: newCommit } : {},
      replace: true,
    });
  };

  if (!data) {
    return null;
  }

  // Merge file metadata with parsed patches using O(1) Map lookup
  const filesWithPatches = restFiles.map((file) => ({
    ...file,
    patch: patchMap.get(file.path),
  }));

  if (isDiffLoading || isParsing) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="border-b p-2 shrink-0">
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="flex-1 flex min-h-0">
          <div className="w-80 border-r p-2 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <div className="flex-1 p-4">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Commit selector */}
      <div className="border-b p-2 shrink-0">
        <CommitSelector
          commits={commits}
          selectedCommit={commit}
          onSelect={handleCommitSelect}
          totalCommits={totalCommits}
          hasMore={hasNextPage ?? false}
          loadMore={() => fetchNextPage()}
          isLoadingMore={isFetchingNextPage}
        />
      </div>
      <FilesList files={filesWithPatches} />
    </div>
  );
}

interface CommitSelectorProps {
  commits: Array<{
    sha: string;
    message: string;
    author: { login: string; avatarUrl: string };
    date: string;
  }>;
  selectedCommit: string | undefined;
  onSelect: (sha: string) => void;
  totalCommits: number;
  hasMore: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
}

function CommitSelector({
  commits,
  selectedCommit,
  onSelect,
  totalCommits,
  hasMore,
  loadMore,
  isLoadingMore,
}: CommitSelectorProps) {
  const selectedCommitInfo = selectedCommit
    ? commits.find((c) => c.sha === selectedCommit)
    : null;

  return (
    <Select value={selectedCommit ?? "all"} onValueChange={onSelect}>
      <SelectTrigger className="w-auto min-w-64 max-w-md">
        <SelectValue>
          {selectedCommit ? (
            <span className="flex items-center gap-2">
              <CommitHash sha={selectedCommit} />
              <span className="truncate">
                {selectedCommitInfo?.message.split("\n")[0] ?? "Loading..."}
              </span>
            </span>
          ) : (
            <span>
              All changes{" "}
              <span className="text-muted-foreground">
                ({totalCommits} commits)
              </span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span className="flex items-center gap-2">
            All changes
            <span className="text-muted-foreground text-xs">
              ({totalCommits} commits)
            </span>
          </span>
        </SelectItem>
        <SelectSeparator />
        {commits.map((commit) => (
          <SelectItem key={commit.sha} value={commit.sha}>
            <span className="flex items-center gap-2 max-w-md">
              <CommitHash sha={commit.sha} className="shrink-0" />
              <span className="truncate">{commit.message.split("\n")[0]}</span>
            </span>
          </SelectItem>
        ))}
        {hasMore && (
          <>
            <SelectSeparator />
            <div className="px-2 py-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  loadMore();
                }}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? "Loading..." : "Load more commits..."}
              </Button>
            </div>
          </>
        )}
      </SelectContent>
    </Select>
  );
}
