import { CommitHash } from "@/components/commit-hash";
import { EmojiText } from "@/components/emoji-text";
import { UserLogin } from "@/components/user-info";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GitCommitIcon } from "@primer/octicons-react";
import { TimelineEventWrapper } from "./timeline-event-wrapper";

interface CommitEventProps {
  commit: {
    oid: string;
    message: string;
    author?: {
      name?: string | null;
      avatarUrl: string;
      user?: { login: string } | null;
    } | null;
    committedDate: string;
  };
  accountId?: string;
}

export function CommitEvent({ commit, accountId }: CommitEventProps) {
  const login = commit.author?.user?.login ?? commit.author?.name ?? "unknown";
  const avatarUrl = commit.author?.avatarUrl ?? "";

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <GitCommitIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}><span>{login}</span></UserLogin>
        <span>added a commit:</span>
        <CommitHash sha={commit.oid} />
        <EmojiText className="truncate flex-1 font-mono" text={commit.message.split("\n")[0]} />
      </div>
    </TimelineEventWrapper>
  );
}
