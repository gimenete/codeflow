import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TrackedBranch } from "./github-types";
import { enableCrossWindowSync } from "./cross-window-sync";

function generateId(): string {
  return `branch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Generate a branch identifier from branch name (URL-friendly)
export function branchIdFromName(branch: string): string {
  return branch
    .replace(/\//g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase();
}

interface BranchesState {
  branches: TrackedBranch[];

  // Actions
  getBranches: () => TrackedBranch[];
  getBranchesByRepositoryId: (repositoryId: string) => TrackedBranch[];
  getBranchById: (id: string) => TrackedBranch | null;
  getBranchByName: (
    repositoryId: string,
    branch: string,
  ) => TrackedBranch | null;
  addBranch: (
    branch: Omit<TrackedBranch, "id" | "createdAt" | "updatedAt">,
  ) => TrackedBranch;
  updateBranch: (
    id: string,
    updates: Partial<Omit<TrackedBranch, "id" | "createdAt">>,
  ) => void;
  deleteBranch: (id: string) => void;
  deleteBranchesByRepositoryId: (repositoryId: string) => void;
  linkConversation: (branchId: string, conversationId: string) => void;
  associatePullRequest: (
    branchId: string,
    pullNumber: number,
    pullOwner: string,
    pullRepo: string,
  ) => void;
}

export const useBranchesStore = create<BranchesState>()(
  persist(
    (set, get) => ({
      branches: [],

      getBranches: () => {
        return get().branches;
      },

      getBranchesByRepositoryId: (repositoryId) => {
        return get().branches.filter((b) => b.repositoryId === repositoryId);
      },

      getBranchById: (id) => {
        return get().branches.find((b) => b.id === id) ?? null;
      },

      getBranchByName: (repositoryId, branch) => {
        return (
          get().branches.find(
            (b) => b.repositoryId === repositoryId && b.branch === branch,
          ) ?? null
        );
      },

      addBranch: (branch) => {
        const now = new Date().toISOString();

        const newBranch: TrackedBranch = {
          ...branch,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          branches: [...state.branches, newBranch],
        }));

        return newBranch;
      },

      updateBranch: (id, updates) => {
        set((state) => ({
          branches: state.branches.map((b) =>
            b.id === id
              ? {
                  ...b,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                }
              : b,
          ),
        }));
      },

      deleteBranch: (id) => {
        set((state) => ({
          branches: state.branches.filter((b) => b.id !== id),
        }));
      },

      deleteBranchesByRepositoryId: (repositoryId) => {
        set((state) => ({
          branches: state.branches.filter(
            (b) => b.repositoryId !== repositoryId,
          ),
        }));
      },

      linkConversation: (branchId, conversationId) => {
        set((state) => ({
          branches: state.branches.map((b) =>
            b.id === branchId
              ? {
                  ...b,
                  conversationId,
                  updatedAt: new Date().toISOString(),
                }
              : b,
          ),
        }));
      },

      associatePullRequest: (branchId, pullNumber, pullOwner, pullRepo) => {
        set((state) => ({
          branches: state.branches.map((b) =>
            b.id === branchId
              ? {
                  ...b,
                  pullNumber,
                  pullOwner,
                  pullRepo,
                  updatedAt: new Date().toISOString(),
                }
              : b,
          ),
        }));
      },
    }),
    {
      name: "codeflow:branches",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        let state = persistedState as { branches: TrackedBranch[] };

        // Migration from version 1 (old "codeflow:tasks" format)
        if (version < 2) {
          // Check if we need to migrate from old tasks store
          const oldData = localStorage.getItem("codeflow:tasks");
          if (oldData) {
            try {
              const parsed = JSON.parse(oldData);
              if (parsed.state?.tasks) {
                // Migrate tasks to branches, renaming projectId to repositoryId
                const branches = parsed.state.tasks.map(
                  (task: Record<string, unknown>) => ({
                    ...task,
                    repositoryId: task.projectId,
                  }),
                );
                state = { branches };
              }
            } catch {
              // Ignore parse errors
            }
          } else {
            state = { branches: [] };
          }
        }

        // Migration from version 2 to 3: add PR association fields
        if (version < 3) {
          state = {
            branches: (state.branches ?? []).map((branch) => ({
              ...branch,
              pullNumber: branch.pullNumber ?? null,
              pullOwner: branch.pullOwner ?? null,
              pullRepo: branch.pullRepo ?? null,
            })),
          };
        }

        return state as BranchesState;
      },
    },
  ),
);

// Sync across windows
enableCrossWindowSync(useBranchesStore);

// React hooks for components
export function useBranches(): TrackedBranch[] {
  return useBranchesStore((state) => state.branches);
}

export function useBranchesByRepositoryId(
  repositoryId: string,
): TrackedBranch[] {
  const branches = useBranchesStore((state) => state.branches);
  return branches.filter((b) => b.repositoryId === repositoryId);
}

export function useBranchById(id: string): TrackedBranch | null {
  const branches = useBranchesStore((state) => state.branches);
  return branches.find((b) => b.id === id) ?? null;
}

export function useBranchByName(
  repositoryId: string,
  branch: string,
): TrackedBranch | null {
  const branches = useBranchesStore((state) => state.branches);
  return (
    branches.find(
      (b) => b.repositoryId === repositoryId && b.branch === branch,
    ) ?? null
  );
}
