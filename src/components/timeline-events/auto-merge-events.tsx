import { RelativeTime } from "@/components/relative-time";
import { UserLogin } from "@/components/user-info";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GitMergeQueueIcon } from "@primer/octicons-react";
import { TimelineEventWrapper } from "./timeline-event-wrapper";
import { getActorLogin, getActorAvatarUrl, type Actor } from "./types";

// Auto Merge Enabled Event
interface AutoMergeEnabledEventProps {
  actor: Actor;
  createdAt: string;
  enabler?: { login: string; avatarUrl: string } | null;
  accountId?: string;
}

export function AutoMergeEnabledEvent({
  actor,
  createdAt,
  accountId,
}: AutoMergeEnabledEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <GitMergeQueueIcon size={16} className="text-green-500" />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}><span>{login}</span></UserLogin>
        <span>enabled auto-merge</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Auto Merge Disabled Event
interface AutoMergeDisabledEventProps {
  actor: Actor;
  createdAt: string;
  disabler?: { login: string; avatarUrl: string } | null;
  accountId?: string;
}

export function AutoMergeDisabledEvent({
  actor,
  createdAt,
  accountId,
}: AutoMergeDisabledEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <GitMergeQueueIcon size={16} className="text-muted-foreground" />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}><span>{login}</span></UserLogin>
        <span>disabled auto-merge</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}
