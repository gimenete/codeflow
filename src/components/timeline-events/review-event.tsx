import { HtmlRenderer } from "@/components/html-renderer";
import { Reactions, type ReactionGroup } from "@/components/reactions";
import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ReactionContent } from "@/generated/graphql";
import { PullRequestReviewState } from "@/generated/graphql";
import { CheckIcon, XIcon, CommentIcon } from "@primer/octicons-react";
import { getActorLogin, getActorAvatarUrl, type Actor } from "./types";
import { DiffHunk } from "./diff-hunk";

export interface ReviewComment {
  id: string;
  author: Actor;
  bodyHTML: string;
  createdAt: string;
  diffHunk: string;
  path: string;
  outdated: boolean;
  reactionGroups?: ReactionGroup[] | null;
}

interface ReviewEventProps {
  author: Actor;
  bodyHTML?: string | null;
  state: PullRequestReviewState;
  createdAt: string;
  comments?: ReviewComment[];
  onToggleReaction?: (
    subjectId: string,
    content: ReactionContent,
    viewerHasReacted: boolean,
  ) => void;
}

export function ReviewEvent({
  author,
  bodyHTML,
  state,
  createdAt,
  comments,
  onToggleReaction,
}: ReviewEventProps) {
  const login = getActorLogin(author);
  const avatarUrl = getActorAvatarUrl(author);
  const hasComments = comments && comments.length > 0;

  return (
    <div>
      <div className="flex items-start gap-2 py-2">
        {state === PullRequestReviewState.Approved ? (
          <CheckIcon size={16} className="text-green-500 mt-0.5" />
        ) : state === PullRequestReviewState.ChangesRequested ? (
          <XIcon size={16} className="text-red-500 mt-0.5" />
        ) : (
          <CommentIcon size={16} className="text-muted-foreground mt-0.5" />
        )}
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{login}</span>
            <span className="text-muted-foreground">
              {state === PullRequestReviewState.Approved
                ? "approved these changes"
                : state === PullRequestReviewState.ChangesRequested
                  ? "requested changes"
                  : "reviewed"}
            </span>
            <span className="text-muted-foreground">
              <RelativeTime date={createdAt} />
            </span>
          </div>
          {bodyHTML && (
            <div className="mt-2 prose prose-sm dark:prose-invert max-w-none">
              <HtmlRenderer html={bodyHTML} />
            </div>
          )}
        </div>
      </div>

      {hasComments && (
        <div className="ml-6 mt-2 space-y-3">
          {comments.map((comment) => (
            <ReviewCommentItem
              key={comment.id}
              comment={comment}
              onToggleReaction={onToggleReaction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCommentItem({
  comment,
  onToggleReaction,
}: {
  comment: ReviewComment;
  onToggleReaction?: (
    subjectId: string,
    content: ReactionContent,
    viewerHasReacted: boolean,
  ) => void;
}) {
  const login = getActorLogin(comment.author);
  const avatarUrl = getActorAvatarUrl(comment.author);

  return (
    <div className="group/comment border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{login}</span>
        <span className="text-sm text-muted-foreground">
          commented <RelativeTime date={comment.createdAt} />
        </span>
        {comment.outdated && (
          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
            outdated
          </span>
        )}
      </div>
      {comment.diffHunk && (
        <DiffHunk diffHunk={comment.diffHunk} path={comment.path} />
      )}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <HtmlRenderer html={comment.bodyHTML} />
      </div>
      {comment.reactionGroups && onToggleReaction && (
        <Reactions
          reactionGroups={comment.reactionGroups}
          onToggleReaction={(content, viewerHasReacted) =>
            onToggleReaction(comment.id, content, viewerHasReacted)
          }
        />
      )}
    </div>
  );
}
