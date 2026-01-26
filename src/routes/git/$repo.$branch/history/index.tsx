import { createFileRoute, Link } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useRepository, useGitStatus, useGitLog } from "@/lib/git";

export const Route = createFileRoute("/git/$repo/$branch/history/")({
  component: HistoryView,
});

function HistoryView() {
  const { repo, branch } = Route.useParams();
  const repository = useRepository(repo);
  const { status } = useGitStatus(repository?.path);
  const { commits, isLoading: logLoading } = useGitLog(
    repository?.path,
    branch,
  );

  if (!repository) {
    return null;
  }

  const changedFiles = status?.files ?? [];

  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-80 border-r flex flex-col shrink-0">
        <Tabs value="history">
          <TabsList className="w-full rounded-none border-b shrink-0">
            <Link
              to="/git/$repo/$branch/changes"
              params={{ repo, branch }}
              className="flex-1"
            >
              <TabsTrigger value="changes" className="w-full">
                Changes ({changedFiles.length})
              </TabsTrigger>
            </Link>
            <Link
              to="/git/$repo/$branch/history"
              params={{ repo, branch }}
              className="flex-1"
            >
              <TabsTrigger value="history" className="w-full">
                History
              </TabsTrigger>
            </Link>
          </TabsList>
        </Tabs>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {logLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="p-2 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              : commits.map((commit) => (
                  <Link
                    key={commit.sha}
                    to="/git/$repo/$branch/$sha"
                    params={{ repo, branch, sha: commit.sha }}
                    className="block p-2 rounded hover:bg-accent"
                  >
                    <p className="text-sm font-medium truncate">
                      {commit.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {commit.author} - {commit.date}
                    </p>
                  </Link>
                ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a commit to view details
      </div>
    </div>
  );
}
