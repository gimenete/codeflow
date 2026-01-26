import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MilestoneIcon } from "@primer/octicons-react";
import { TimelineEventWrapper } from "./timeline-event-wrapper";
import { getActorLogin, getActorAvatarUrl, type Actor } from "./types";

interface MilestonedEventProps {
  actor: Actor;
  createdAt: string;
  milestoneTitle: string;
}

export function MilestonedEvent({
  actor,
  createdAt,
  milestoneTitle,
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
        <span>{login}</span>
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
}

export function DemilestonedEvent({
  actor,
  createdAt,
  milestoneTitle,
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
        <span>{login}</span>
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
