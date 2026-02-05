import { useMemo, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Info,
  Copy,
  ExternalLink,
  FileText,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";
import { GitCommitIcon, RepoIcon } from "@primer/octicons-react";
import { Branch } from "@/components/branch";
import {
  CommitsList,
  DetailSkeleton,
  FilesList,
  Timeline,
} from "@/components/detail-components";
import { MetadataSidebar } from "@/components/metadata-sidebar";
import { PullStateIcon } from "@/components/pull-state-icon";
import { Scrollable } from "@/components/flex-layout";
import { CommitHash } from "@/components/commit-hash";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copyToClipboard, openInBrowser } from "@/lib/actions";
import { getAccount } from "@/lib/auth";
import {
  usePullMetadata,
  usePullTimeline,
  usePRCommits,
  usePRFilesREST,
  useDiff,
} from "@/lib/github";
import { useIsLargeScreen, useParseDiffAsync } from "@/lib/hooks";
import type { DiffSource } from "@/lib/github-types";

export interface GitHubPullProps {
  accountId: string;
  owner: string;
  repo: string;
  number: number;
  basePath: string; // e.g., "/repositories/my-repo/pulls/123" or "/repositories/my-repo/branches/branch-id/pull"
}

type TabType = "conversation" | "commits" | "files";

export function GitHubPull({
  accountId,
  owner,
  repo,
  number,
  basePath,
}: GitHubPullProps) {
  const location = useLocation();
  const account = getAccount(accountId);

  const { data, isLoading, error } = usePullMetadata(
    accountId,
    owner,
    repo,
    number,
  );

  // Derive active tab from URL
  const activeTab: TabType = location.pathname.endsWith("/commits")
    ? "commits"
    : location.pathname.endsWith("/files")
      ? "files"
      : "conversation";

  // Tab navigation uses basePath
  const tabPaths = {
    conversation: basePath,
    commits: `${basePath}/commits`,
    files: `${basePath}/files`,
  };

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-6 px-4">
        <p className="text-destructive">
          Error: {error?.message ?? "Not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      {/* Sticky container for header + tabs */}
      <div className="bg-background shrink-0">
        <div className="border-b px-4 py-3 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <PullStateIcon
                state={data.state}
                merged={data.merged}
                isDraft={data.isDraft}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold">
                {data.title}{" "}
                <span className="text-muted-foreground font-normal">
                  #{data.number}
                </span>
              </h1>
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <RepoIcon size={14} />
                <span>{data.repository}</span>
              </div>

              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Branch name={data.baseRef} />
                  <span>&larr;</span>
                  <Branch name={data.headRef} />
                </div>
                <span>
                  <span className="text-green-600">+{data.additions}</span>
                  {" / "}
                  <span className="text-red-600">-{data.deletions}</span>
                </span>
                <span>{data.changedFiles} files changed</span>
              </div>
            </div>
            <div className="flex items-center gap-1 self-start ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      copyToClipboard(
                        `https://${account?.host ?? "github.com"}/${owner}/${repo}/pull/${number}`,
                      )
                    }
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy GitHub URL
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      openInBrowser(
                        `https://${account?.host ?? "github.com"}/${owner}/${repo}/pull/${number}`,
                      )
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in GitHub
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <Tabs value={activeTab}>
          <TabsList className="w-full rounded-none border-b justify-start">
            <Link to={tabPaths.conversation}>
              <TabsTrigger value="conversation" className="gap-1">
                <MessageSquare className="h-4 w-4" />
                Conversation
              </TabsTrigger>
            </Link>
            <Link to={tabPaths.commits}>
              <TabsTrigger value="commits" className="gap-1">
                <GitCommitIcon size={16} />
                Commits
                <Badge variant="secondary" className="ml-1">
                  {data.totalCommits}
                </Badge>
              </TabsTrigger>
            </Link>
            <Link to={tabPaths.files}>
              <TabsTrigger value="files" className="gap-1">
                <FileText className="h-4 w-4" />
                Files Changed
                <Badge variant="secondary" className="ml-1">
                  {data.changedFiles}
                </Badge>
              </TabsTrigger>
            </Link>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 h-full">
        {activeTab === "conversation" && (
          <ConversationTab
            accountId={accountId}
            owner={owner}
            repo={repo}
            number={number}
          />
        )}
        {activeTab === "commits" && (
          <CommitsTab
            accountId={accountId}
            owner={owner}
            repo={repo}
            number={number}
            basePath={basePath}
          />
        )}
        {activeTab === "files" && (
          <FilesTab
            accountId={accountId}
            owner={owner}
            repo={repo}
            number={number}
          />
        )}
      </div>
    </div>
  );
}

