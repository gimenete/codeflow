import { useCallback, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import {
  Copy,
  ExternalLink,
  FileText,
  GitBranch,
  Info,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { GitCommitIcon, RepoIcon } from "@primer/octicons-react";
import { Branch } from "@/components/branch";
import { CheckoutBranchDialog } from "@/components/checkout-branch-dialog";
import { EditBaseBranchDialog } from "@/components/edit-base-branch-dialog";
import { EmojiText } from "@/components/emoji-text";
import { InlineEditableTitle } from "@/components/inline-editable-title";
import { CommentForm } from "@/components/comment-form";
import { CommitSuggestionPopover } from "@/components/commit-suggestion-popover";
import { ReviewPopover } from "@/components/review-popover";
import {
  CommitsList,
  DetailSkeleton,
  FilesList,
  Timeline,
} from "@/components/detail-components";
import type { SuggestionInfo } from "@/components/html-renderer";
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
  DropdownMenuSeparator,
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
import { PullMergeStatusCard } from "@/components/pull-merge-status-card";
import { copyToClipboard, openInBrowser } from "@/lib/actions";
import { getAccount } from "@/lib/auth";
import {
  usePullMetadata,
  usePullTimeline,
  usePRCommits,
  usePRFilesREST,
  useDiff,
  useTimelineMutations,
  useMarkAsReadOnMount,
} from "@/lib/github";
import { useIsLargeScreen, useParseDiffAsync } from "@/lib/hooks";
import type { DiffSource } from "@/lib/github-types";
import { parseRemoteUrl } from "@/lib/remote-url";
import { useRepositoriesStore } from "@/lib/repositories-store";
import {
  useSuggestionBatchStore,
  getPrKey,
  type BatchedSuggestion,
} from "@/lib/suggestion-batch-store";

const EMPTY_BATCH: BatchedSuggestion[] = [];

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

  const mutations = useTimelineMutations(accountId, owner, repo, number, true);

  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [editBaseBranchDialogOpen, setEditBaseBranchDialogOpen] =
    useState(false);

  // Find local repository matching this owner/repo
  const localRepository = useRepositoriesStore((state) =>
    state.repositories.find((r) => {
      if (!r.remoteUrl) return false;
      const info = parseRemoteUrl(r.remoteUrl);
      return info?.owner === owner && info?.repo === repo;
    }),
  );
  const hasLocalPath = !!localRepository?.path;

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
              <InlineEditableTitle
                title={data.title}
                number={data.number}
                canEdit={data.viewerCanUpdate}
                onSave={(newTitle) => mutations.editTitle(data.id, newTitle)}
              />
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <RepoIcon size={14} />
                <span>{data.repository}</span>
              </div>

              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Branch name={data.baseRef} />
                  <span>&larr;</span>
                  <Branch name={data.headRef} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-5 w-5 ml-0.5"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onClick={() => copyToClipboard(data.headRef)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy branch name
                      </DropdownMenuItem>
                      {hasLocalPath && localRepository && (
                        <DropdownMenuItem
                          onClick={() => setCheckoutDialogOpen(true)}
                        >
                          <GitBranch className="h-4 w-4 mr-2" />
                          Check out branch
                        </DropdownMenuItem>
                      )}
                      {data.viewerCanUpdate &&
                        data.state === "open" &&
                        !data.merged && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setEditBaseBranchDialogOpen(true)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit base branch
                            </DropdownMenuItem>
                          </>
                        )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
          <div className="flex items-center border-b bg-muted">
            <TabsList className="flex-1 rounded-none border-b-0 justify-start">
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
            <div className="px-2 flex items-center gap-1.5">
              {data.viewerCanUpdate &&
                data.state === "open" &&
                !data.merged && (
                  <BatchCommitButton
                    owner={owner}
                    repo={repo}
                    number={number}
                    onCommit={mutations.commitSuggestions}
                  />
                )}
              {data.viewerCanUpdate &&
                data.state === "open" &&
                !data.merged && (
                  <DraftToggleButton
                    isDraft={data.isDraft}
                    pullRequestId={data.id}
                    onToggleDraft={mutations.toggleDraft}
                  />
                )}
              <ReviewPopover
                accountId={accountId}
                owner={owner}
                repo={repo}
                canApprove={
                  data.viewerCanUpdate && account?.login !== data.author.login
                }
                onSubmitReview={mutations.submitReview}
              />
            </div>
          </div>
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
            basePath={basePath}
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

      {hasLocalPath && localRepository && (
        <CheckoutBranchDialog
          repository={localRepository}
          branchName={data.headRef}
          open={checkoutDialogOpen}
          onOpenChange={setCheckoutDialogOpen}
        />
      )}

      {data.viewerCanUpdate && data.state === "open" && !data.merged && (
        <EditBaseBranchDialog
          accountId={accountId}
          owner={owner}
          repo={repo}
          pullRequestId={data.id}
          currentBaseBranch={data.baseRef}
          headBranch={data.headRef}
          open={editBaseBranchDialogOpen}
          onOpenChange={setEditBaseBranchDialogOpen}
          onSave={mutations.updateBaseBranch}
        />
      )}
    </div>
  );
}

