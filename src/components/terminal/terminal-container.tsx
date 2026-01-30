import { useCallback, useEffect, useRef, useState } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  TerminalPanel,
  TerminalPanelHandle,
} from "@/components/terminal/terminal-panel";
import { usePtySessionStore, SplitNode } from "@/lib/pty-session-store";
import { isElectron } from "@/lib/platform";

interface TerminalContainerProps {
  branchId: string;
  cwd: string;
  active: boolean;
}

// Generate unique IDs for panes
let paneIdCounter = 0;
function generatePaneId(): string {
  return `pane-${++paneIdCounter}`;
}

export function TerminalContainer({
  branchId,
  cwd,
  active,
}: TerminalContainerProps) {
  const { setLayout, getLayout, setFocusedPane } = usePtySessionStore();

  // Layout state - stored in Zustand but also kept locally for reactivity
  const [layout, setLocalLayout] = useState<SplitNode>(() => {
    const existing = getLayout(branchId);
    if (existing) return existing;
    // Default: single terminal pane
    const initialPane: SplitNode = {
      type: "terminal",
      paneId: generatePaneId(),
    };
    setLayout(branchId, initialPane);
    return initialPane;
  });

  // Refs for terminal handles (for imperative clear)
  const terminalRefs = useRef<Map<string, TerminalPanelHandle>>(new Map());

  // Track focused pane locally for keyboard shortcuts
  const [localFocusedPaneId, setLocalFocusedPaneId] = useState<string | null>(
    () => (layout.type === "terminal" ? layout.paneId || null : null),
  );

  // Sync layout changes to store
  const updateLayout = useCallback(
    (newLayout: SplitNode) => {
      setLocalLayout(newLayout);
      setLayout(branchId, newLayout);
    },
    [branchId, setLayout],
  );

  // Find a pane node in the layout tree
  const findPaneNode = useCallback(
    (
      node: SplitNode,
      paneId: string,
      parent: SplitNode | null = null,
      childIndex: number | null = null,
    ): {
      node: SplitNode;
      parent: SplitNode | null;
      childIndex: number | null;
    } | null => {
      if (node.type === "terminal" && node.paneId === paneId) {
        return { node, parent, childIndex };
      }
      if (node.type === "split" && node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const result = findPaneNode(node.children[i], paneId, node, i);
          if (result) return result;
        }
      }
      return null;
    },
    [],
  );

  // Get all pane IDs from the layout tree
  const getAllPaneIds = useCallback((node: SplitNode): string[] => {
    if (node.type === "terminal") {
      return node.paneId ? [node.paneId] : [];
    }
    if (node.type === "split" && node.children) {
      return node.children.flatMap(getAllPaneIds);
    }
    return [];
  }, []);

  // Split the focused terminal
  const splitFocused = useCallback(
    (direction: "horizontal" | "vertical") => {
      if (!localFocusedPaneId) return;

      const result = findPaneNode(layout, localFocusedPaneId);
      if (!result) return;

      const newPaneId = generatePaneId();
      const newSplit: SplitNode = {
        type: "split",
        direction,
        children: [
          { type: "terminal", paneId: localFocusedPaneId },
          { type: "terminal", paneId: newPaneId },
        ],
      };

      if (!result.parent) {
        // Splitting the root node
        updateLayout(newSplit);
      } else {
        // Replace the pane with the new split in the parent
        const newLayout = JSON.parse(JSON.stringify(layout)) as SplitNode;
        const parentResult = findPaneNode(newLayout, localFocusedPaneId);
        if (
          parentResult?.parent?.children &&
          parentResult.childIndex !== null
        ) {
          parentResult.parent.children[parentResult.childIndex] = newSplit;
          updateLayout(newLayout);
        }
      }

      // Focus the new terminal after a brief delay
      setTimeout(() => {
        setLocalFocusedPaneId(newPaneId);
        setFocusedPane(newPaneId);
        terminalRefs.current.get(newPaneId)?.focus();
      }, 100);
    },
    [layout, localFocusedPaneId, findPaneNode, updateLayout, setFocusedPane],
  );

  // Remove a pane from the layout
  const removePane = useCallback(
    (paneId: string) => {
      const allPanes = getAllPaneIds(layout);

      // If this is the only pane, create a new one
      if (allPanes.length <= 1) {
        const newPaneId = generatePaneId();
        updateLayout({ type: "terminal", paneId: newPaneId });
        setLocalFocusedPaneId(newPaneId);
        setFocusedPane(newPaneId);
        return;
      }

      const result = findPaneNode(layout, paneId);
      if (!result || !result.parent) {
        // Shouldn't happen if we have multiple panes
        return;
      }

      // Get the sibling node (the other child in the split)
      const siblingIndex = result.childIndex === 0 ? 1 : 0;
      const sibling = result.parent.children![siblingIndex];

      // Find the grandparent to replace the parent with the sibling
      const findAndReplace = (
        node: SplitNode,
        target: SplitNode,
        replacement: SplitNode,
      ): SplitNode => {
        if (node === target) {
          return replacement;
        }
        if (node.type === "split" && node.children) {
          return {
            ...node,
            children: node.children.map((child) =>
              findAndReplace(child, target, replacement),
            ) as [SplitNode, SplitNode],
          };
        }
        return node;
      };

      const newLayout = findAndReplace(layout, result.parent, sibling);
      updateLayout(newLayout);

      // Focus the sibling or first available pane
      const newPanes = getAllPaneIds(newLayout);
      const newFocusedId = newPanes[0] || null;
      if (newFocusedId) {
        setLocalFocusedPaneId(newFocusedId);
        setFocusedPane(newFocusedId);
        setTimeout(() => {
          terminalRefs.current.get(newFocusedId)?.focus();
        }, 50);
      }
    },
    [layout, getAllPaneIds, findPaneNode, updateLayout, setFocusedPane],
  );

  // Clear the focused terminal
  const clearFocusedTerminal = useCallback(() => {
    if (localFocusedPaneId) {
      terminalRefs.current.get(localFocusedPaneId)?.clear();
    }
  }, [localFocusedPaneId]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!active) return;

    const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const handleKeyDown = (e: KeyboardEvent) => {
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key.toLowerCase() === "d" && !e.shiftKey) {
        e.preventDefault();
        splitFocused("horizontal");
      } else if (modKey && e.key.toLowerCase() === "d" && e.shiftKey) {
        e.preventDefault();
        splitFocused("vertical");
      } else if (modKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        clearFocusedTerminal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, splitFocused, clearFocusedTerminal]);

  // Handle pane focus
  const handlePaneFocus = useCallback(
    (paneId: string) => {
      setLocalFocusedPaneId(paneId);
      setFocusedPane(paneId);
    },
    [setFocusedPane],
  );

  // Handle terminal exit (e.g., user types "exit")
  const handlePaneExit = useCallback(
    (paneId: string) => {
      removePane(paneId);
    },
    [removePane],
  );

  // Set terminal ref
  const setTerminalRef = useCallback(
    (paneId: string, handle: TerminalPanelHandle | null) => {
      if (handle) {
        terminalRefs.current.set(paneId, handle);
      } else {
        terminalRefs.current.delete(paneId);
      }
    },
    [],
  );

  // Render a split node recursively
  const renderNode = useCallback(
    (node: SplitNode): React.ReactNode => {
      if (node.type === "terminal" && node.paneId) {
        return (
          <TerminalPanel
            key={node.paneId}
            ref={(handle) => setTerminalRef(node.paneId!, handle)}
            paneId={node.paneId}
            branchId={branchId}
            cwd={cwd}
            active={active}
            className="h-full w-full"
            onFocus={() => handlePaneFocus(node.paneId!)}
            onExit={() => handlePaneExit(node.paneId!)}
          />
        );
      }

      if (node.type === "split" && node.children && node.direction) {
        return (
          <ResizablePanelGroup
            direction={node.direction}
            className="h-full w-full"
          >
            <ResizablePanel defaultSize={50} minSize={10}>
              {renderNode(node.children[0])}
            </ResizablePanel>
            <ResizableHandle className="bg-neutral-700" />
            <ResizablePanel defaultSize={50} minSize={10}>
              {renderNode(node.children[1])}
            </ResizablePanel>
          </ResizablePanelGroup>
        );
      }

      return null;
    },
    [branchId, cwd, active, handlePaneFocus, handlePaneExit, setTerminalRef],
  );

  if (!isElectron()) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground bg-[#1a1a1a]">
        <span className="text-sm">
          Terminal is only available in the desktop app
        </span>
      </div>
    );
  }

  return <div className="h-full w-full bg-[#1a1a1a]">{renderNode(layout)}</div>;
}
