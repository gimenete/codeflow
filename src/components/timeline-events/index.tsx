import type { ReactionContent } from "@/generated/graphql";
import type { ReactionGroup } from "@/components/reactions";
import type { SuggestionInfo } from "@/components/html-renderer";
import type { TimelineNode, Actor } from "./types";
import { CommentEvent } from "./comment-event";
import { CommitEvent } from "./commit-event";
import { ReviewEvent, type ReviewComment } from "./review-event";
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
} from "./misc-events";
import { UnknownEvent } from "./unknown-event";

// Re-export types and helpers
export * from "./types";
export { TimelineEventWrapper } from "./timeline-event-wrapper";
export { GroupedLabelsEvent } from "./labeled-event";

// Extract review comments from a PullRequestReview event
function extractReviewComments(event: TimelineNode): ReviewComment[] {
  if (!("comments" in event)) return [];
  const { comments } = event as { comments?: { nodes?: unknown[] } };
  if (!comments?.nodes) return [];
  return comments.nodes
    .filter((n): n is Record<string, unknown> => n != null)
    .map((n) => {
      return {
        id: n.id as string,
        author: (n.author ?? null) as Actor,
        body: (n.body as string) ?? undefined,
        bodyHTML: n.bodyHTML as string,
        createdAt: n.createdAt as string,
        viewerCanUpdate: (n.viewerCanUpdate as boolean) ?? false,
        diffHunk: n.diffHunk as string,
        path: n.path as string,
        outdated: n.outdated as boolean,
        reactionGroups: (n.reactionGroups as ReactionGroup[] | null) ?? null,
        suggestedChanges: undefined,
      };
    });
}

interface TimelineEventItemProps {
  event: TimelineNode;
  onToggleReaction?: (
    subjectId: string,
    content: ReactionContent,
    viewerHasReacted: boolean,
  ) => void;
  onEditComment?: (commentId: string, body: string) => Promise<void>;
  onEditReviewComment?: (commentId: string, body: string) => Promise<void>;
  onEditReview?: (reviewId: string, body: string) => Promise<void>;
  onCommitSuggestion?: (
    suggestionId: string,
    headline: string,
    body: string,
  ) => Promise<void>;
  onAddSuggestionToBatch?: (suggestion: SuggestionInfo) => void;
  onRemoveSuggestionFromBatch?: (suggestionId: string) => void;
  isSuggestionInBatch?: (suggestionId: string) => boolean;
  onCommitClick?: (sha: string) => void;
  isPullRequest?: boolean;
  accountId?: string;
  owner?: string;
  repo?: string;
}

