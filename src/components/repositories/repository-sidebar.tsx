import { Button } from "@/components/ui/button";
import {
  SidebarSwitcherDropdown,
  SwitcherTriggerButton,
} from "@/components/sidebar-switcher-dropdown";
import { useAgentStatus } from "@/lib/agent-status";
import { useBranchesByRepositoryId } from "@/lib/branches-store";
import { useDiffStats } from "@/lib/git";
import type { Repository, TrackedBranch } from "@/lib/github-types";
import { getIconById } from "@/lib/query-icons";
import { getOwnerRepo, parseRemoteUrl } from "@/lib/remote-url";
import { useSavedQueries } from "@/lib/saved-queries-store";
import { cn } from "@/lib/utils";
import { Link, useLocation, useParams } from "@tanstack/react-router";
import {
  ChevronRight,
  CircleDot,
  GitBranch,
  GitPullRequest,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { Scrollable } from "../flex-layout";
import { AddRepositoryDialog } from "./add-repository-dialog";
import { TrackBranchDialog } from "./track-branch-dialog";

function BranchStatusIndicator({ branchId }: { branchId: string }) {
  const status = useAgentStatus(branchId);
  if (status === "idle") return null;
  return (
    <span
      className={cn(
        "h-2 w-2 rounded-full shrink-0",
        status === "working" && "bg-yellow-500 animate-pulse",
        status === "waiting" && "bg-blue-500",
      )}
    />
  );
}

function BranchDiffStatsIndicator({
  branch,
  repositoryPath,
}: {
  branch: TrackedBranch;
  repositoryPath: string | null;
}) {
  const cwd = branch.worktreePath || repositoryPath;
  const { stats } = useDiffStats(cwd ?? undefined);
  if (!stats || (stats.insertions === 0 && stats.deletions === 0)) return null;
  return (
    <span className="flex items-center gap-1 text-xs shrink-0">
      {stats.insertions > 0 && (
        <span className="text-green-600">+{stats.insertions}</span>
      )}
      {stats.deletions > 0 && (
        <span className="text-red-600">-{stats.deletions}</span>
      )}
    </span>
  );
}

// Valid branch tab routes for type-safe navigation
type BranchTab =
  | "/repositories/$repository/branches/$branch/agent"
  | "/repositories/$repository/branches/$branch/diff"
  | "/repositories/$repository/branches/$branch/history"
  | "/repositories/$repository/branches/$branch/code"
  | "/repositories/$repository/branches/$branch/terminal"
  | "/repositories/$repository/branches/$branch/pull";

// Extract current tab from URL and return the corresponding typed route
function getCurrentBranchTabRoute(pathname: string): BranchTab {
  const tabPatterns = ["/terminal", "/diff", "/history", "/code", "/agent"];
  for (const tab of tabPatterns) {
    if (pathname.includes("/branches/") && pathname.endsWith(tab)) {
      return `/repositories/$repository/branches/$branch${tab}` as BranchTab;
    }
  }
  // Check for /pull and its sub-routes (e.g., /pull/commits, /pull/files)
  if (pathname.includes("/branches/") && pathname.includes("/pull")) {
    return "/repositories/$repository/branches/$branch/pull";
  }
  // Default to agent tab
  return "/repositories/$repository/branches/$branch/agent";
}

interface RepositorySidebarProps {
  repository: Repository;
}

export function RepositorySidebar({ repository }: RepositorySidebarProps) {
  const {
    repository: repositorySlug,
    branch,
    query,
  } = useParams({ strict: false });
  const location = useLocation();
  const trackedBranches = useBranchesByRepositoryId(repository.id);
  const savedQueries = useSavedQueries(repository.id);
  const [trackBranchOpen, setTrackBranchOpen] = useState(false);
  const [addRepositoryOpen, setAddRepositoryOpen] = useState(false);

  const remoteInfo = parseRemoteUrl(repository.remoteUrl);
  const hasRemote = repository.accountId && remoteInfo;
  const ownerRepo = getOwnerRepo(repository.remoteUrl);

  return (
    <div className="w-64 border-r bg-muted/10 flex flex-col h-full">
      {/* Repository Header */}
      <div className="p-4 border-b">
        <SidebarSwitcherDropdown
          trigger={
            <SwitcherTriggerButton>
              <div className="min-w-0">
                <h2 className="font-semibold truncate">{repository.name}</h2>
                {ownerRepo && (
                  <p className="text-xs text-muted-foreground truncate">
                    {ownerRepo}
                  </p>
                )}
              </div>
            </SwitcherTriggerButton>
          }
          onAddRepository={() => setAddRepositoryOpen(true)}
        />
      </div>

      <Scrollable.Vertical>
        {/* Issues and Pulls Section */}
        {hasRemote && (
          <div className="p-2 border-t">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Issues and Pulls
              </span>
            </div>
            <div className="space-y-1">
              <Link
                to="/repositories/$repository/queries/$query"
                params={{ repository: repositorySlug!, query: "issues" }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  location.pathname.includes("/queries/") && query === "issues"
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                )}
              >
                <CircleDot className="h-4 w-4" />
                Issues
              </Link>

              <Link
                to="/repositories/$repository/queries/$query"
                params={{ repository: repositorySlug!, query: "pulls" }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  location.pathname.includes("/queries/") && query === "pulls"
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                )}
              >
                <GitPullRequest className="h-4 w-4" />
                Pull Requests
              </Link>

              {savedQueries.map((q) => {
                const Icon = getIconById(q.icon);
                const isActive =
                  location.pathname.includes("/queries/") && query === q.id;
                return (
                  <Link
                    key={q.id}
                    to="/repositories/$repository/queries/$query"
                    params={{ repository: repositorySlug!, query: q.id }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {Icon ? (
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Search className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{q.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Tracked Branches Section */}
        <div className="p-2 border-t">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Branches
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
              trackedBranches.map((b) => {
                const tabRoute = getCurrentBranchTabRoute(location.pathname);
                return (
                  <Link
                    key={b.id}
                    to={tabRoute}
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
                    <BranchStatusIndicator branchId={b.id} />
                    <BranchDiffStatsIndicator
                      branch={b}
                      repositoryPath={repository.path}
                    />
                    <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 opacity-50" />
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </Scrollable.Vertical>

      <div className="p-2 border-t">
        <Link
          to="/repositories/$repository/settings"
          params={{ repository: repositorySlug! }}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            location.pathname.endsWith("/settings")
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>

      <TrackBranchDialog
        repository={repository}
        open={trackBranchOpen}
        onOpenChange={setTrackBranchOpen}
      />

      <AddRepositoryDialog
        open={addRepositoryOpen}
        onOpenChange={setAddRepositoryOpen}
      />
    </div>
  );
}
