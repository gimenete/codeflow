import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  IssueOpenedIcon,
  GitPullRequestIcon,
  CommentDiscussionIcon,
  CopyIcon,
  PinIcon,
  LinkIcon,
  TrashIcon,
  MentionIcon,
  ArrowSwitchIcon,
} from "@primer/octicons-react";
import { TimelineEventWrapper } from "./timeline-event-wrapper";
import { getActorLogin, getActorAvatarUrl, type Actor } from "./types";

// Marked as Duplicate Event
interface MarkedAsDuplicateEventProps {
  actor: Actor;
  createdAt: string;
  canonical?:
    | {
        __typename?: "Issue";
        number: number;
        title: string;
        repository: { nameWithOwner: string };
      }
    | {
        __typename?: "PullRequest";
        number: number;
        title: string;
        repository: { nameWithOwner: string };
      }
    | null;
}

export function MarkedAsDuplicateEvent({
  actor,
  createdAt,
  canonical,
}: MarkedAsDuplicateEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 flex-wrap">
        <CopyIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>marked this as a duplicate of</span>
        {canonical && (
          <>
            {canonical.__typename === "PullRequest" ? (
              <GitPullRequestIcon size={16} />
            ) : (
              <IssueOpenedIcon size={16} />
            )}
            <span className="font-medium">
              {canonical.repository.nameWithOwner}#{canonical.number}
            </span>
          </>
        )}
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Unmarked as Duplicate Event
interface UnmarkedAsDuplicateEventProps {
  actor: Actor;
  createdAt: string;
}

export function UnmarkedAsDuplicateEvent({
  actor,
  createdAt,
}: UnmarkedAsDuplicateEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <CopyIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>unmarked this as a duplicate</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Transferred Event
interface TransferredEventProps {
  actor: Actor;
  createdAt: string;
  fromRepository?: { nameWithOwner: string } | null;
}

export function TransferredEvent({
  actor,
  createdAt,
  fromRepository,
}: TransferredEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <ArrowSwitchIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>transferred this</span>
        {fromRepository && (
          <>
            <span>from</span>
            <span className="font-medium">{fromRepository.nameWithOwner}</span>
          </>
        )}
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Converted to Discussion Event
interface ConvertedToDiscussionEventProps {
  actor: Actor;
  createdAt: string;
}

export function ConvertedToDiscussionEvent({
  actor,
  createdAt,
}: ConvertedToDiscussionEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <CommentDiscussionIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>converted this issue to a discussion</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Pinned Event
interface PinnedEventProps {
  actor: Actor;
  createdAt: string;
}

export function PinnedEvent({ actor, createdAt }: PinnedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <PinIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>pinned this issue</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Unpinned Event
interface UnpinnedEventProps {
  actor: Actor;
  createdAt: string;
}

export function UnpinnedEvent({ actor, createdAt }: UnpinnedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <PinIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>unpinned this issue</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Connected Event
interface ConnectedEventProps {
  actor: Actor;
  createdAt: string;
  subject?:
    | {
        __typename?: "Issue";
        number: number;
        title: string;
        repository: { nameWithOwner: string };
      }
    | {
        __typename?: "PullRequest";
        number: number;
        title: string;
        repository: { nameWithOwner: string };
      }
    | null;
}

export function ConnectedEvent({
  actor,
  createdAt,
  subject,
}: ConnectedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 flex-wrap">
        <LinkIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>linked</span>
        {subject && (
          <>
            {subject.__typename === "PullRequest" ? (
              <GitPullRequestIcon size={16} />
            ) : (
              <IssueOpenedIcon size={16} />
            )}
            <span className="font-medium">
              {subject.repository.nameWithOwner}#{subject.number}
            </span>
          </>
        )}
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Disconnected Event
interface DisconnectedEventProps {
  actor: Actor;
  createdAt: string;
  subject?:
    | {
        __typename?: "Issue";
        number: number;
        title: string;
        repository: { nameWithOwner: string };
      }
    | {
        __typename?: "PullRequest";
        number: number;
        title: string;
        repository: { nameWithOwner: string };
      }
    | null;
}

export function DisconnectedEvent({
  actor,
  createdAt,
  subject,
}: DisconnectedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 flex-wrap">
        <LinkIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>unlinked</span>
        {subject && (
          <>
            {subject.__typename === "PullRequest" ? (
              <GitPullRequestIcon size={16} />
            ) : (
              <IssueOpenedIcon size={16} />
            )}
            <span className="font-medium">
              {subject.repository.nameWithOwner}#{subject.number}
            </span>
          </>
        )}
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Comment Deleted Event
interface CommentDeletedEventProps {
  actor: Actor;
  createdAt: string;
  deletedCommentAuthor?: { login: string } | null;
}

export function CommentDeletedEvent({
  actor,
  createdAt,
  deletedCommentAuthor,
}: CommentDeletedEventProps) {
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
        <span>deleted a comment</span>
        {deletedCommentAuthor && (
          <>
            <span>from</span>
            <span className="font-medium">{deletedCommentAuthor.login}</span>
          </>
        )}
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Mentioned Event
interface MentionedEventProps {
  actor: Actor;
  createdAt: string;
}

export function MentionedEvent({ actor, createdAt }: MentionedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <MentionIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>was mentioned</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}
