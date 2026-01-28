import { Link, useParams, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  GitBranch,
  GitPullRequest,
  CircleDot,
  ListTodo,
  Plus,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Repository } from "@/lib/github-types";
import { useBranchesByRepositoryId } from "@/lib/branches-store";
import { TrackBranchDialog } from "./track-branch-dialog";

interface RepositorySidebarProps {
  repository: Repository;
}

export function RepositorySidebar({ repository }: RepositorySidebarProps) {
  const { repository: repositorySlug, branch } = useParams({ strict: false });
  const location = useLocation();
  const trackedBranches = useBranchesByRepositoryId(repository.id);
  const [trackBranchOpen, setTrackBranchOpen] = useState(false);

  return (
    <div className="w-64 border-r bg-muted/10 flex flex-col h-full">
      {/* Repository Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold truncate">{repository.name}</h2>
        {repository.githubOwner && repository.githubRepo && (
          <p className="text-xs text-muted-foreground truncate">
            {repository.githubOwner}/{repository.githubRepo}
          </p>
        )}
      </div>

      <ScrollArea className="flex-1">
        {/* Navigation */}
        <div className="p-2">
          <div className="space-y-1">
            <Link
              to="/repositories/$repository/branches"
              params={{ repository: repositorySlug! }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                location.pathname.includes("/branches")
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
              )}
            >
              <ListTodo className="h-4 w-4" />
              Branches
            </Link>

            {repository.githubOwner && repository.githubRepo && (
              <>
                <Link
                  to="/repositories/$repository/issues"
                  params={{ repository: repositorySlug! }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    location.pathname.includes("/issues")
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <CircleDot className="h-4 w-4" />
                  Issues
                </Link>

                <Link
                  to="/repositories/$repository/pulls"
                  params={{ repository: repositorySlug! }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    location.pathname.includes("/pulls")
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <GitPullRequest className="h-4 w-4" />
                  Pull Requests
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Tracked Branches Section */}
        <div className="p-2 border-t">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tracked Branches
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setTrackBranchOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1">
            {trackedBranches.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No branches tracked
              </p>
            ) : (
              trackedBranches.map((b) => (
                <Link
                  key={b.id}
                  to="/repositories/$repository/branches/$branch"
                  params={{ repository: repositorySlug!, branch: b.id }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    branch === b.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <GitBranch className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{b.branch}</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 opacity-50" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Pull Requests Section - Quick links */}
        {repository.githubOwner && repository.githubRepo && (
          <div className="p-2 border-t">
            <div className="px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Pull Requests
              </span>
            </div>
            <div className="space-y-1">
              <Link
                to="/repositories/$repository/pulls"
                params={{ repository: repositorySlug! }}
                search={{ filter: "open" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                Open
              </Link>
              <Link
                to="/repositories/$repository/pulls"
                params={{ repository: repositorySlug! }}
                search={{ filter: "created" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                Created by me
              </Link>
              <Link
                to="/repositories/$repository/pulls"
                params={{ repository: repositorySlug! }}
                search={{ filter: "review" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                Review requested
              </Link>
            </div>
          </div>
        )}

        {/* Issues Section - Quick links */}
        {repository.githubOwner && repository.githubRepo && (
          <div className="p-2 border-t">
            <div className="px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Issues
              </span>
            </div>
            <div className="space-y-1">
              <Link
                to="/repositories/$repository/issues"
                params={{ repository: repositorySlug! }}
                search={{ filter: "open" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                Open
              </Link>
              <Link
                to="/repositories/$repository/issues"
                params={{ repository: repositorySlug! }}
                search={{ filter: "created" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                Created by me
              </Link>
              <Link
                to="/repositories/$repository/issues"
                params={{ repository: repositorySlug! }}
                search={{ filter: "assigned" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                Assigned to me
              </Link>
            </div>
          </div>
        )}
      </ScrollArea>

      <TrackBranchDialog
        repositoryId={repository.id}
        repositoryPath={repository.path}
        open={trackBranchOpen}
        onOpenChange={setTrackBranchOpen}
      />
    </div>
  );
}
