import { GitHubLabel } from "@/components/github-label";
import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLogin } from "@/components/user-info";
import { TagIcon } from "@primer/octicons-react";
import { TimelineEventWrapper } from "./timeline-event-wrapper";
import { getActorAvatarUrl, getActorLogin, type Actor } from "./types";

interface LabeledEventProps {
  actor: Actor;
  createdAt: string;
  label: { name: string; color: string };
  action: "added" | "removed";
  accountId?: string;
}

export function LabeledEvent({
  actor,
  createdAt,
  label,
  action,
  accountId,
}: LabeledEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <TagIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}>
          <span>{login}</span>
        </UserLogin>
        <span>{action}</span>
        <GitHubLabel name={label.name} color={label.color} />
        <span className="text-muted-foreground">
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Grouped labels component
interface GroupedLabelsEventProps {
  actor: Actor;
  createdAt: string;
  labels: Array<{ name: string; color: string }>;
  action: "added" | "removed";
  accountId?: string;
}

export function GroupedLabelsEvent({
  actor,
  createdAt,
  labels,
  action,
  accountId,
}: GroupedLabelsEventProps) {
  const login = getActorLogin(actor);
  const avatarUrl = getActorAvatarUrl(actor);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 flex-wrap">
        <TagIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}>
          <span>{login}</span>
        </UserLogin>
        <span>{action}</span>
        {labels.map((label, index) => (
          <GitHubLabel key={index} name={label.name} color={label.color} />
        ))}
        <span className="text-muted-foreground">
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}
