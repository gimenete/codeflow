import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PersonAddIcon, PersonIcon } from "@primer/octicons-react";
import { TimelineEventWrapper } from "./timeline-event-wrapper";
import { getActorLogin, getActorAvatarUrl, type Actor } from "./types";

type Assignee =
  | { __typename?: "User"; login: string; avatarUrl: string }
  | { __typename?: "Bot"; login: string; avatarUrl: string }
  | { __typename?: "Mannequin"; login: string; avatarUrl: string }
  | { __typename?: "Organization" }
  | null
  | undefined;

interface AssignedEventProps {
  actor: Actor;
  createdAt: string;
  assignee: Assignee;
}

function getAssigneeInfo(assignee: Assignee): {
  login: string;
  avatarUrl: string;
} {
  if (!assignee) return { login: "unknown", avatarUrl: "" };
  if (assignee.__typename === "Organization") {
    return { login: "unknown", avatarUrl: "" };
  }
  // Now TypeScript knows assignee has login and avatarUrl
  if ("login" in assignee && "avatarUrl" in assignee) {
    return { login: assignee.login, avatarUrl: assignee.avatarUrl };
  }
  return { login: "unknown", avatarUrl: "" };
}

export function AssignedEvent({
  actor,
  createdAt,
  assignee,
}: AssignedEventProps) {
  const actorLogin = getActorLogin(actor);
  const actorAvatarUrl = getActorAvatarUrl(actor);
  const assigneeInfo = getAssigneeInfo(assignee);

  const isSelfAssign = actorLogin === assigneeInfo.login;

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <PersonAddIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={actorAvatarUrl} />
          <AvatarFallback>{actorLogin.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{actorLogin}</span>
        <span>
          {isSelfAssign
            ? "self-assigned this"
            : `assigned ${assigneeInfo.login}`}
        </span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

interface UnassignedEventProps {
  actor: Actor;
  createdAt: string;
  assignee: Assignee;
}

export function UnassignedEvent({
  actor,
  createdAt,
  assignee,
}: UnassignedEventProps) {
  const actorLogin = getActorLogin(actor);
  const actorAvatarUrl = getActorAvatarUrl(actor);
  const assigneeInfo = getAssigneeInfo(assignee);

  const isSelfUnassign = actorLogin === assigneeInfo.login;

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <PersonIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={actorAvatarUrl} />
          <AvatarFallback>{actorLogin.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span>{actorLogin}</span>
        <span>
          {isSelfUnassign
            ? "removed their assignment"
            : `unassigned ${assigneeInfo.login}`}
        </span>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}
