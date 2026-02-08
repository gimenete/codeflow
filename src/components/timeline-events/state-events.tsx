import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLogin } from "@/components/user-info";
import {
  GitMergeIcon,
  GitPullRequestClosedIcon,
  IssueClosedIcon,
  IssueReopenedIcon,
  LockIcon,
  UnlockIcon,
} from "@primer/octicons-react";
import { TimelineEventWrapper } from "./timeline-event-wrapper";
import { getActorLogin, getActorAvatarUrl, type Actor } from "./types";
import type { IssueStateReason, LockReason } from "@/generated/graphql";

// Closed Event
interface ClosedEventProps {
  actor: Actor;
  createdAt: string;
  stateReason?: IssueStateReason | null;
  isPullRequest?: boolean;
  accountId?: string;
}

export function ClosedEvent({
  actor,
  createdAt,
  stateReason,
  isPullRequest,
  accountId,
}: ClosedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  const reason = stateReason
    ? ` as ${stateReason.toLowerCase().replace("_", " ")}`
    : "";

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        {isPullRequest ? (
          <GitPullRequestClosedIcon size={16} className="text-red-500" />
        ) : (
          <IssueClosedIcon size={16} className="text-purple-500" />
        )}
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}>
          <span>{login}</span>
        </UserLogin>
        <span>closed this{reason}</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Reopened Event
interface ReopenedEventProps {
  actor: Actor;
  createdAt: string;
  accountId?: string;
}

export function ReopenedEvent({
  actor,
  createdAt,
  accountId,
}: ReopenedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <IssueReopenedIcon size={16} className="text-green-500" />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}>
          <span>{login}</span>
        </UserLogin>
        <span>reopened this</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Merged Event
interface MergedEventProps {
  actor: Actor;
  createdAt: string;
  mergeRefName?: string;
  accountId?: string;
}

export function MergedEvent({
  actor,
  createdAt,
  mergeRefName,
  accountId,
}: MergedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <GitMergeIcon size={16} className="text-purple-500" />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}>
          <span>{login}</span>
        </UserLogin>
        <span>merged this{mergeRefName ? ` into ${mergeRefName}` : ""}</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Locked Event
interface LockedEventProps {
  actor: Actor;
  createdAt: string;
  lockReason?: LockReason | null;
  accountId?: string;
}

export function LockedEvent({
  actor,
  createdAt,
  lockReason,
  accountId,
}: LockedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  const reason = lockReason
    ? ` as ${lockReason.toLowerCase().replace("_", " ")}`
    : "";

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <LockIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}>
          <span>{login}</span>
        </UserLogin>
        <span>locked this conversation{reason}</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Unlocked Event
interface UnlockedEventProps {
  actor: Actor;
  createdAt: string;
  accountId?: string;
}

export function UnlockedEvent({
  actor,
  createdAt,
  accountId,
}: UnlockedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <UnlockIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}>
          <span>{login}</span>
        </UserLogin>
        <span>unlocked this conversation</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}
