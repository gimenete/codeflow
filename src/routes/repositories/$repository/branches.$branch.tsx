import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerminalContainer } from "@/components/terminal/terminal-container";
import { BranchChat } from "@/components/repositories/branch-chat";
import { BranchFilesView } from "@/components/repositories/branch-files-view";
import { BranchCommitsView } from "@/components/repositories/branch-commits-view";
import { BranchCodeView } from "@/components/repositories/branch-code-view";
import { useBranchById, useBranchesStore } from "@/lib/branches-store";
import { useCommandPalette, type CommandItem } from "@/lib/command-palette";
import { useRepositoriesStore } from "@/lib/repositories-store";
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
  TerminalSquare,
} from "lucide-react";
import { ClaudeIcon } from "@/components/ui/claude-icon";
import { Activity, useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { AgentType } from "@/lib/github-types";
import { useAgentStatus } from "@/lib/agent-status";
import { useDiffStats } from "@/lib/git";
import { cn } from "@/lib/utils";

type TabType = "agent" | "diff" | "commits" | "code" | "terminal";

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
      : location.pathname.endsWith("/commits")
        ? "commits"
        : location.pathname.endsWith("/code")
          ? "code"
          : "agent";

  // Track visited tabs for lazy mounting - only mount tabs that have been visited
  const [visitedTabs, setVisitedTabs] = useState<Set<TabType>>(
    () => new Set([activeTab]),
  );

  // Navigation helpers for command palette
  const navigateToTab = useCallback(
    (tab: TabType) => {
      void navigate({
        to: `/repositories/$repository/branches/$branch/${tab === "agent" ? "agent" : tab === "diff" ? "diff" : tab === "commits" ? "commits" : tab === "code" ? "code" : "terminal"}`,
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
        id: "tab-commits",
        label: "Commits",
        group: "Tabs",
        shortcut: "⌘3",
        icon: <GitCommitHorizontal className="h-4 w-4" />,
        onSelect: () => navigateToTab("commits"),
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
    ],
    [repository.agent, navigateToTab],
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
  useHotkeys("mod+3", () => navigateToTab("commits"), {
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
              to="/repositories/$repository/branches/$branch/commits"
              params={{ repository: repositorySlug, branch: branchId }}
            >
              <TabsTrigger
                value="commits"
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
        {visitedTabs.has("commits") && (
          <Activity mode={activeTab === "commits" ? "visible" : "hidden"}>
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
      </div>

      {/* Keep Outlet for route matching (renders null) */}
      <Outlet />
    </div>
  );
}
