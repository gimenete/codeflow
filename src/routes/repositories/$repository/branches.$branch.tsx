import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerminalContainer } from "@/components/terminal/terminal-container";
import { BranchChat } from "@/components/repositories/branch-chat";
import { BranchFilesView } from "@/components/repositories/branch-files-view";
import { BranchCommitsView } from "@/components/repositories/branch-commits-view";
import { BranchCodeView } from "@/components/repositories/branch-code-view";
import { BranchPullRequestView } from "@/components/repositories/branch-pull-request-view";
import { useBranchById, useBranchesStore } from "@/lib/branches-store";
import { useCommandPalette, type CommandItem } from "@/lib/command-palette";
import { useRepositoriesStore } from "@/lib/repositories-store";
import { parseRemoteUrl, isGitHubUrl } from "@/lib/remote-url";
import { getAccount } from "@/lib/auth";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import {
  Code,
  FileText,
  GitCommitHorizontal,
  EyeOff,
  GitMerge,
  GitPullRequest,
  MoreHorizontal,
  Pencil,
  TerminalSquare,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RenameBranchDialog } from "@/components/repositories/rename-branch-dialog";
import { MergeBranchDialog } from "@/components/repositories/merge-branch-dialog";
import { DeleteBranchDialog } from "@/components/repositories/delete-branch-dialog";
import { StopTrackingDialog } from "@/components/repositories/stop-tracking-dialog";
import { ClaudeIcon } from "@/components/ui/claude-icon";
import { Activity, useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { AgentType } from "@/lib/github-types";
import { useAgentStatus } from "@/lib/agent-status";
import { useDiffStats } from "@/lib/git";
import { cn } from "@/lib/utils";

type TabType = "agent" | "diff" | "history" | "code" | "terminal" | "pull";

const AGENT_NAMES: Record<AgentType, string> = {
  claude: "Claude",
  codex: "Codex",
};

export const Route = createFileRoute(
  "/repositories/$repository/branches/$branch",
)({
  beforeLoad: ({ params }) => {
    const repository = useRepositoriesStore
      .getState()
      .getRepositoryBySlug(params.repository);
    if (!repository) {
      throw redirect({ to: "/", search: { addAccount: false } });
    }

    return { repository };
  },
  component: BranchDetailPage,
});

function BranchDetailPage() {
  const { repository } = Route.useRouteContext();
  const { branch: branchId } = Route.useParams();
  const repositorySlug = Route.useParams().repository;
  const branch = useBranchById(branchId);
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active tab from pathname
  const activeTab: TabType = location.pathname.endsWith("/terminal")
    ? "terminal"
    : location.pathname.endsWith("/diff")
      ? "diff"
      : location.pathname.endsWith("/history")
        ? "history"
        : location.pathname.endsWith("/code")
          ? "code"
          : location.pathname.includes("/pull")
            ? "pull"
            : "agent";

  // Check if this is a GitHub repository (for showing Pull Request tab)
  const remoteInfo = parseRemoteUrl(repository.remoteUrl);
  const isGitHub = isGitHubUrl(repository.remoteUrl);
  const account = repository.accountId
    ? getAccount(repository.accountId)
    : null;

  // Track visited tabs for lazy mounting - only mount tabs that have been visited
  const [visitedTabs, setVisitedTabs] = useState<Set<TabType>>(
    () => new Set([activeTab]),
  );

  // Navigation helpers for command palette
  const navigateToTab = useCallback(
    (tab: TabType) => {
      const tabPath =
        tab === "agent"
          ? "agent"
          : tab === "diff"
            ? "diff"
            : tab === "history"
              ? "history"
              : tab === "code"
                ? "code"
                : tab === "pull"
                  ? "pull"
                  : "terminal";
      void navigate({
        to: `/repositories/$repository/branches/$branch/${tabPath}`,
        params: { repository: repositorySlug, branch: branchId },
      });
    },
    [navigate, repositorySlug, branchId],
  );

  // Register command palette commands for tab switching
  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: "tab-agent",
        label: AGENT_NAMES[repository.agent],
        group: "Tabs",
        shortcut: "⌘1",
        icon: <ClaudeIcon className="h-4 w-4" />,
        onSelect: () => navigateToTab("agent"),
      },
      {
        id: "tab-changes",
        label: "Changes",
        group: "Tabs",
        shortcut: "⌘2",
        icon: <FileText className="h-4 w-4" />,
        onSelect: () => navigateToTab("diff"),
      },
      {
        id: "tab-history",
        label: "Commits",
        group: "Tabs",
        shortcut: "⌘3",
        icon: <GitCommitHorizontal className="h-4 w-4" />,
        onSelect: () => navigateToTab("history"),
      },
      {
        id: "tab-code",
        label: "Code",
        group: "Tabs",
        shortcut: "⌘4",
        icon: <Code className="h-4 w-4" />,
        onSelect: () => navigateToTab("code"),
      },
      {
        id: "tab-terminal",
        label: "Terminal",
        group: "Tabs",
        shortcut: "⌘5",
        icon: <TerminalSquare className="h-4 w-4" />,
        onSelect: () => navigateToTab("terminal"),
      },
      ...(isGitHub
        ? [
            {
              id: "tab-pull",
              label: "Pull Request",
              group: "Tabs",
              shortcut: "⌘6",
              icon: <GitPullRequest className="h-4 w-4" />,
              onSelect: () => navigateToTab("pull"),
            },
          ]
        : []),
    ],
    [repository.agent, navigateToTab, isGitHub],
  );

  useCommandPalette(commands);

  // Keyboard shortcuts for tab switching (⌘1–⌘5)
  useHotkeys("mod+1", () => navigateToTab("agent"), {
    enableOnFormTags: true,
    preventDefault: true,
  });
  useHotkeys("mod+2", () => navigateToTab("diff"), {
    enableOnFormTags: true,
    preventDefault: true,
  });
  useHotkeys("mod+3", () => navigateToTab("history"), {
    enableOnFormTags: true,
    preventDefault: true,
  });
  useHotkeys("mod+4", () => navigateToTab("code"), {
    enableOnFormTags: true,
    preventDefault: true,
  });
  useHotkeys("mod+5", () => navigateToTab("terminal"), {
    enableOnFormTags: true,
    preventDefault: true,
  });
  useHotkeys(
    "mod+6",
    () => {
      if (isGitHub) navigateToTab("pull");
    },
    {
      enableOnFormTags: true,
      preventDefault: true,
    },
  );

  // Add current tab to visited set when it changes
  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      return new Set([...prev, activeTab]);
    });
  }, [activeTab]);

  // Redirect if branch not found (after hydration)
  useEffect(() => {
    if (branch === null) {
      // Give hydration a moment, then redirect if still not found
      const timeout = setTimeout(() => {
        const currentBranch = useBranchesStore
          .getState()
          .getBranchById(branchId);
        if (!currentBranch || currentBranch.repositoryId !== repository.id) {
          void navigate({
            to: "/repositories/$repository/branches",
            params: { repository: repository.slug },
          });
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [branch, branchId, repository, navigate]);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stopTrackingDialogOpen, setStopTrackingDialogOpen] = useState(false);

  const handleNavigateAway = useCallback(() => {
    void navigate({
      to: "/repositories/$repository",
      params: { repository: repositorySlug },
    });
  }, [navigate, repositorySlug]);

  const cwd = branch?.worktreePath || repository.path;
  const agentStatus = useAgentStatus(branchId);
  const { stats: diffStats } = useDiffStats(cwd ?? undefined);

  if (!branch) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading branch...</div>
      </div>
    );
  }

  // Show message if no local path is configured
  if (!cwd) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">Local path not configured</p>
          <p className="text-sm">
            Please configure a local repository path to work with branches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab navigation */}
      <div className="bg-background shrink-0">
        <Tabs value={activeTab}>
          <TabsList className="h-auto bg-transparent p-0 w-full justify-start rounded-none border-b border-border">
            <Link
              to="/repositories/$repository/branches/$branch/agent"
              params={{ repository: repositorySlug, branch: branchId }}
            >
              <TabsTrigger
                value="agent"
                className="gap-1 rounded-none border-0 data-[state=active]:bg-muted data-[state=active]:shadow-none px-3 py-2"
              >
                <ClaudeIcon className="h-4 w-4" />
                {AGENT_NAMES[repository.agent]}
                {agentStatus !== "idle" && (
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      agentStatus === "working" &&
                        "bg-yellow-500 animate-pulse",
                      agentStatus === "waiting" && "bg-blue-500",
                    )}
                  />
                )}
              </TabsTrigger>
            </Link>
            <Link
              to="/repositories/$repository/branches/$branch/diff"
              params={{ repository: repositorySlug, branch: branchId }}
            >
              <TabsTrigger
                value="diff"
                className="gap-1 rounded-none border-0 data-[state=active]:bg-muted data-[state=active]:shadow-none px-3 py-2"
              >
                <FileText className="h-4 w-4" />
                Changes
                {diffStats &&
                  (diffStats.insertions > 0 || diffStats.deletions > 0) && (
                    <span className="flex items-center gap-1 text-xs">
                      {diffStats.insertions > 0 && (
                        <span className="text-green-600">
                          +{diffStats.insertions}
                        </span>
                      )}
                      {diffStats.deletions > 0 && (
                        <span className="text-red-600">
                          -{diffStats.deletions}
                        </span>
                      )}
                    </span>
                  )}
              </TabsTrigger>
            </Link>
            <Link
              to="/repositories/$repository/branches/$branch/history"
              params={{ repository: repositorySlug, branch: branchId }}
            >
              <TabsTrigger
                value="history"
                className="gap-1 rounded-none border-0 data-[state=active]:bg-muted data-[state=active]:shadow-none px-3 py-2"
              >
                <GitCommitHorizontal className="h-4 w-4" />
                Commits
              </TabsTrigger>
            </Link>
            <Link
              to="/repositories/$repository/branches/$branch/code"
              params={{ repository: repositorySlug, branch: branchId }}
            >
              <TabsTrigger
                value="code"
                className="gap-1 rounded-none border-0 data-[state=active]:bg-muted data-[state=active]:shadow-none px-3 py-2"
              >
                <Code className="h-4 w-4" />
                Code
              </TabsTrigger>
            </Link>
            <Link
              to="/repositories/$repository/branches/$branch/terminal"
              params={{ repository: repositorySlug, branch: branchId }}
            >
              <TabsTrigger
                value="terminal"
                className="gap-1 rounded-none border-0 data-[state=active]:bg-muted data-[state=active]:shadow-none px-3 py-2"
              >
                <TerminalSquare className="h-4 w-4" />
                Terminal
              </TabsTrigger>
            </Link>

            {/* Pull Request tab - only show for GitHub repos */}
            {isGitHub && remoteInfo && account && (
              <Link
                to="/repositories/$repository/branches/$branch/pull"
                params={{ repository: repositorySlug, branch: branchId }}
              >
                <TabsTrigger
                  value="pull"
                  className="gap-1 rounded-none border-0 data-[state=active]:bg-muted data-[state=active]:shadow-none px-3 py-2"
                >
                  <GitPullRequest className="h-4 w-4" />
                  Pull Request
                </TabsTrigger>
              </Link>
            )}

            <div className="flex-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="my-1 mr-1">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setRenameDialogOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Rename Branch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMergeDialogOpen(true)}>
                  <GitMerge className="h-4 w-4" />
                  Merge Branch
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setStopTrackingDialogOpen(true)}
                >
                  <EyeOff className="h-4 w-4" />
                  Stop Tracking
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Branch
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab content - all tabs rendered with Activity for state preservation */}
      <div className="flex-1 min-h-0 relative">
        {/* Agent Tab */}
        {visitedTabs.has("agent") && (
          <Activity mode={activeTab === "agent" ? "visible" : "hidden"}>
            <div className="absolute inset-0">
              <BranchChat
                branch={branch}
                cwd={cwd}
                isAgentTabActive={activeTab === "agent"}
              />
            </div>
          </Activity>
        )}

        {/* Diff Tab */}
        {visitedTabs.has("diff") && (
          <Activity mode={activeTab === "diff" ? "visible" : "hidden"}>
            <div className="absolute inset-0">
              <BranchFilesView branch={branch} repositoryPath={cwd} />
            </div>
          </Activity>
        )}

        {/* Commits Tab */}
        {visitedTabs.has("history") && (
          <Activity mode={activeTab === "history" ? "visible" : "hidden"}>
            <div className="absolute inset-0">
              <BranchCommitsView branch={branch} repositoryPath={cwd} />
            </div>
          </Activity>
        )}

        {/* Code Tab */}
        {visitedTabs.has("code") && (
          <Activity mode={activeTab === "code" ? "visible" : "hidden"}>
            <div className="absolute inset-0">
              <BranchCodeView branch={branch} repositoryPath={cwd} />
            </div>
          </Activity>
        )}

        {/* Terminal Tab */}
        {visitedTabs.has("terminal") && (
          <Activity mode={activeTab === "terminal" ? "visible" : "hidden"}>
            <div className="absolute inset-0">
              <TerminalContainer
                branchId={branchId}
                cwd={cwd}
                active={activeTab === "terminal"}
              />
            </div>
          </Activity>
        )}

        {/* Pull Request Tab */}
        {visitedTabs.has("pull") && isGitHub && remoteInfo && account && (
          <Activity mode={activeTab === "pull" ? "visible" : "hidden"}>
            <div className="absolute inset-0">
              <BranchPullRequestView
                branch={branch}
                accountId={account.id}
                owner={remoteInfo.owner}
                repo={remoteInfo.repo}
                repositoryPath={cwd}
                basePath={`/repositories/${repositorySlug}/branches/${branchId}/pull`}
              />
            </div>
          </Activity>
        )}
      </div>

      {/* Keep Outlet for route matching (renders null) */}
      <Outlet />

      <RenameBranchDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        branch={branch}
        repositoryPath={cwd}
      />
      <MergeBranchDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        branch={branch}
        repositoryPath={cwd}
      />
      <DeleteBranchDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        branch={branch}
        repositoryPath={repository.path!}
        onDeleted={handleNavigateAway}
      />
      <StopTrackingDialog
        open={stopTrackingDialogOpen}
        onOpenChange={setStopTrackingDialogOpen}
        branch={branch}
        onConfirmed={handleNavigateAway}
      />
    </div>
  );
}