// Conversation tab component
function ConversationTab({
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
  const { data, isLoading: isMetadataLoading } = usePullMetadata(
    accountId,
    owner,
    repo,
    number,
  );
  const navigate = useNavigate();
  const isLargeScreen = useIsLargeScreen();
  const [sheetOpen, setSheetOpen] = useState(false);

  const {
    data: timelineData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isTimelineLoading,
  } = usePullTimeline(accountId, owner, repo, number);

  // Mark notification as read and get lastReadAt for NEW divider
  const notification = useMarkAsReadOnMount(accountId, owner, repo, number);

  const mutations = useTimelineMutations(accountId, owner, repo, number, true);

  const prKey = getPrKey(owner, repo, number);
  const addSuggestion = useSuggestionBatchStore((s) => s.addSuggestion);
  const removeSuggestion = useSuggestionBatchStore((s) => s.removeSuggestion);
  const batchForPr = useSuggestionBatchStore(
    (s) => s.batches[prKey] ?? EMPTY_BATCH,
  );

  const canCommitSuggestions =
    data?.viewerCanUpdate && data?.state === "open" && !data?.merged;

  const { commitSuggestions } = mutations;
  const handleCommitSuggestion = useCallback(
    async (suggestionId: string, headline: string, body: string) => {
      await commitSuggestions([suggestionId], headline, body);
    },
    [commitSuggestions],
  );

  const handleAddToBatch = useCallback(
    (suggestion: SuggestionInfo) => {
      addSuggestion(prKey, {
        suggestionId: suggestion.id,
        commentId: "",
        path: "",
        suggestion: suggestion.suggestion,
      });
    },
    [addSuggestion, prKey],
  );

  const handleRemoveFromBatch = useCallback(
    (suggestionId: string) => {
      removeSuggestion(prKey, suggestionId);
    },
    [removeSuggestion, prKey],
  );

  const isSuggestionInBatch = useCallback(
    (suggestionId: string) => {
      return batchForPr.some((s) => s.suggestionId === suggestionId);
    },
    [batchForPr],
  );

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

  const commentFooter = (
    <>
      <PullMergeStatusCard
        accountId={accountId}
        owner={owner}
        repo={repo}
        number={number}
        state={data.state}
        merged={data.merged}
        isDraft={data.isDraft}
        viewerCanUpdate={data.viewerCanUpdate}
        headRef={data.headRef}
        headRefExists={data.headRefExists}
        isCrossRepository={data.isCrossRepository}
        onMerge={mutations.mergePull}
        onDeleteBranch={() => mutations.deleteBranch(data.headRef)}
      />
      <CommentForm
        accountId={accountId}
        owner={owner}
        repo={repo}
        state={data.state}
        merged={data.merged}
        isPR={true}
        viewerCanUpdate={data.viewerCanUpdate}
        onSubmitComment={mutations.submitComment}
        onChangeState={mutations.changeState}
        onCommentAndChangeState={mutations.commentAndChangeState}
      />
    </>
  );

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
          lastReadAt={notification ? notification.lastReadAt : undefined}
          footer={commentFooter}
          onToggleReaction={mutations.toggleReaction}
          onEditComment={mutations.editComment}
          onEditReviewComment={mutations.editReviewComment}
          onEditDescription={(body) => mutations.editDescription(data.id, body)}
          onCommitSuggestion={
            canCommitSuggestions ? handleCommitSuggestion : undefined
          }
          onAddSuggestionToBatch={
            canCommitSuggestions ? handleAddToBatch : undefined
          }
          onRemoveSuggestionFromBatch={
            canCommitSuggestions ? handleRemoveFromBatch : undefined
          }
          isSuggestionInBatch={
            canCommitSuggestions ? isSuggestionInBatch : undefined
          }
          onCommitClick={(sha) =>
            void navigate({
              to: `${basePath}/files`,
              search: { commit: sha },
            })
          }
          accountId={accountId}
          owner={owner}
          repo={repo}
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
            <MetadataSidebar
              data={data}
              isPR={true}
              asSheet
              accountId={accountId}
              owner={owner}
              repo={repo}
              onLabelsChange={mutations.updateLabels}
              onAssigneesChange={mutations.updateAssignees}
              onReviewRequestsChange={mutations.updateReviewRequests}
              onMilestoneChange={mutations.updateMilestone}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop sidebar */}
      {isLargeScreen && (
        <div className="w-64">
          <MetadataSidebar
            data={data}
            isPR={true}
            accountId={accountId}
            owner={owner}
            repo={repo}
            onLabelsChange={mutations.updateLabels}
            onAssigneesChange={mutations.updateAssignees}
            onReviewRequestsChange={mutations.updateReviewRequests}
            onMilestoneChange={mutations.updateMilestone}
          />
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
  const navigate = useNavigate();
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
    void navigate({
      to: `${basePath}/files`,
      search: { commit: sha },
    });
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
  const navigate = useNavigate();
  const { commit } = useSearch({ strict: false });

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

  const displayFiles = useMemo(() => {
    if (commit) {
      // When viewing a specific commit, use files from the parsed diff
      return parsedDiffs.map((diff) => ({
        path: diff.path,
        status: "modified",
        patch: diff.patch,
      }));
    }
    // When viewing all changes, use REST file list + patchMap
    return restFiles.map((file) => ({
      ...file,
      patch: patchMap.get(file.path),
    }));
  }, [commit, parsedDiffs, restFiles, patchMap]);

  const handleCommitSelect = (value: string) => {
    const newCommit = value === "all" ? undefined : value;
    void navigate({
      to: ".",
      search: { commit: newCommit },
      replace: true,
    });
  };

  if (!data) {
    return null;
  }

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
      <FilesList files={displayFiles} />
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
              <EmojiText
                className="truncate"
                text={
                  selectedCommitInfo?.message.split("\n")[0] ?? "Loading..."
                }
              />
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
              <EmojiText
                className="truncate"
                text={commit.message.split("\n")[0]}
              />
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

function BatchCommitButton({
  owner,
  repo,
  number,
  onCommit,
}: {
  owner: string;
  repo: string;
  number: number;
  onCommit: (
    suggestionIds: string[],
    headline: string,
    body?: string,
  ) => Promise<void>;
}) {
  const prKey = getPrKey(owner, repo, number);
  const batch = useSuggestionBatchStore((s) => s.batches[prKey] ?? EMPTY_BATCH);
  const clearBatch = useSuggestionBatchStore((s) => s.clearBatch);

  if (batch.length === 0) return null;

  const defaultHeadline =
    batch.length === 1
      ? "Apply suggestion from code review"
      : `Apply ${batch.length} suggestions from code review`;

  return (
    <CommitSuggestionPopover
      defaultHeadline={defaultHeadline}
      onCommit={async (headline, body) => {
        const ids = batch.map((s) => s.suggestionId);
        await onCommit(ids, headline, body || undefined);
        clearBatch(prKey);
      }}
      align="end"
      trigger={
        <Button size="sm" variant="outline" className="gap-1.5">
          Commit suggestions
          <Badge variant="secondary">{batch.length}</Badge>
        </Button>
      }
    />
  );
}

function DraftToggleButton({
  isDraft,
  pullRequestId,
  onToggleDraft,
}: {
  isDraft: boolean;
  pullRequestId: string;
  onToggleDraft: (pullRequestId: string, isDraft: boolean) => Promise<void>;
}) {
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    setIsToggling(true);
    setError(null);
    try {
      await onToggleDraft(pullRequestId, isDraft);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to update draft status",
      );
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        disabled={isToggling}
        title={error ?? undefined}
      >
        {isToggling ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
        {isDraft ? "Ready for review" : "Convert to draft"}
      </Button>
    </div>
  );
}
