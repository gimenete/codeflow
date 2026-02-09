import { EmojiText } from "@/components/emoji-text";
import { GitHubLabel } from "@/components/github-label";
import { IssueStateIcon } from "@/components/issue-state-icon";
import { PullStateIcon } from "@/components/pull-state-icon";
import { PullStatusBadges } from "@/components/pull-status-badges";
import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Issue, PullRequest } from "@/lib/github-types";

export function SearchResultItemContent({
  item,
  isPR,
  accountId,
  owner,
  repo,
  isUnread,
  showRepository = false,
}: {
  item: PullRequest | Issue;
  isPR: boolean;
  accountId: string;
  owner: string;
  repo: string;
  isUnread: boolean;
  showRepository?: boolean;
}) {
  return (
    <div className="px-4 py-2 hover:bg-accent/50 transition-colors">
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-3 gap-y-0.5">
        {/* Icon */}
        <div className="shrink-0">
          {isPR ? (
            <PullStateIcon
              state={item.state}
              merged={item.state === "merged"}
              isDraft={(item as PullRequest).isDraft}
              size="sm"
            />
          ) : (
            <IssueStateIcon state={item.state} size="sm" />
          )}
        </div>

        {/* Title */}
        <div className="min-w-0 flex-1">
          <EmojiText
            className={isUnread ? "font-semibold" : "font-medium"}
            text={item.title}
          />
          <span className="text-muted-foreground ml-1">#{item.number}</span>
        </div>

        {/* Timestamp */}
        <span className="text-xs lg:text-sm text-muted-foreground shrink-0 lg:order-last lg:w-24 lg:text-right">
          <RelativeTime date={item.updatedAt} />
        </span>

        {/* Line break for small screens */}
        <div className="basis-full h-0 lg:hidden" />

        {/* Repository name (for account-level results) */}
        {showRepository && (
          <span className="text-xs lg:text-sm text-muted-foreground ml-6 lg:ml-0 lg:order-4 truncate lg:w-48">
            {item.repository}
          </span>
        )}

        {/* CI + Review badges */}
        {isPR && (
          <div className="ml-6 lg:ml-0 lg:order-2 shrink-0">
            <PullStatusBadges
              accountId={accountId}
              owner={owner}
              repo={repo}
              number={item.number}
            />
          </div>
        )}

        {/* Author */}
        <div className="flex items-center gap-1 ml-6 lg:ml-0 lg:order-3 flex-1 lg:flex-none lg:w-32 text-xs lg:text-sm text-muted-foreground">
          <Avatar className="h-4 w-4 lg:h-5 lg:w-5 shrink-0">
            <AvatarImage src={item.author.avatarUrl} />
            <AvatarFallback>
              {item.author.login.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{item.author.login}</span>
        </div>
      </div>

      {item.labels.length > 0 && (
        <div className="flex items-center gap-1 mt-1 ml-6">
          {item.labels.slice(0, 4).map((label) => (
            <GitHubLabel
              key={label.name}
              name={label.name}
              color={label.color}
            />
          ))}
          {item.labels.length > 4 && (
            <span className="text-xs text-muted-foreground">
              +{item.labels.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function SearchResultItemSkeleton() {
  return (
    <div className="px-4 py-2">
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-3 gap-y-0.5">
        {/* Icon */}
        <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
        {/* Title */}
        <Skeleton className="h-5 flex-1 min-w-0" />
        {/* Timestamp */}
        <Skeleton className="h-4 lg:h-5 w-16 shrink-0 lg:order-last lg:w-24" />

        {/* Line break for small screens */}
        <div className="basis-full h-0 lg:hidden" />

        {/* Repository */}
        <Skeleton className="h-4 lg:h-5 w-32 ml-6 lg:ml-0 lg:order-4 lg:w-48" />

        {/* Line break for small screens */}
        <div className="basis-full h-0 lg:hidden" />

        {/* CI + Approval */}
        <Skeleton className="h-4 lg:h-5 w-8 shrink-0 lg:order-2 lg:w-12" />

        {/* Author */}
        <div className="flex items-center gap-1 ml-6 lg:ml-0 lg:order-3 flex-1 lg:flex-none lg:w-32">
          <Skeleton className="h-4 w-4 lg:h-5 lg:w-5 shrink-0 rounded-full" />
          <Skeleton className="h-4 lg:h-5 w-16" />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1 ml-6">
        <Skeleton className="h-5 w-14 shrink-0" />
        <Skeleton className="h-5 w-16 shrink-0" />
      </div>
    </div>
  );
}
