import { create } from "zustand";

export interface PtySession {
  sessionId: string;
  branchId: string;
  cwd: string;
  isActive: boolean;
}

export interface TerminalPane {
  id: string;
  sessionId: string;
  branchId: string;
  cwd: string;
}

// Split layout tree node
export interface SplitNode {
  type: "terminal" | "split";
  // For terminal nodes
  paneId?: string;
  // For split nodes
  direction?: "horizontal" | "vertical";
  children?: [SplitNode, SplitNode];
}

interface PtySessionState {
  // Legacy single-session support
  sessions: Map<string, PtySession>;

  // Multi-pane support
  panes: Map<string, TerminalPane>;
  branchPanes: Map<string, string[]>;
  focusedPaneId: string | null;
  layouts: Map<string, SplitNode>;

  // Legacy actions
  getSession: (branchId: string) => PtySession | undefined;
  setSession: (branchId: string, session: PtySession) => void;
  removeSession: (branchId: string) => void;
  setActive: (branchId: string, isActive: boolean) => void;

  // Multi-pane actions
  addPane: (branchId: string, cwd: string, sessionId: string) => string;
  removePane: (paneId: string) => void;
  setFocusedPane: (paneId: string | null) => void;
  getPanesForBranch: (branchId: string) => TerminalPane[];
  getPane: (paneId: string) => TerminalPane | undefined;
  setLayout: (branchId: string, layout: SplitNode) => void;
  getLayout: (branchId: string) => SplitNode | undefined;
}

let paneIdCounter = 0;

export const usePtySessionStore = create<PtySessionState>()((set, get) => ({
  sessions: new Map(),
  panes: new Map(),
  branchPanes: new Map(),
  focusedPaneId: null,
  layouts: new Map(),

  getSession: (branchId) => {
    return get().sessions.get(branchId);
  },

  setSession: (branchId, session) => {
    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.set(branchId, session);
      return { sessions: newSessions };
    });
  },

  removeSession: (branchId) => {
    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.delete(branchId);
      return { sessions: newSessions };
    });
  },

  setActive: (branchId, isActive) => {
    set((state) => {
      const session = state.sessions.get(branchId);
      if (!session) return state;

      const newSessions = new Map(state.sessions);
      newSessions.set(branchId, { ...session, isActive });
      return { sessions: newSessions };
    });
  },

  addPane: (branchId, cwd, sessionId) => {
    const paneId = `pane-${++paneIdCounter}`;
    const pane: TerminalPane = { id: paneId, sessionId, branchId, cwd };

    set((state) => {
      const newPanes = new Map(state.panes);
      newPanes.set(paneId, pane);

      const newBranchPanes = new Map(state.branchPanes);
      const existing = newBranchPanes.get(branchId) || [];
      newBranchPanes.set(branchId, [...existing, paneId]);

      return { panes: newPanes, branchPanes: newBranchPanes };
    });

    return paneId;
  },

  removePane: (paneId) => {
    set((state) => {
      const pane = state.panes.get(paneId);
      if (!pane) return state;

      const newPanes = new Map(state.panes);
      newPanes.delete(paneId);

      const newBranchPanes = new Map(state.branchPanes);
      const existing = newBranchPanes.get(pane.branchId) || [];
      newBranchPanes.set(
        pane.branchId,
        existing.filter((id) => id !== paneId),
      );

      // Clear focused pane if it's the one being removed
      const newFocusedPaneId =
        state.focusedPaneId === paneId ? null : state.focusedPaneId;

      return {
        panes: newPanes,
        branchPanes: newBranchPanes,
        focusedPaneId: newFocusedPaneId,
      };
    });
  },

  setFocusedPane: (paneId) => {
    set({ focusedPaneId: paneId });
  },

  getPanesForBranch: (branchId) => {
    const state = get();
    const paneIds = state.branchPanes.get(branchId) || [];
    return paneIds
      .map((id) => state.panes.get(id))
      .filter((pane): pane is TerminalPane => pane !== undefined);
  },

  getPane: (paneId) => {
    return get().panes.get(paneId);
  },

  setLayout: (branchId, layout) => {
    set((state) => {
      const newLayouts = new Map(state.layouts);
      newLayouts.set(branchId, layout);
      return { layouts: newLayouts };
    });
  },

  getLayout: (branchId) => {
    return get().layouts.get(branchId);
  },
}));

// React hook for getting a session
export function usePtySession(branchId: string): PtySession | undefined {
  return usePtySessionStore((state) => state.sessions.get(branchId));
}

// React hook for getting focused pane ID
export function useFocusedPaneId(): string | null {
  return usePtySessionStore((state) => state.focusedPaneId);
}

// React hook for getting layout for a branch
export function useLayout(branchId: string): SplitNode | undefined {
  return usePtySessionStore((state) => state.layouts.get(branchId));
}
