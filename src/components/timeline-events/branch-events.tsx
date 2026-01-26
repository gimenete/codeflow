import { RelativeTime } from "@/components/relative-time";
import { CommitHash } from "@/components/commit-hash";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  GitBranchIcon,
  RepoForkedIcon,
  ArrowRightIcon,
  TrashIcon,
  HistoryIcon,
} from "@primer/octicons-react";
import { TimelineEventWrapper } from "./timeline-event-wrapper";
import { getActorLogin, getActorAvatarUrl, type Actor } from "./types";

// Head Ref Force Pushed Event
interface HeadRefForcePushedEventProps {
  actor: Actor;
  createdAt: string;
  beforeCommit?: { oid: string; abbreviatedOid: string } | null;
  afterCommit?: { oid: string; abbreviatedOid: string } | null;
}

export function HeadRefForcePushedEvent({
  actor,
  createdAt,
  beforeCommit,
  afterCommit,
}: HeadRefForcePushedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <RepoForkedIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>force-pushed the branch</span>
        {beforeCommit && afterCommit && (
          <>
            <CommitHash sha={beforeCommit.oid} />
            <ArrowRightIcon size={12} />
            <CommitHash sha={afterCommit.oid} />
          </>
        )}
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Head Ref Deleted Event
interface HeadRefDeletedEventProps {
  actor: Actor;
  createdAt: string;
  headRefName?: string;
}

export function HeadRefDeletedEvent({
  actor,
  createdAt,
  headRefName,
}: HeadRefDeletedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <TrashIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>deleted the</span>
        {headRefName && (
          <code className="bg-muted px-1 rounded text-xs">{headRefName}</code>
        )}
        <span>branch</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Head Ref Restored Event
interface HeadRefRestoredEventProps {
  actor: Actor;
  createdAt: string;
}

export function HeadRefRestoredEvent({
  actor,
  createdAt,
}: HeadRefRestoredEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <HistoryIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>restored the head branch</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Base Ref Changed Event
interface BaseRefChangedEventProps {
  actor: Actor;
  createdAt: string;
  previousRefName?: string | null;
  currentRefName?: string | null;
}

export function BaseRefChangedEvent({
  actor,
  createdAt,
  previousRefName,
  currentRefName,
}: BaseRefChangedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <GitBranchIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>changed the base branch from</span>
        {previousRefName && (
          <code className="bg-muted px-1 rounded text-xs">
            {previousRefName}
          </code>
        )}
        <span>to</span>
        {currentRefName && (
          <code className="bg-muted px-1 rounded text-xs">
            {currentRefName}
          </code>
        )}
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Base Ref Force Pushed Event
interface BaseRefForcePushedEventProps {
  actor: Actor;
  createdAt: string;
  beforeCommit?: { oid: string; abbreviatedOid: string } | null;
  afterCommit?: { oid: string; abbreviatedOid: string } | null;
}

export function BaseRefForcePushedEvent({
  actor,
  createdAt,
  beforeCommit,
  afterCommit,
}: BaseRefForcePushedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <RepoForkedIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>force-pushed the base branch</span>
        {beforeCommit && afterCommit && (
          <>
            <CommitHash sha={beforeCommit.oid} />
            <ArrowRightIcon size={12} />
            <CommitHash sha={afterCommit.oid} />
          </>
        )}
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}
