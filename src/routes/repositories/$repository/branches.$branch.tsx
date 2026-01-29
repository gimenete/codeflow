import { BranchChat } from "@/components/repositories/branch-chat";
import { BranchDiffPanel } from "@/components/repositories/branch-diff-panel";
import { TerminalPanel } from "@/components/terminal/terminal-panel";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  usePanelRef,
} from "@/components/ui/resizable";
import { useBranchById, useBranchesStore } from "@/lib/branches-store";
import { useRepositoriesStore } from "@/lib/repositories-store";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, TerminalSquare } from "lucide-react";
import { useEffect, useState } from "react";

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
  const branch = useBranchById(branchId);
  const navigate = useNavigate();

  // Panel refs for programmatic collapse/expand
  const chatPanelRef = usePanelRef();
  const diffPanelRef = usePanelRef();
  const terminalPanelRef = usePanelRef();

  // Collapse state for panels
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [diffCollapsed, setDiffCollapsed] = useState(false);
  const [terminalCollapsed, setTerminalCollapsed] = useState(true);

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

  const toggleTerminal = () => {
    if (terminalCollapsed) {
      terminalPanelRef.current?.expand();
    } else {
      terminalPanelRef.current?.collapse();
    }
  };

  return (
    <ResizablePanelGroup direction="vertical" className="h-full">
      {/* Top section: Chat + Diff */}
      <ResizablePanel defaultSize={70} minSize={20}>
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Chat Panel */}
          <ResizablePanel
            panelRef={chatPanelRef}
            defaultSize={60}
            minSize={20}
            collapsible
            collapsedSize={0}
            onResize={(size) => {
              if (size.asPercentage === 0) setChatCollapsed(true);
              else if (chatCollapsed) setChatCollapsed(false);
            }}
          >
            <BranchChat branch={branch} cwd={cwd} />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Diff Panel */}
          <ResizablePanel
            panelRef={diffPanelRef}
            defaultSize={40}
            minSize={15}
            collapsible
            collapsedSize={0}
            onResize={(size) => {
              if (size.asPercentage === 0) setDiffCollapsed(true);
              else if (diffCollapsed) setDiffCollapsed(false);
            }}
          >
            <BranchDiffPanel branch={branch} repositoryPath={cwd} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Terminal Panel */}
      <ResizablePanel
        panelRef={terminalPanelRef}
        defaultSize={30}
        minSize={10}
        collapsible
        collapsedSize={0}
        onResize={(size) => {
          if (size.asPercentage === 0) setTerminalCollapsed(true);
          else if (terminalCollapsed) setTerminalCollapsed(false);
        }}
      >
        <div className="h-full flex flex-col">
          <div className="border-b px-3 py-1.5 flex items-center justify-between shrink-0 bg-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <TerminalSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Terminal
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={toggleTerminal}
            >
              {terminalCollapsed ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <TerminalPanel
              cwd={cwd}
              className="h-full w-full"
              active={!terminalCollapsed}
            />
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
