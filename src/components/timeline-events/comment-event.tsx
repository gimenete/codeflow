import { HtmlRenderer } from "@/components/html-renderer";
import { Reactions, type ReactionGroup } from "@/components/reactions";
import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ReactionContent } from "@/generated/graphql";
import { getActorLogin, getActorAvatarUrl, type Actor } from "./types";

interface CommentEventProps {
  author: Actor;
  bodyHTML: string;
  createdAt: string;
  reactionGroups?: ReactionGroup[] | null;
  onToggleReaction?: (
    content: ReactionContent,
    viewerHasReacted: boolean,
  ) => void;
}

export function CommentEvent({
  author,
  bodyHTML,
  createdAt,
  reactionGroups,
  onToggleReaction,
}: CommentEventProps) {
  const login = getActorLogin(author);
  const avatarUrl = getActorAvatarUrl(author);

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
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <HtmlRenderer html={bodyHTML} />
      </div>
      {reactionGroups && onToggleReaction && (
        <Reactions
          reactionGroups={reactionGroups}
          onToggleReaction={onToggleReaction}
        />
      )}
    </div>
  );
}
