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
  onCommitClick?: (sha: string) => void;
  accountId?: string;
}

export function CommitEvent({ commit, onCommitClick, accountId }: CommitEventProps) {
  const login = commit.author?.user?.login ?? commit.author?.name ?? "unknown";
  const avatarUrl = commit.author?.avatarUrl ?? "";
  const firstLine = commit.message.split("\n")[0];

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 min-w-0">
        <GitCommitIcon size={16} className="shrink-0" />
        <Avatar className="h-5 w-5 shrink-0">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}><span className="shrink-0">{login}</span></UserLogin>
        <span className="shrink-0">added a commit:</span>
        <CommitHash sha={commit.oid} className="shrink-0" />
        {onCommitClick ? (
          <button
            type="button"
            onClick={() => onCommitClick(commit.oid)}
            className="truncate font-mono hover:underline cursor-pointer min-w-0"
          >
            <EmojiText text={firstLine} />
          </button>
        ) : (
          <EmojiText className="truncate font-mono min-w-0" text={firstLine} />
        )}
      </div>
    </TimelineEventWrapper>
  );
}
