import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAccount } from "@/lib/auth";
import { fetchIssueOrPullMetadata } from "@/lib/github";
import { useAdjacentItems } from "@/lib/queries";
import type { DetailSearchParams } from "@/lib/search-params";

interface SearchNavigationProps {
  accountId: string;
  searchId: string;
  isPR: boolean;
  searchParams: DetailSearchParams;
}

export function SearchNavigation({
  accountId,
  searchId,
  isPR,
  searchParams,
}: SearchNavigationProps) {
  const { cursor, ...filters } = searchParams;
  const queryClient = useQueryClient();

  const { prev, next, isLoading } = useAdjacentItems(
    accountId,
    searchId,
    filters,
    cursor,
  );

  // Prefetch the next item's metadata when available
  useEffect(() => {
    if (!next) return;

    const account = getAccount(accountId);
    if (!account) return;

    queryClient.prefetchQuery({
      queryKey: [
        "github-metadata",
        accountId,
        next.owner,
        next.repo,
        next.number,
      ],
      queryFn: () =>
        fetchIssueOrPullMetadata(account, next.owner, next.repo, next.number),
      staleTime: 30000,
    });
  }, [next, accountId, queryClient]);

  // Don't render if no cursor (direct URL access)
  if (!cursor) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" disabled>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" disabled>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const detailRoute = isPR
    ? "/$account/$search/$owner/$repo/pull/$number"
    : "/$account/$search/$owner/$repo/issues/$number";

  return (
    <div className="flex items-center gap-1">
      {prev ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={detailRoute}
              params={{
                account: accountId,
                search: searchId,
                owner: prev.owner,
                repo: prev.repo,
                number: String(prev.number),
              }}
              search={{ ...filters, cursor: prev.cursor }}
            >
              <Button variant="ghost" size="icon-sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-64">
            <p className="text-sm truncate">{prev.title}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Button variant="ghost" size="icon-sm" disabled>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {next ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={detailRoute}
              params={{
                account: accountId,
                search: searchId,
                owner: next.owner,
                repo: next.repo,
                number: String(next.number),
              }}
              search={{ ...filters, cursor: next.cursor }}
            >
              <Button variant="ghost" size="icon-sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-64">
            <p className="text-sm truncate">{next.title}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Button variant="ghost" size="icon-sm" disabled>
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
