import type { TimelineNode, Actor } from "./types";
import { CommentEvent } from "./comment-event";
import { CommitEvent } from "./commit-event";
import { ReviewEvent } from "./review-event";
import { LabeledEvent } from "./labeled-event";
import {
  ClosedEvent,
  ReopenedEvent,
  MergedEvent,
  LockedEvent,
  UnlockedEvent,
} from "./state-events";
import { AssignedEvent, UnassignedEvent } from "./assignment-events";
import { MilestonedEvent, DemilestonedEvent } from "./milestone-events";
import {
  CrossReferencedEvent,
  ReferencedEvent,
  RenamedTitleEvent,
} from "./reference-events";
import {
  ReviewRequestedEvent,
  ReviewRequestRemovedEvent,
  ReviewDismissedEvent,
} from "./review-request-events";
import {
  HeadRefForcePushedEvent,
  HeadRefDeletedEvent,
  HeadRefRestoredEvent,
  BaseRefChangedEvent,
  BaseRefForcePushedEvent,
} from "./branch-events";
import { ConvertToDraftEvent, ReadyForReviewEvent } from "./draft-events";
import {
  AutoMergeEnabledEvent,
  AutoMergeDisabledEvent,
} from "./auto-merge-events";
import {
  MarkedAsDuplicateEvent,
  UnmarkedAsDuplicateEvent,
  TransferredEvent,
  ConvertedToDiscussionEvent,
  PinnedEvent,
  UnpinnedEvent,
  ConnectedEvent,
  DisconnectedEvent,
  CommentDeletedEvent,
  SubscribedEvent,
  UnsubscribedEvent,
  MentionedEvent,
} from "./misc-events";
import { UnknownEvent } from "./unknown-event";

// Re-export types and helpers
export * from "./types";
export { TimelineEventWrapper } from "./timeline-event-wrapper";
export { GroupedLabelsEvent } from "./labeled-event";

interface TimelineEventItemProps {
  event: TimelineNode;
}

export function TimelineEventItem({ event }: TimelineEventItemProps) {
  switch (event.__typename) {
    case "IssueComment":
      return (
        <CommentEvent
          author={event.author as Actor}
          bodyHTML={event.bodyHTML}
          createdAt={event.createdAt}
        />
      );

    case "PullRequestCommit":
      return <CommitEvent commit={event.commit} />;

    case "PullRequestReview":
      return (
        <ReviewEvent
          author={event.author as Actor}
          bodyHTML={event.bodyHTML}
          state={event.state}
          createdAt={event.createdAt}
        />
      );

    case "LabeledEvent":
      return (
        <LabeledEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          label={event.label}
          action="added"
        />
      );

    case "UnlabeledEvent":
      return (
        <LabeledEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          label={event.label}
          action="removed"
        />
      );

    case "ClosedEvent":
      return (
        <ClosedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          stateReason={event.stateReason}
        />
      );

    case "ReopenedEvent":
      return (
        <ReopenedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
        />
      );

    case "MergedEvent":
      return (
        <MergedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          mergeRefName={event.mergeRefName}
        />
      );

    case "LockedEvent":
      return (
        <LockedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          lockReason={event.lockReason}
        />
      );

    case "UnlockedEvent":
      return (
        <UnlockedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
        />
      );

    case "AssignedEvent":
      return (
        <AssignedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          assignee={event.assignee}
        />
      );

    case "UnassignedEvent":
      return (
        <UnassignedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          assignee={event.assignee}
        />
      );

    case "MilestonedEvent":
      return (
        <MilestonedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          milestoneTitle={event.milestoneTitle}
        />
      );

    case "DemilestonedEvent":
      return (
        <DemilestonedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          milestoneTitle={event.milestoneTitle}
        />
      );

    case "RenamedTitleEvent":
      return (
        <RenamedTitleEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          previousTitle={event.previousTitle}
          currentTitle={event.currentTitle}
        />
      );

    case "CrossReferencedEvent":
      return (
        <CrossReferencedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          source={event.source}
          isCrossRepository={event.isCrossRepository}
        />
      );

    case "ReferencedEvent":
      return (
        <ReferencedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          commit={event.referencedCommit}
          isCrossRepository={event.isCrossRepository}
        />
      );

    case "ReviewRequestedEvent":
      return (
        <ReviewRequestedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          requestedReviewer={event.requestedReviewer}
        />
      );

    case "ReviewRequestRemovedEvent":
      return (
        <ReviewRequestRemovedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          requestedReviewer={event.requestedReviewer}
        />
      );

    case "ReviewDismissedEvent":
      return (
        <ReviewDismissedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          dismissalMessage={event.dismissalMessage}
          review={event.review}
        />
      );

    case "HeadRefForcePushedEvent":
      return (
        <HeadRefForcePushedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          beforeCommit={event.beforeCommit}
          afterCommit={event.afterCommit}
        />
      );

    case "HeadRefDeletedEvent":
      return (
        <HeadRefDeletedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          headRefName={event.headRefName}
        />
      );

    case "HeadRefRestoredEvent":
      return (
        <HeadRefRestoredEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
        />
      );

    case "BaseRefChangedEvent":
      return (
        <BaseRefChangedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          previousRefName={event.previousRefName}
          currentRefName={event.currentRefName}
        />
      );

    case "BaseRefForcePushedEvent":
      return (
        <BaseRefForcePushedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          beforeCommit={event.beforeCommit}
          afterCommit={event.afterCommit}
        />
      );

    case "ConvertToDraftEvent":
      return (
        <ConvertToDraftEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
        />
      );

    case "ReadyForReviewEvent":
      return (
        <ReadyForReviewEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
        />
      );

    case "AutoMergeEnabledEvent":
      return (
        <AutoMergeEnabledEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          enabler={event.enabler}
        />
      );

    case "AutoMergeDisabledEvent":
      return (
        <AutoMergeDisabledEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          disabler={event.disabler}
        />
      );

    case "MarkedAsDuplicateEvent":
      return (
        <MarkedAsDuplicateEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          canonical={event.canonical}
        />
      );

    case "UnmarkedAsDuplicateEvent":
      return (
        <UnmarkedAsDuplicateEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
        />
      );

    case "TransferredEvent":
      return (
        <TransferredEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          fromRepository={event.fromRepository}
        />
      );

    case "ConvertedToDiscussionEvent":
      return (
        <ConvertedToDiscussionEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
        />
      );

    case "PinnedEvent":
      return (
        <PinnedEvent actor={event.actor as Actor} createdAt={event.createdAt} />
      );

    case "UnpinnedEvent":
      return (
        <UnpinnedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
        />
      );

    case "ConnectedEvent":
      return (
        <ConnectedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          subject={event.subject}
        />
      );

    case "DisconnectedEvent":
      return (
        <DisconnectedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          subject={event.subject}
        />
      );

    case "CommentDeletedEvent":
      return (
        <CommentDeletedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          deletedCommentAuthor={event.deletedCommentAuthor}
        />
      );

    case "SubscribedEvent":
      return (
        <SubscribedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
        />
      );

    case "UnsubscribedEvent":
      return (
        <UnsubscribedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
        />
      );

    case "MentionedEvent":
      return (
        <MentionedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
        />
      );

    default:
      return <UnknownEvent typename={event.__typename} />;
  }
}
