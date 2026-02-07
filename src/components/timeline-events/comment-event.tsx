import { useState, useEffect, useCallback } from "react";
import { AlertCircle, PencilIcon, LoaderCircleIcon } from "lucide-react";
import { HtmlRenderer } from "@/components/html-renderer";
import { GitHubCommentTextarea } from "@/components/github-comment-textarea";
import { Reactions, type ReactionGroup } from "@/components/reactions";
import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ReactionContent } from "@/generated/graphql";
import {
  toggleCheckboxInMarkdown,
  toggleCheckboxInHtml,
} from "@/lib/checkbox-utils";
import { getActorLogin, getActorAvatarUrl, type Actor } from "./types";

interface CommentEventProps {
  author: Actor;
  body?: string;
  bodyHTML: string;
  createdAt: string;
  viewerCanUpdate?: boolean;
  reactionGroups?: ReactionGroup[] | null;
  onToggleReaction?: (
    content: ReactionContent,
    viewerHasReacted: boolean,
  ) => void;
  onEdit?: (body: string) => Promise<void>;
  accountId?: string;
  owner?: string;
  repo?: string;
}

export function CommentEvent({
  author,
  body,
  bodyHTML,
  createdAt,
  viewerCanUpdate,
  reactionGroups,
  onToggleReaction,
  onEdit,
  accountId,
  owner,
  repo,
}: CommentEventProps) {
  const login = getActorLogin(author);
  const avatarUrl = getActorAvatarUrl(author);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticHtml, setOptimisticHtml] = useState<string | null>(null);
  const [isTogglingCheckbox, setIsTogglingCheckbox] = useState(false);

  const canEdit = viewerCanUpdate && onEdit && accountId && owner && repo;

  // Clear optimistic state when server HTML updates
  useEffect(() => {
    setOptimisticHtml(null);
  }, [bodyHTML]);

  const handleCheckboxToggle = useCallback(
    async (index: number, checked: boolean) => {
      if (!body || !onEdit) return;

      // Optimistic update
      setOptimisticHtml(
        toggleCheckboxInHtml(optimisticHtml ?? bodyHTML, index, checked),
      );
      setIsTogglingCheckbox(true);

      try {
        const newBody = toggleCheckboxInMarkdown(body, index, checked);
        await onEdit(newBody);
      } catch {
        setOptimisticHtml(null);
      } finally {
        setIsTogglingCheckbox(false);
      }
    },
    [body, bodyHTML, optimisticHtml, onEdit],
  );

  const handleStartEdit = () => {
    setEditBody(body ?? "");
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
          commented <RelativeTime date={createdAt} />
        </span>
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
            html={optimisticHtml ?? bodyHTML}
            onCheckboxToggle={canEdit ? handleCheckboxToggle : undefined}
          />
        </div>
      )}
      {reactionGroups && onToggleReaction && (
        <Reactions
          reactionGroups={reactionGroups}
          onToggleReaction={onToggleReaction}
        />
      )}
    </div>
  );
}
