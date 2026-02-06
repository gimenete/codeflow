import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { GitHubCommentTextarea } from "@/components/github-comment-textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getAccount } from "@/lib/auth";

interface CommentFormProps {
  accountId: string;
  owner: string;
  repo: string;
  state: "open" | "closed";
  merged?: boolean;
  isPR: boolean;
  viewerCanUpdate: boolean;
  onSubmitComment: (body: string) => Promise<void>;
  onChangeState: (state: "open" | "closed") => Promise<void>;
  onCommentAndChangeState: (
    body: string,
    state: "open" | "closed",
  ) => Promise<void>;
}

export function CommentForm({
  accountId,
  owner,
  repo,
  state,
  merged,
  viewerCanUpdate,
  onSubmitComment,
  onChangeState,
  onCommentAndChangeState,
}: CommentFormProps) {
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasBody = body.trim().length > 0;

  const handleSubmitComment = async () => {
    if (!hasBody) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmitComment(body.trim());
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeState = async (newState: "open" | "closed") => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (hasBody) {
        await onCommentAndChangeState(body.trim(), newState);
        setBody("");
      } else {
        await onChangeState(newState);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update state");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canReopen = viewerCanUpdate && state === "closed" && !merged;
  const canClose = viewerCanUpdate && state === "open";
  const account = getAccount(accountId);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarImage src={account?.avatarUrl} />
          <AvatarFallback>
            {(account?.login ?? "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <GitHubCommentTextarea
            value={body}
            onChange={setBody}
            accountId={accountId}
            owner={owner}
            repo={repo}
            onSubmit={handleSubmitComment}
            placeholder="Leave a comment..."
            className="min-h-[100px] resize-y"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {canClose && (
          <Button
            variant="outline"
            onClick={() => handleChangeState("closed")}
            disabled={isSubmitting}
          >
            {hasBody ? "Close with comment" : "Close"}
          </Button>
        )}

        {canReopen && (
          <Button
            variant="outline"
            onClick={() => handleChangeState("open")}
            disabled={isSubmitting}
          >
            {hasBody ? "Reopen with comment" : "Reopen"}
          </Button>
        )}

        <Button
          onClick={handleSubmitComment}
          disabled={!hasBody || isSubmitting}
        >
          Comment
        </Button>
      </div>
    </div>
  );
}