export function TimelineEventItem({
  event,
  onToggleReaction,
  onEditComment,
  onEditReviewComment,
  onEditReview,
  onCommitSuggestion,
  onAddSuggestionToBatch,
  onRemoveSuggestionFromBatch,
  isSuggestionInBatch,
  onCommitClick,
  isPullRequest,
  accountId,
  owner,
  repo,
}: TimelineEventItemProps) {
  switch (event.__typename) {
    case "IssueComment":
      return (
        <CommentEvent
          author={event.author as Actor}
          body={event.body}
          bodyHTML={event.bodyHTML}
          createdAt={event.createdAt}
          viewerCanUpdate={event.viewerCanUpdate}
          reactionGroups={event.reactionGroups ?? null}
          onToggleReaction={
            onToggleReaction
              ? (content, viewerHasReacted) =>
                  onToggleReaction(event.id, content, viewerHasReacted)
              : undefined
          }
          onEdit={
            onEditComment ? (body) => onEditComment(event.id, body) : undefined
          }
          accountId={accountId}
          owner={owner}
          repo={repo}
        />
      );

    case "PullRequestCommit":
      return (
        <CommitEvent
          commit={event.commit}
          onCommitClick={onCommitClick}
          accountId={accountId}
        />
      );

    case "PullRequestReview": {
      return (
        <ReviewEvent
          id={event.id}
          author={event.author as Actor}
          body={event.body}
          bodyHTML={event.bodyHTML}
          state={event.state}
          createdAt={event.createdAt}
          viewerCanUpdate={event.viewerCanUpdate}
          reactionGroups={event.reactionGroups as ReactionGroup[] | null}
          comments={extractReviewComments(event)}
          onToggleReaction={onToggleReaction}
          onEditReview={onEditReview}
          onEditReviewComment={onEditReviewComment}
          onCommitSuggestion={onCommitSuggestion}
          onAddSuggestionToBatch={onAddSuggestionToBatch}
          onRemoveSuggestionFromBatch={onRemoveSuggestionFromBatch}
          isSuggestionInBatch={isSuggestionInBatch}
          accountId={accountId}
          owner={owner}
          repo={repo}
        />
      );
    }

    case "LabeledEvent":
      return (
        <LabeledEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          label={event.label}
          action="added"
          accountId={accountId}
        />
      );

    case "UnlabeledEvent":
      return (
        <LabeledEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          label={event.label}
          action="removed"
          accountId={accountId}
        />
      );

    case "ClosedEvent":
      return (
        <ClosedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          stateReason={event.stateReason}
          isPullRequest={isPullRequest}
          accountId={accountId}
        />
      );

    case "ReopenedEvent":
      return (
        <ReopenedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          accountId={accountId}
        />
      );

    case "MergedEvent":
      return (
        <MergedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          mergeRefName={event.mergeRefName}
          accountId={accountId}
        />
      );

    case "LockedEvent":
      return (
        <LockedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          lockReason={event.lockReason}
          accountId={accountId}
        />
      );

    case "UnlockedEvent":
      return (
        <UnlockedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          accountId={accountId}
        />
      );

    case "AssignedEvent":
      return (
        <AssignedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          assignee={event.assignee}
          accountId={accountId}
        />
      );

    case "UnassignedEvent":
      return (
        <UnassignedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          assignee={event.assignee}
          accountId={accountId}
        />
      );

    case "MilestonedEvent":
      return (
        <MilestonedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          milestoneTitle={event.milestoneTitle}
          accountId={accountId}
        />
      );

    case "DemilestonedEvent":
      return (
        <DemilestonedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          milestoneTitle={event.milestoneTitle}
          accountId={accountId}
        />
      );

    case "RenamedTitleEvent":
      return (
        <RenamedTitleEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          previousTitle={event.previousTitle}
          currentTitle={event.currentTitle}
          accountId={accountId}
        />
      );

    case "CrossReferencedEvent":
      return (
        <CrossReferencedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          source={event.source}
          isCrossRepository={event.isCrossRepository}
          accountId={accountId}
        />
      );

    case "ReferencedEvent":
      return (
        <ReferencedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          commit={event.referencedCommit}
          isCrossRepository={event.isCrossRepository}
          accountId={accountId}
        />
      );

    case "ReviewRequestedEvent":
      return (
        <ReviewRequestedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          requestedReviewer={event.requestedReviewer}
          accountId={accountId}
        />
      );

    case "ReviewRequestRemovedEvent":
      return (
        <ReviewRequestRemovedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          requestedReviewer={event.requestedReviewer}
          accountId={accountId}
        />
      );

    case "ReviewDismissedEvent":
      return (
        <ReviewDismissedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          dismissalMessage={event.dismissalMessage}
          review={event.review}
          accountId={accountId}
        />
      );

    case "HeadRefForcePushedEvent":
      return (
        <HeadRefForcePushedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          beforeCommit={event.beforeCommit}
          afterCommit={event.afterCommit}
          accountId={accountId}
        />
      );

    case "HeadRefDeletedEvent":
      return (
        <HeadRefDeletedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          headRefName={event.headRefName}
          accountId={accountId}
        />
      );

    case "HeadRefRestoredEvent":
      return (
        <HeadRefRestoredEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          accountId={accountId}
        />
      );

    case "BaseRefChangedEvent":
      return (
        <BaseRefChangedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          previousRefName={event.previousRefName}
          currentRefName={event.currentRefName}
          accountId={accountId}
        />
      );

    case "BaseRefForcePushedEvent":
      return (
        <BaseRefForcePushedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          beforeCommit={event.beforeCommit}
          afterCommit={event.afterCommit}
          accountId={accountId}
        />
      );

    case "ConvertToDraftEvent":
      return (
        <ConvertToDraftEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          accountId={accountId}
        />
      );

    case "ReadyForReviewEvent":
      return (
        <ReadyForReviewEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          accountId={accountId}
        />
      );

    case "AutoMergeEnabledEvent":
      return (
        <AutoMergeEnabledEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          enabler={event.enabler}
          accountId={accountId}
        />
      );

    case "AutoMergeDisabledEvent":
      return (
        <AutoMergeDisabledEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          disabler={event.disabler}
          accountId={accountId}
        />
      );

    case "MarkedAsDuplicateEvent":
      return (
        <MarkedAsDuplicateEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          canonical={event.canonical}
          accountId={accountId}
        />
      );

    case "UnmarkedAsDuplicateEvent":
      return (
        <UnmarkedAsDuplicateEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          accountId={accountId}
        />
      );

    case "TransferredEvent":
      return (
        <TransferredEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          fromRepository={event.fromRepository}
          accountId={accountId}
        />
      );

    case "ConvertedToDiscussionEvent":
      return (
        <ConvertedToDiscussionEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          accountId={accountId}
        />
      );

    case "PinnedEvent":
      return (
        <PinnedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          accountId={accountId}
        />
      );

    case "UnpinnedEvent":
      return (
        <UnpinnedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          accountId={accountId}
        />
      );

    case "ConnectedEvent":
      return (
        <ConnectedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          subject={event.subject}
          accountId={accountId}
        />
      );

    case "DisconnectedEvent":
      return (
        <DisconnectedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          subject={event.subject}
          accountId={accountId}
        />
      );

    case "CommentDeletedEvent":
      return (
        <CommentDeletedEvent
          actor={event.actor as Actor}
          createdAt={event.createdAt}
          deletedCommentAuthor={event.deletedCommentAuthor}
          accountId={accountId}
        />
      );

    default:
      return (
        <UnknownEvent typename={(event as { __typename: string }).__typename} />
      );
  }
}
