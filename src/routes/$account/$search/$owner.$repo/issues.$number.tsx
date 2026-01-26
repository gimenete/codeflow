import { DetailSkeleton } from "@/components/detail-components";
import { IssueStateIcon } from "@/components/issue-state-icon";
import { SearchNavigation } from "@/components/search-navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copyToClipboard, openInBrowser } from "@/lib/actions";
import { getAccount } from "@/lib/auth";
import {
  useBreadcrumbs,
  useAccountBreadcrumbDropdown,
  useSavedSearchBreadcrumbDropdown,
} from "@/lib/breadcrumbs";
import { useIssueMetadata } from "@/lib/github";
import { getQueryById } from "@/lib/queries";
import {
  detailSearchSchema,
  type DetailSearchParams,
} from "@/lib/search-params";
import { RepoIcon } from "@primer/octicons-react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Copy, ExternalLink, MoreHorizontal } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute(
  "/$account/$search/$owner/$repo/issues/$number",
)({
  validateSearch: (search: Record<string, unknown>): DetailSearchParams => {
    const result = detailSearchSchema.safeParse(search);
    return result.success ? result.data : {};
  },
  beforeLoad: ({ params }) => {
    const account = getAccount(params.account);
    if (!account) {
      throw redirect({ to: "/", search: { addAccount: false } });
    }
    return { account };
  },
  component: IssueDetail,
});

function IssueDetail() {
  const { account, search, owner, repo, number } = Route.useParams();
  const searchParams = Route.useSearch();
  const { account: accountData } = Route.useRouteContext();
  const query = getQueryById(account, search);
  const accountDropdownItems = useAccountBreadcrumbDropdown();
  const savedSearchDropdownItems = useSavedSearchBreadcrumbDropdown(account);

  const { data, isLoading, error } = useIssueMetadata(
    account,
    owner,
    repo,
    parseInt(number),
  );

  const breadcrumbs = useMemo(
    () => [
      {
        label: `@${accountData.login}`,
        href: `/${account}`,
        dropdown: { items: accountDropdownItems },
      },
      {
        label: query?.name ?? search,
        href: `/${account}/${search}`,
        dropdown: { items: savedSearchDropdownItems },
      },
    ],
    [
      accountData.login,
      account,
      accountDropdownItems,
      query?.name,
      search,
      savedSearchDropdownItems,
    ],
  );

  useBreadcrumbs(breadcrumbs);

  return (
    <>
      {isLoading ? (
        <DetailSkeleton />
      ) : error || !data ? (
        <div className="container mx-auto py-6 px-4">
          <p className="text-destructive">
            Error: {error?.message ?? "Not found"}
          </p>
        </div>
      ) : (
        <>
          {/* Header for issue */}
          <div className="bg-background shrink-0">
            <div className="border-b px-4 py-3 space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <IssueStateIcon state={data.state} />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-semibold">
                    {data.title}{" "}
                    <span className="text-muted-foreground font-normal">
                      #{data.number}
                    </span>
                  </h1>
                  <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                    <RepoIcon size={14} />
                    <span>{data.repository}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 self-start ml-auto">
                  <SearchNavigation
                    accountId={account}
                    searchId={search}
                    isPR={false}
                    searchParams={searchParams}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          copyToClipboard(
                            `https://${accountData.host}/${owner}/${repo}/issues/${number}`,
                          )
                        }
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy GitHub URL
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          openInBrowser(
                            `https://${accountData.host}/${owner}/${repo}/issues/${number}`,
                          )
                        }
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in GitHub
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      <Outlet />
    </>
  );
}
