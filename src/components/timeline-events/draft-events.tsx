import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLogin } from "@/components/user-info";
import { GitPullRequestDraftIcon, EyeIcon } from "@primer/octicons-react";
import { TimelineEventWrapper } from "./timeline-event-wrapper";
import { getActorLogin, getActorAvatarUrl, type Actor } from "./types";

// Convert to Draft Event
interface ConvertToDraftEventProps {
  actor: Actor;
  createdAt: string;
  accountId?: string;
}

export function ConvertToDraftEvent({
  actor,
  createdAt,
  accountId,
}: ConvertToDraftEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <GitPullRequestDraftIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}>
          <span>{login}</span>
        </UserLogin>
        <span>marked this pull request as draft</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Ready for Review Event
interface ReadyForReviewEventProps {
  actor: Actor;
  createdAt: string;
  accountId?: string;
}

export function ReadyForReviewEvent({
  actor,
  createdAt,
  accountId,
}: ReadyForReviewEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <EyeIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}>
          <span>{login}</span>
        </UserLogin>
        <span>marked this pull request as ready for review</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}
