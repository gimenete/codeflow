import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerminalContainer } from "@/components/terminal/terminal-container";
import { useBranchById, useBranchesStore } from "@/lib/branches-store";
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
  Bot,
  FileText,
  GitCommitHorizontal,
  TerminalSquare,
} from "lucide-react";
import { useEffect } from "react";

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
  const activeTab = location.pathname.endsWith("/terminal")
    ? "terminal"
    : location.pathname.endsWith("/diff")
      ? "diff"
      : location.pathname.endsWith("/commits")
        ? "commits"
        : "agent";

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

  if (!branch) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading branch...</div>
      </div>
    );
  }

  const cwd = branch.worktreePath || repository.path;

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
          <TabsList className="w-full rounded-none border-b justify-start">
            <Link
              to="/repositories/$repository/branches/$branch/agent"
              params={{ repository: repositorySlug, branch: branchId }}
            >
              <TabsTrigger value="agent" className="gap-1">
                <Bot className="h-4 w-4" />
                Agent
              </TabsTrigger>
            </Link>
            <Link
              to="/repositories/$repository/branches/$branch/diff"
              params={{ repository: repositorySlug, branch: branchId }}
            >
              <TabsTrigger value="diff" className="gap-1">
                <FileText className="h-4 w-4" />
                Changes
              </TabsTrigger>
            </Link>
            <Link
              to="/repositories/$repository/branches/$branch/commits"
              params={{ repository: repositorySlug, branch: branchId }}
            >
              <TabsTrigger value="commits" className="gap-1">
                <GitCommitHorizontal className="h-4 w-4" />
                Commits
              </TabsTrigger>
            </Link>
            <Link
              to="/repositories/$repository/branches/$branch/terminal"
              params={{ repository: repositorySlug, branch: branchId }}
            >
              <TabsTrigger value="terminal" className="gap-1">
                <TerminalSquare className="h-4 w-4" />
                Terminal
              </TabsTrigger>
            </Link>
          </TabsList>
        </Tabs>
      </div>

      {/* Child route content - hide when terminal tab is active */}
      <div
        className={`flex-1 min-h-0 ${activeTab === "terminal" ? "hidden" : ""}`}
      >
        <Outlet />
      </div>

      {/* Terminal container - always mounted, hidden when not active */}
      <div
        className={`flex-1 min-h-0 ${activeTab === "terminal" ? "" : "hidden"}`}
      >
        <TerminalContainer
          branchId={branchId}
          cwd={cwd}
          active={activeTab === "terminal"}
        />
      </div>
    </div>
  );
}