// Conversation tab component
function ConversationTab({
  accountId,
  owner,
  repo,
  number,
}: {
  accountId: string;
  owner: string;
  repo: string;
  number: number;
}) {
  const { data, isLoading: isMetadataLoading } = usePullMetadata(
    accountId,
    owner,
    repo,
    number,
  );
  const isLargeScreen = useIsLargeScreen();
  const [sheetOpen, setSheetOpen] = useState(false);

  const {
    data: timelineData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isTimelineLoading,
  } = usePullTimeline(accountId, owner, repo, number);

  const timelineItems = useMemo(() => {
    if (!timelineData?.pages) return [];
    return timelineData.pages.flatMap((page) => page.items);
  }, [timelineData]);

  if (isMetadataLoading || !data) {
    return (
      <div className="flex-1 p-4 space-y-4 max-w-4xl">
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Scrollable.Layout direction="horizontal">
      <div className="w-80 flex-1">
        <Timeline
          data={data}
          timelineItems={timelineItems}
          hasNextPage={hasNextPage ?? false}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          isLoading={isTimelineLoading}
        />
      </div>

      {/* Mobile FAB to open sidebar sheet */}
      {!isLargeScreen && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-30"
            >
              <Info className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
            <SheetHeader>
              <SheetTitle>Details</SheetTitle>
            </SheetHeader>
            <MetadataSidebar data={data} isPR={true} asSheet />
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop sidebar */}
      {isLargeScreen && (
        <div className="w-64">
          <MetadataSidebar data={data} isPR={true} />
        </div>
      )}
    </Scrollable.Layout>
  );
}

// Commits tab component
function CommitsTab({
  accountId,
  owner,
  repo,
  number,
  basePath,
}: {
  accountId: string;
  owner: string;
  repo: string;
  number: number;
  basePath: string;
}) {
  const {
    data: commitsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isCommitsLoading,
  } = usePRCommits(accountId, owner, repo, number);

  const commits = useMemo(() => {
    if (!commitsData?.pages) return [];
    return commitsData.pages.flatMap((page) => page.items);
  }, [commitsData]);

  const handleCommitClick = (sha: string) => {
    // Use window.location for navigation with query params to avoid TanStack Router type issues
    window.location.href = `${basePath}/files?commit=${encodeURIComponent(sha)}`;
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

// Files tab component
function FilesTab({
  accountId,
  owner,
  repo,
  number,
}: {
  accountId: string;
  owner: string;
  repo: string;
  number: number;
}) {
  // Parse commit from search params using window.location
  const searchParams = new URLSearchParams(window.location.search);
  const commit = searchParams.get("commit") ?? undefined;

  const { data } = usePullMetadata(accountId, owner, repo, number);

  // Fetch commits for the selector
  const {
    data: commitsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePRCommits(accountId, owner, repo, number);

  const commits = useMemo(() => {
    if (!commitsData?.pages) return [];
    return commitsData.pages.flatMap((page) => page.items);
  }, [commitsData]);

  const totalCommits = commitsData?.pages[0]?.totalCount ?? 0;

  // Also fetch files list from REST API
  const { data: filesData } = usePRFilesREST(accountId, owner, repo, number);
  const restFiles = useMemo(() => {
    if (!filesData?.pages) return [];
    return filesData.pages.flatMap((page) => page.files);
  }, [filesData]);

  // Determine the diff source based on the current state
  const diffSource = useMemo((): DiffSource | null => {
    if (!data) return null;

    if (commit) {
      return { type: "commit", sha: commit };
    }

    if (data.merged && data.mergeCommitSha) {
      return {
        type: "compare",
        base: `${data.mergeCommitSha}^1`,
        head: data.mergeCommitSha,
        headOwner: null,
      };
    }

    return {
      type: "compare",
      base: data.baseRef,
      head: data.headRef,
      headOwner: data.isCrossRepository ? data.headRepositoryOwner : null,
    };
  }, [commit, data]);

  const { data: diffText, isLoading: isDiffLoading } = useDiff(
    accountId,
    owner,
    repo,
    diffSource,
  );

  const { parsedDiffs, isParsing } = useParseDiffAsync(diffText);

  const patchMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const diff of parsedDiffs) {
      map.set(diff.path, diff.patch);
    }
    return map;
  }, [parsedDiffs]);

  const handleCommitSelect = (value: string) => {
    const newCommit = value === "all" ? undefined : value;
    // Update URL with new commit param
    const url = new URL(window.location.href);
    if (newCommit) {
      url.searchParams.set("commit", newCommit);
    } else {
      url.searchParams.delete("commit");
    }
    window.history.replaceState({}, "", url.toString());
    // Force re-render by updating location
    window.location.replace(url.toString());
  };

  if (!data) {
    return null;
  }

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
    <Scrollable.Layout direction="vertical">
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
    </Scrollable.Layout>
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
