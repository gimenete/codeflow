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
  const commitLink = onCommitClick ? (
    <button
      type="button"
      onClick={() => onCommitClick(commit.oid)}
      className="inline-flex items-center gap-2 hover:underline cursor-pointer"
    >
      <CommitHash sha={commit.oid} />
      <EmojiText className="truncate font-mono" text={firstLine} />
    </button>
  ) : (
    <>
      <CommitHash sha={commit.oid} />
      <EmojiText className="truncate flex-1 font-mono" text={firstLine} />
    </>
  );

  return (
    <TimelineEventWrapper>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground py-2">
        <GitCommitIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={login} accountId={accountId}><span>{login}</span></UserLogin>
        <span>added a commit:</span>
        {commitLink}
      </div>
    </TimelineEventWrapper>
  );
}
