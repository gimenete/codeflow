import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLogin } from "@/components/user-info";
import { MilestoneIcon } from "@primer/octicons-react";
import { TimelineEventWrapper } from "./timeline-event-wrapper";
import { getActorLogin, getActorAvatarUrl, type Actor } from "./types";

interface MilestonedEventProps {
  actor: Actor;
  createdAt: string;
  milestoneTitle: string;
  accountId?: string;
}

export function MilestonedEvent({
  actor,
  createdAt,
  milestoneTitle,
  accountId,
}: MilestonedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <MilestoneIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}>
          <span>{login}</span>
        </UserLogin>
        <span>added this to the</span>
        <span className="font-medium">{milestoneTitle}</span>
        <span>milestone</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

interface DemilestonedEventProps {
  actor: Actor;
  createdAt: string;
  milestoneTitle: string;
  accountId?: string;
}

export function DemilestonedEvent({
  actor,
  createdAt,
  milestoneTitle,
  accountId,
}: DemilestonedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <MilestoneIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}>
          <span>{login}</span>
        </UserLogin>
        <span>removed this from the</span>
        <span className="font-medium">{milestoneTitle}</span>
        <span>milestone</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}
