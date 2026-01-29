import { DetailSkeleton } from "@/components/detail-components";
import { IssueStateIcon } from "@/components/issue-state-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copyToClipboard, openInBrowser } from "@/lib/actions";
import { getAccount } from "@/lib/auth";
import { useIssueMetadata } from "@/lib/github";
import { useRepositoriesStore } from "@/lib/repositories-store";
import { parseRemoteUrl } from "@/lib/remote-url";
import { RepoIcon } from "@primer/octicons-react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Copy, ExternalLink, MoreHorizontal } from "lucide-react";

export const Route = createFileRoute(
  "/repositories/$repository/issues/$number",
)({
  beforeLoad: ({ params }) => {
    const repository = useRepositoriesStore
      .getState()
      .getRepositoryBySlug(params.repository);
    if (!repository) {
      throw redirect({ to: "/", search: { addAccount: false } });
    }
    const remoteInfo = parseRemoteUrl(repository.remoteUrl);
    if (!repository.accountId || !remoteInfo) {
      throw redirect({
        to: "/repositories/$repository/branches",
        params: { repository: params.repository },
      });
    }
    const account = getAccount(repository.accountId);
    if (!account) {
      throw redirect({ to: "/", search: { addAccount: false } });
    }
    return { repository, account, remoteInfo };
  },
  component: IssueDetail,
});

function IssueDetail() {
  const { number } = Route.useParams();
  const { account, remoteInfo } = Route.useRouteContext();

  const owner = remoteInfo.owner;
  const repo = remoteInfo.repo;

  const { data, isLoading, error } = useIssueMetadata(
    account.id,
    owner,
    repo,
    parseInt(number),
  );

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
                            `https://${account.host}/${owner}/${repo}/issues/${number}`,
                          )
                        }
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy GitHub URL
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          openInBrowser(
                            `https://${account.host}/${owner}/${repo}/issues/${number}`,
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
