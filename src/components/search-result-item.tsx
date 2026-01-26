import { GitHubLabel } from "@/components/github-label";
import { IssueStateIcon } from "@/components/issue-state-icon";
import { PullStateIcon } from "@/components/pull-state-icon";
import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { usePRStatus } from "@/lib/github";
import type {
  PullRequest,
  ReviewDecision,
  StatusCheckRollupState,
} from "@/lib/github-types";
import type {
  SearchResultWithCursorItem,
  IssueWithCursor,
} from "@/lib/queries";
import type { SearchFilters } from "@/lib/search-params";
import { Link } from "@tanstack/react-router";
import {
  CheckIcon,
  ClockIcon,
  EyeIcon,
  FileDiffIcon,
  XIcon,
} from "@primer/octicons-react";
import { cn } from "@/lib/utils";
import { ciStatusColors, reviewStatusColors } from "@/lib/status-colors";

export interface SearchResultItemProps {
  item: SearchResultWithCursorItem | IssueWithCursor;
  accountId: string;
  searchId: string;
  isPR: boolean;
  urlFilters: SearchFilters;
}

export function SearchResultItem({
  item,
  accountId,
  searchId,
  isPR,
  urlFilters,
}: SearchResultItemProps) {
  const [owner, repo] = item.repository.split("/");

  // Build search params including cursor
  const searchParams = {
    ...urlFilters,
    cursor: item.cursor,
  };

  return (
    <Link
      to={
        isPR
          ? "/$account/$search/$owner/$repo/pull/$number"
          : "/$account/$search/$owner/$repo/issues/$number"
      }
      params={{
        account: accountId,
        search: searchId,
        owner,
        repo,
        number: String(item.number),
      }}
      search={searchParams}
      className="block px-4 py-2 hover:bg-accent/50 transition-colors"
    >
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-3 gap-y-0.5">
        {/* Icon - always first */}
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

        {/* Title - fills available space */}
        <div className="min-w-0 flex-1">
          <span className="font-medium" title={item.title}>
            {item.title}
          </span>
          <span className="text-muted-foreground ml-1">#{item.number}</span>
        </div>

        {/* Timestamp - end of line 1 on small, last column on large */}
        <span className="text-xs lg:text-sm text-muted-foreground shrink-0 lg:order-last lg:w-24 lg:text-right">
          <RelativeTime date={item.updatedAt} />
        </span>

        {/* Line break for small screens */}
        <div className="basis-full h-0 lg:hidden" />

        {/* Repository - line 2 on small, column on large */}
        <span className="text-sm lg:text-base text-muted-foreground ml-6 lg:ml-0 lg:order-4 lg:w-48 truncate">
          {item.repository}
        </span>

        {/* Line break for small screens */}
        <div className="basis-full h-0 lg:hidden" />

        {/* Author - start of line 3 on small, column on large */}
        <div className="flex items-center gap-1 ml-6 lg:ml-0 lg:order-2 flex-1 lg:flex-none lg:w-32 text-xs lg:text-sm text-muted-foreground">
          <Avatar className="h-4 w-4 lg:h-5 lg:w-5 shrink-0">
            <AvatarImage src={item.author.avatarUrl} />
            <AvatarFallback>
              {item.author.login.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{item.author.login}</span>
        </div>

        {/* CI + Approval - end of line 3 on small, column on large */}
        {isPR && (
          <div className="shrink-0 lg:order-3 lg:w-12 lg:justify-center flex">
            <PullStatusIndicator
              accountId={accountId}
              owner={owner}
              repo={repo}
              number={item.number}
            />
          </div>
        )}
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
    </Link>
  );
}

export function PullStatusIndicator({
  accountId,
  owner,
  repo,
  number,
}: {
  accountId: string;
  owner: string;
  repo: string;
  number: number;
}) {
  const { data: statusData } = usePRStatus(accountId, owner, repo, number);

  if (!statusData) return null;

  return (
    <div className="flex items-center gap-1 lg:gap-1.5">
      <div className="h-4 w-4 lg:h-5 lg:w-5 flex items-center justify-center">
        <CIStatusIcon status={statusData.statusCheckRollup} />
      </div>
      <div className="h-4 w-4 lg:h-5 lg:w-5 flex items-center justify-center">
        <ReviewStatusIcon status={statusData.reviewDecision} />
      </div>
    </div>
  );
}

export function CIStatusIcon({ status }: { status: StatusCheckRollupState }) {
  if (!status) return null;

  const baseClasses =
    "h-4 w-4 lg:h-5 lg:w-5 rounded-full flex items-center justify-center";

  switch (status) {
    case "SUCCESS":
      return (
        <span
          title="CI passed"
          className={cn(baseClasses, ciStatusColors.success)}
        >
          <CheckIcon size={12} className="text-white lg:hidden" />
          <CheckIcon size={14} className="text-white hidden lg:block" />
        </span>
      );
    case "FAILURE":
      return (
        <span
          title="CI failed"
          className={cn(baseClasses, ciStatusColors.failure)}
        >
          <XIcon size={12} className="text-white lg:hidden" />
          <XIcon size={14} className="text-white hidden lg:block" />
        </span>
      );
    case "PENDING":
    case "EXPECTED":
      return (
        <span
          title="CI pending"
          className={cn(baseClasses, ciStatusColors.pending)}
        >
          <ClockIcon size={12} className="text-white lg:hidden" />
          <ClockIcon size={14} className="text-white hidden lg:block" />
        </span>
      );
    default:
      return null;
  }
}

export function ReviewStatusIcon({ status }: { status: ReviewDecision }) {
  if (!status) return null;

  switch (status) {
    case "APPROVED":
      return (
        <span title="Approved" className={reviewStatusColors.approved}>
          <CheckIcon size={16} className="lg:hidden" />
          <CheckIcon size={20} className="hidden lg:block" />
        </span>
      );
    case "CHANGES_REQUESTED":
      return (
        <span
          title="Changes requested"
          className={reviewStatusColors.changesRequested}
        >
          <FileDiffIcon size={16} className="lg:hidden" />
          <FileDiffIcon size={20} className="hidden lg:block" />
        </span>
      );
    case "REVIEW_REQUIRED":
      return (
        <span
          title="Review required"
          className={reviewStatusColors.reviewRequired}
        >
          <EyeIcon size={16} className="lg:hidden" />
          <EyeIcon size={20} className="hidden lg:block" />
        </span>
      );
    default:
      return null;
  }
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

        {/* Author */}
        <div className="flex items-center gap-1 ml-6 lg:ml-0 lg:order-2 flex-1 lg:flex-none lg:w-32">
          <Skeleton className="h-4 w-4 lg:h-5 lg:w-5 shrink-0 rounded-full" />
          <Skeleton className="h-4 lg:h-5 w-16" />
        </div>

        {/* CI + Approval */}
        <Skeleton className="h-4 lg:h-5 w-8 shrink-0 lg:order-3 lg:w-12" />
      </div>
      <div className="flex items-center gap-1 mt-1 ml-6">
        <Skeleton className="h-5 w-14 shrink-0" />
        <Skeleton className="h-5 w-16 shrink-0" />
      </div>
    </div>
  );
}
