import { Branch } from "@/components/branch";
import { DetailSkeleton } from "@/components/detail-components";
import { PullStateIcon } from "@/components/pull-state-icon";
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
import { usePullMetadata } from "@/lib/github";
import { useRepositoriesStore } from "@/lib/repositories-store";
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

export const Route = createFileRoute("/repositories/$repository/pulls/$number")(
  {
    beforeLoad: ({ params }) => {
      const repository = useRepositoriesStore
        .getState()
        .getRepositoryBySlug(params.repository);
      if (!repository) {
        throw redirect({ to: "/", search: { addAccount: false } });
      }
      if (
        !repository.githubAccountId ||
        !repository.githubOwner ||
        !repository.githubRepo
      ) {
        throw redirect({
          to: "/repositories/$repository/branches",
          params: { repository: params.repository },
        });
      }
      const account = getAccount(repository.githubAccountId);
      if (!account) {
        throw redirect({ to: "/", search: { addAccount: false } });
      }
      return { repository, account };
    },
    component: PullRequestDetail,
  },
);

function PullRequestDetail() {
  const { repository: repositorySlug, number } = Route.useParams();
  const { repository, account } = Route.useRouteContext();
  const location = useLocation();

  const owner = repository.githubOwner!;
  const repo = repository.githubRepo!;

  const { data, isLoading, error } = usePullMetadata(
    account.id,
    owner,
    repo,
    parseInt(number),
  );

  const activeTab = location.pathname.endsWith("/commits")
    ? "commits"
    : location.pathname.endsWith("/files")
      ? "files"
      : "conversation";

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
                            `https://${account.host}/${owner}/${repo}/pull/${number}`,
                          )
                        }
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy GitHub URL
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          openInBrowser(
                            `https://${account.host}/${owner}/${repo}/pull/${number}`,
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
                  to="/repositories/$repository/pulls/$number"
                  params={{ repository: repositorySlug, number }}
                >
                  <TabsTrigger value="conversation" className="gap-1">
                    <MessageSquare className="h-4 w-4" />
                    Conversation
                  </TabsTrigger>
                </Link>
                <Link
                  to="/repositories/$repository/pulls/$number/commits"
                  params={{ repository: repositorySlug, number }}
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
                  to="/repositories/$repository/pulls/$number/files"
                  params={{ repository: repositorySlug, number }}
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
