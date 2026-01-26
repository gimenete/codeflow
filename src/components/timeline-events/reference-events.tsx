import { RelativeTime } from "@/components/relative-time";
import { CommitHash } from "@/components/commit-hash";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CrossReferenceIcon,
  GitCommitIcon,
  IssueOpenedIcon,
  GitPullRequestIcon,
} from "@primer/octicons-react";
import { TimelineEventWrapper } from "./timeline-event-wrapper";
import { getActorLogin, getActorAvatarUrl, type Actor } from "./types";

// Cross-referenced Event
interface CrossReferencedEventProps {
  actor: Actor;
  createdAt: string;
  source:
    | {
        __typename?: "Issue";
        number: number;
        title: string;
        issueState: string;
        repository: { nameWithOwner: string };
      }
    | {
        __typename?: "PullRequest";
        number: number;
        title: string;
        prState: string;
        repository: { nameWithOwner: string };
      }
    | null
    | undefined;
  isCrossRepository: boolean;
}

export function CrossReferencedEvent({
  actor,
  createdAt,
  source,
  isCrossRepository,
}: CrossReferencedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  if (!source) return null;

  const isPR = source.__typename === "PullRequest";
  const state = isPR
    ? (source as { prState: string }).prState
    : (source as { issueState: string }).issueState;
  const isOpen = state === "OPEN";

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 flex-wrap">
        <CrossReferenceIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>mentioned this in</span>
        {isPR ? (
          <GitPullRequestIcon
            size={16}
            className={isOpen ? "text-green-500" : "text-purple-500"}
          />
        ) : (
          <IssueOpenedIcon
            size={16}
            className={isOpen ? "text-green-500" : "text-purple-500"}
          />
        )}
        <span className="font-medium">
          {isCrossRepository
            ? `${source.repository.nameWithOwner}#${source.number}`
            : `#${source.number}`}
        </span>
        <span className="truncate">{source.title}</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Referenced Event
interface ReferencedEventProps {
  actor: Actor;
  createdAt: string;
  commit?: { oid: string; message: string } | null;
  isCrossRepository: boolean;
}

export function ReferencedEvent({
  actor,
  createdAt,
  commit,
  isCrossRepository,
}: ReferencedEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <GitCommitIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>referenced this</span>
        {commit && (
          <>
            <span>in commit</span>
            <CommitHash sha={commit.oid} />
            <span className="truncate font-mono">
              {commit.message.split("\n")[0]}
            </span>
          </>
        )}
        {isCrossRepository && <span>(from another repository)</span>}
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Renamed Title Event
interface RenamedTitleEventProps {
  actor: Actor;
  createdAt: string;
  previousTitle: string;
  currentTitle: string;
}

export function RenamedTitleEvent({
  actor,
  createdAt,
  previousTitle,
  currentTitle,
}: RenamedTitleEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 flex-wrap">
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{login}</span>
        <span>changed the title</span>
        <span className="line-through">{previousTitle}</span>
        <span className="font-medium">{currentTitle}</span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}
