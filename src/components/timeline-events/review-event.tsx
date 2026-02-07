import { useState, useEffect, useCallback } from "react";
import { AlertCircle, PencilIcon, LoaderCircleIcon } from "lucide-react";
import { HtmlRenderer } from "@/components/html-renderer";
import { GitHubCommentTextarea } from "@/components/github-comment-textarea";
import { Reactions, type ReactionGroup } from "@/components/reactions";
import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ReactionContent } from "@/generated/graphql";
import { PullRequestReviewState } from "@/generated/graphql";
import { CheckIcon, XIcon, CommentIcon } from "@primer/octicons-react";
import {
  toggleCheckboxInMarkdown,
  toggleCheckboxInHtml,
} from "@/lib/checkbox-utils";
import { getActorLogin, getActorAvatarUrl, type Actor } from "./types";
import { DiffHunk } from "./diff-hunk";

export interface ReviewComment {
  id: string;
  author: Actor;
  body?: string;
  bodyHTML: string;
  createdAt: string;
  viewerCanUpdate?: boolean;
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
  onEditReviewComment?: (
    commentId: string,
    body: string,
  ) => Promise<void>;
  accountId?: string;
  owner?: string;
  repo?: string;
}

export function ReviewEvent({
  author,
  bodyHTML,
  state,
  createdAt,
  comments,
  onToggleReaction,
  onEditReviewComment,
  accountId,
  owner,
  repo,
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
              onEdit={
                onEditReviewComment
                  ? (body) => onEditReviewComment(comment.id, body)
                  : undefined
              }
              accountId={accountId}
              owner={owner}
              repo={repo}
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
  onEdit,
  accountId,
  owner,
  repo,
}: {
  comment: ReviewComment;
  onToggleReaction?: (
    subjectId: string,
    content: ReactionContent,
    viewerHasReacted: boolean,
  ) => void;
  onEdit?: (body: string) => Promise<void>;
  accountId?: string;
  owner?: string;
  repo?: string;
}) {
  const login = getActorLogin(comment.author);
  const avatarUrl = getActorAvatarUrl(comment.author);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticHtml, setOptimisticHtml] = useState<string | null>(null);
  const [isTogglingCheckbox, setIsTogglingCheckbox] = useState(false);

  const canEdit =
    comment.viewerCanUpdate && onEdit && accountId && owner && repo;

  // Clear optimistic state when server HTML updates
  useEffect(() => {
    setOptimisticHtml(null);
  }, [comment.bodyHTML]);

  const handleCheckboxToggle = useCallback(
    async (index: number, checked: boolean) => {
      if (!comment.body || !onEdit) return;

      // Optimistic update
      setOptimisticHtml(
        toggleCheckboxInHtml(
          optimisticHtml ?? comment.bodyHTML,
          index,
          checked,
        ),
      );
      setIsTogglingCheckbox(true);

      try {
        const newBody = toggleCheckboxInMarkdown(
          comment.body,
          index,
          checked,
        );
        await onEdit(newBody);
      } catch {
        setOptimisticHtml(null);
      } finally {
        setIsTogglingCheckbox(false);
      }
    },
    [comment.body, comment.bodyHTML, optimisticHtml, onEdit],
  );

  const handleStartEdit = () => {
    setEditBody(comment.body ?? "");
    setError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditBody("");
    setError(null);
  };

  const handleSubmitEdit = async () => {
    if (!onEdit || !editBody.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onEdit(editBody.trim());
      setIsEditing(false);
      setEditBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update comment");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        {canEdit && !isEditing && (
          <div
            className={`ml-auto flex items-center gap-1 transition-opacity ${isTogglingCheckbox ? "opacity-100" : "opacity-0 group-hover/comment:opacity-100"}`}
          >
            {isTogglingCheckbox && (
              <LoaderCircleIcon className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
            )}
            <button
              onClick={handleStartEdit}
              className="p-1 rounded hover:bg-muted"
              title="Edit comment"
            >
              <PencilIcon className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>
      {comment.diffHunk && (
        <DiffHunk diffHunk={comment.diffHunk} path={comment.path} />
      )}
      {isEditing && accountId && owner && repo ? (
        <div className="space-y-3">
          <GitHubCommentTextarea
            value={editBody}
            onChange={setEditBody}
            accountId={accountId}
            owner={owner}
            repo={repo}
            onSubmit={handleSubmitEdit}
            className="min-h-[100px] resize-y"
          />
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitEdit}
              disabled={!editBody.trim() || isSubmitting}
            >
              Update comment
            </Button>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <HtmlRenderer
            html={optimisticHtml ?? comment.bodyHTML}
            onCheckboxToggle={canEdit ? handleCheckboxToggle : undefined}
          />
        </div>
      )}
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
