import { create } from "zustand";

export interface PtySession {
  sessionId: string;
  branchId: string;
  cwd: string;
  isActive: boolean;
}

interface PtySessionState {
  sessions: Map<string, PtySession>;

  // Actions
  getSession: (branchId: string) => PtySession | undefined;
  setSession: (branchId: string, session: PtySession) => void;
  removeSession: (branchId: string) => void;
  setActive: (branchId: string, isActive: boolean) => void;
}

export const usePtySessionStore = create<PtySessionState>()((set, get) => ({
  sessions: new Map(),

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
}));

// React hook for getting a session
export function usePtySession(branchId: string): PtySession | undefined {
  return usePtySessionStore((state) => state.sessions.get(branchId));
}
