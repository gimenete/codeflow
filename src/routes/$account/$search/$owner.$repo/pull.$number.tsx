import { Branch } from "@/components/branch";
import { DetailSkeleton } from "@/components/detail-components";
import { PullStateIcon } from "@/components/pull-state-icon";
import { SearchNavigation } from "@/components/search-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copyToClipboard, openInBrowser } from "@/lib/actions";
import { getAccount } from "@/lib/auth";
import {
  useBreadcrumbs,
  useAccountBreadcrumbDropdown,
  useSavedSearchBreadcrumbDropdown,
} from "@/lib/breadcrumbs";
import { usePullMetadata } from "@/lib/github";
import { getQueryById } from "@/lib/queries";
import {
  detailSearchSchema,
  type DetailSearchParams,
} from "@/lib/search-params";
import { GitCommitIcon, RepoIcon } from "@primer/octicons-react";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import {
  Copy,
  ExternalLink,
  FileText,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute(
  "/$account/$search/$owner/$repo/pull/$number",
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
  component: PullRequestDetail,
});

function PullRequestDetail() {
  const { account, search, owner, repo, number } = Route.useParams();
  const searchParams = Route.useSearch();
  const { account: accountData } = Route.useRouteContext();
  const location = useLocation();
  const query = getQueryById(account, search);
  const accountDropdownItems = useAccountBreadcrumbDropdown();
  const savedSearchDropdownItems = useSavedSearchBreadcrumbDropdown(account);

  const { data, isLoading, error } = usePullMetadata(
    account,
    owner,
    repo,
    parseInt(number),
  );

  const activeTab = location.pathname.endsWith("/commits")
    ? "commits"
    : location.pathname.endsWith("/files")
      ? "files"
      : "conversation";

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
      owner,
      repo,
      number,
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
          {/* Sticky container for header + tabs */}
          <div className="bg-background shrink-0">
            <div className="border-b px-4 py-3 space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <PullStateIcon
                    state={data.state}
                    merged={data.merged}
                    isDraft={data.isDraft}
                  />
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

                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Branch name={data.baseRef} />
                      <span>&larr;</span>
                      <Branch name={data.headRef} />
                    </div>
                    <span>
                      <span className="text-green-600">+{data.additions}</span>
                      {" / "}
                      <span className="text-red-600">-{data.deletions}</span>
                    </span>
                    <span>{data.changedFiles} files changed</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 self-start ml-auto">
                  <SearchNavigation
                    accountId={account}
                    searchId={search}
                    isPR={true}
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
                            `https://${accountData.host}/${owner}/${repo}/pull/${number}`,
                          )
                        }
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy GitHub URL
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          openInBrowser(
                            `https://${accountData.host}/${owner}/${repo}/pull/${number}`,
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

            <Tabs value={activeTab}>
              <TabsList className="w-full rounded-none border-b justify-start">
                <Link
                  to="/$account/$search/$owner/$repo/pull/$number"
                  params={{ account, search, owner, repo, number }}
                >
                  <TabsTrigger value="conversation" className="gap-1">
                    <MessageSquare className="h-4 w-4" />
                    Conversation
                  </TabsTrigger>
                </Link>
                <Link
                  to="/$account/$search/$owner/$repo/pull/$number/commits"
                  params={{ account, search, owner, repo, number }}
                >
                  <TabsTrigger value="commits" className="gap-1">
                    <GitCommitIcon size={16} />
                    Commits
                    <Badge variant="secondary" className="ml-1">
                      {data.totalCommits}
                    </Badge>
                  </TabsTrigger>
                </Link>
                <Link
                  to="/$account/$search/$owner/$repo/pull/$number/files"
                  params={{ account, search, owner, repo, number }}
                >
                  <TabsTrigger value="files" className="gap-1">
                    <FileText className="h-4 w-4" />
                    Files Changed
                    <Badge variant="secondary" className="ml-1">
                      {data.changedFiles}
                    </Badge>
                  </TabsTrigger>
                </Link>
              </TabsList>
            </Tabs>
          </div>
        </>
      )}
      <Outlet />
    </>
  );
}
