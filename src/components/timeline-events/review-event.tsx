import { HtmlRenderer } from "@/components/html-renderer";
import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckIcon, XIcon, CommentIcon } from "@primer/octicons-react";
import { getActorLogin, getActorAvatarUrl, type Actor } from "./types";
import type { PullRequestReviewState } from "@/generated/graphql";

interface ReviewEventProps {
  author: Actor;
  bodyHTML?: string | null;
  state: PullRequestReviewState;
  createdAt: string;
}

export function ReviewEvent({
  author,
  bodyHTML,
  state,
  createdAt,
}: ReviewEventProps) {
  const login = getActorLogin(author);
  const avatarUrl = getActorAvatarUrl(author);

  return (
    <div className="flex items-start gap-2 py-2">
      {state === "APPROVED" ? (
        <CheckIcon size={16} className="text-green-500 mt-0.5" />
      ) : state === "CHANGES_REQUESTED" ? (
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
            {state === "APPROVED"
              ? "approved these changes"
              : state === "CHANGES_REQUESTED"
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
  );
}
