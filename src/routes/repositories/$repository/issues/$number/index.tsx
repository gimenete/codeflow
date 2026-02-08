import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";
import {
  useIssueMetadata,
  useIssueTimeline,
  useTimelineMutations,
  useMarkAsReadOnMount,
} from "@/lib/github";
import { useIsLargeScreen } from "@/lib/hooks";
import { CommentForm } from "@/components/comment-form";
import { Timeline } from "@/components/detail-components";
import { MetadataSidebar } from "@/components/metadata-sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Scrollable } from "@/components/flex-layout";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute(
  "/repositories/$repository/issues/$number/",
)({
  component: IssueConversationTab,
});

function IssueConversationTab() {
  const { number } = Route.useParams();
  const { account, remoteInfo } = Route.useRouteContext();
  const owner = remoteInfo.owner;
  const repo = remoteInfo.repo;

  const { data, isLoading: isMetadataLoading } = useIssueMetadata(
    account.id,
    owner,
    repo,
    parseInt(number),
  );
  const isLargeScreen = useIsLargeScreen();
  const [sheetOpen, setSheetOpen] = useState(false);

  const issueNumber = parseInt(number);

  const {
    data: timelineData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isTimelineLoading,
  } = useIssueTimeline(account.id, owner, repo, issueNumber);

  // Mark notification as read and get lastReadAt for NEW divider
  const notification = useMarkAsReadOnMount(
    account.id,
    owner,
    repo,
    issueNumber,
  );

  const mutations = useTimelineMutations(
    account.id,
    owner,
    repo,
    issueNumber,
    false,
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
    <CommentForm
      accountId={account.id}
      owner={owner}
      repo={repo}
      state={data.state}
      isPR={false}
      viewerCanUpdate={data.viewerCanUpdate}
      onSubmitComment={mutations.submitComment}
      onChangeState={mutations.changeState}
      onCommentAndChangeState={mutations.commentAndChangeState}
    />
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
          onEditDescription={(body) => mutations.editDescription(data.id, body)}
          accountId={account.id}
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
              isPR={false}
              asSheet
              accountId={account.id}
              owner={owner}
              repo={repo}
              onLabelsChange={mutations.updateLabels}
              onAssigneesChange={mutations.updateAssignees}
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
            isPR={false}
            accountId={account.id}
            owner={owner}
            repo={repo}
            onLabelsChange={mutations.updateLabels}
            onAssigneesChange={mutations.updateAssignees}
            onMilestoneChange={mutations.updateMilestone}
          />
        </div>
      )}
    </Scrollable.Layout>
  );
}
