import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GitBranch, Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRepositoriesStore } from "@/lib/repositories-store";
import {
  useBranchesByRepositoryId,
  useBranchesStore,
} from "@/lib/branches-store";
import { RelativeTime } from "@/components/relative-time";
import { TrackBranchDialog } from "@/components/repositories/track-branch-dialog";

export const Route = createFileRoute("/repositories/$repository/branches/")({
  component: BranchesListPage,
});

function BranchesListPage() {
  const { repository: repositorySlug } = Route.useParams();
  const repository = useRepositoriesStore((state) =>
    state.getRepositoryBySlug(repositorySlug),
  );
  const branches = useBranchesByRepositoryId(repository?.id ?? "");
  const deleteBranch = useBranchesStore((state) => state.deleteBranch);
  const [trackBranchOpen, setTrackBranchOpen] = useState(false);

  if (!repository) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Repository not found
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tracked Branches</h1>
            <p className="text-muted-foreground">
              Manage your work branches and Claude conversations
            </p>
          </div>
          <Button onClick={() => setTrackBranchOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Track Branch
          </Button>
        </div>

        {branches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No branches tracked</h3>
              <p className="text-muted-foreground mb-4">
                Track a branch to start working on a feature or fix with Claude
              </p>
              <Button onClick={() => setTrackBranchOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Track your first branch
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <Link
                key={branch.id}
                to="/repositories/$repository/branches/$branch"
                params={{ repository: repositorySlug, branch: branch.id }}
                className="block"
              >
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer relative group h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <CardTitle className="text-base truncate">
                          {branch.branch}
                        </CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              deleteBranch(branch.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Untrack Branch
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription className="text-xs">
                      Tracked <RelativeTime date={branch.createdAt} />
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {branch.conversationId
                        ? "Has conversation"
                        : "No conversation yet"}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <TrackBranchDialog
          repositoryId={repository.id}
          repositoryPath={repository.path}
          open={trackBranchOpen}
          onOpenChange={setTrackBranchOpen}
        />
      </div>
    </div>
  );
}
