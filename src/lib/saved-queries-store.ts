import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SavedQuery, SavedQueryGroup } from "./github-types";

// System queries - not editable, not listed in dropdowns
export const systemQueries: Omit<SavedQuery, "accountId">[] = [
  {
    id: "pulls",
    name: "Pull Requests",
    icon: "git-pull-request",
    filters: { type: "pulls", state: "open" },
  },
  {
    id: "issues",
    name: "Issues",
    icon: "issue-opened",
    filters: { type: "issues", state: "open" },
  },
];

export function isSystemQuery(queryId: string): boolean {
  return systemQueries.some((q) => q.id === queryId);
}

// Slugify helpers
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateUniqueId(name: string, existingIds: string[]): string {
  const baseSlug = slugify(name);
  if (!baseSlug) return `query-${Date.now()}`;
  if (!existingIds.includes(baseSlug)) return baseSlug;

  let counter = 1;
  while (existingIds.includes(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
}

// Default queries
export const defaultQueries: Omit<SavedQuery, "accountId">[] = [
  {
    id: "pulls-created",
    name: "Pulls created",
    icon: "git-pull-request",
    filters: {
      type: "pulls",
      author: "@me",
      state: "open",
    },
  },
  {
    id: "pulls-assigned",
    name: "Pulls assigned",
    icon: "git-pull-request",
    filters: {
      type: "pulls",
      assignee: "@me",
      state: "open",
    },
  },
  {
    id: "pulls-mentioned",
    name: "Pulls mentioned",
    icon: "mention",
    filters: {
      type: "pulls",
      mentioned: "@me",
      state: "open",
    },
  },
  {
    id: "review-requests",
    name: "Review requests",
    icon: "eye",
    filters: {
      type: "pulls",
      reviewRequested: "@me",
      state: "open",
    },
  },
  {
    id: "issues-created",
    name: "Issues created",
    icon: "issue-opened",
    filters: {
      type: "issues",
      author: "@me",
      state: "open",
    },
  },
  {
    id: "issues-assigned",
    name: "Issues assigned",
    icon: "issue-opened",
    filters: {
      type: "issues",
      assignee: "@me",
      state: "open",
    },
  },
  {
    id: "issues-mentioned",
    name: "Issues mentioned",
    icon: "mention",
    filters: {
      type: "issues",
      mentioned: "@me",
      state: "open",
    },
  },
];

// Default group
const DEFAULT_GROUP_ID = "default";
const DEFAULT_GROUP_TITLE = "High priority";

function createDefaultGroups(accountId: string): SavedQueryGroup[] {
  return [
    {
      id: DEFAULT_GROUP_ID,
      title: DEFAULT_GROUP_TITLE,
      queries: defaultQueries.map((q) => ({
        ...q,
        accountId,
      })) as SavedQuery[],
    },
  ];
}

interface SavedQueriesState {
  // Map of accountId -> query groups
  queriesByAccount: Record<string, SavedQueryGroup[]>;

  // Actions
  getQueryGroups: (accountId: string) => SavedQueryGroup[];
  getQueries: (accountId: string) => SavedQuery[];
  getQueryById: (accountId: string, queryId: string) => SavedQuery | null;
  addQuery: (
    accountId: string,
    query: Omit<SavedQuery, "id" | "accountId">,
    groupId?: string,
  ) => SavedQuery;
  addGroup: (accountId: string, group: SavedQueryGroup) => void;
  updateQuery: (
    accountId: string,
    queryId: string,
    updates: Partial<Omit<SavedQuery, "id" | "accountId">>,
  ) => void;
  deleteQuery: (accountId: string, queryId: string) => void;
  reorderQueries: (
    accountId: string,
    groupId: string,
    queryIds: string[],
  ) => void;
  reorderGroups: (accountId: string, groupIds: string[]) => void;
  updateGroup: (
    accountId: string,
    groupId: string,
    updates: Partial<Pick<SavedQueryGroup, "title">>,
  ) => void;
  deleteGroup: (accountId: string, groupId: string) => void;
  clearQueriesForAccount: (accountId: string) => void;
}

export const useSavedQueriesStore = create<SavedQueriesState>()(
  persist(
    (set, get) => ({
      queriesByAccount: {},

      getQueryGroups: (accountId) => {
        const existing = get().queriesByAccount[accountId];
        if (existing) return existing;

        // Initialize with defaults
        const initial = createDefaultGroups(accountId);
        set((state) => ({
          queriesByAccount: { ...state.queriesByAccount, [accountId]: initial },
        }));
        return initial;
      },

      getQueries: (accountId) => {
        const groups = get().getQueryGroups(accountId);
        return groups.flatMap((g) => g.queries);
      },

      getQueryById: (accountId, queryId) => {
        // Check system queries first
        const systemQuery = systemQueries.find((q) => q.id === queryId);
        if (systemQuery) {
          return { ...systemQuery, accountId } as SavedQuery;
        }
        const queries = get().getQueries(accountId);
        return queries.find((q) => q.id === queryId) ?? null;
      },

      addQuery: (accountId, query, groupId) => {
        const groups = get().getQueryGroups(accountId);
        const allQueries = groups.flatMap((g) => g.queries);
        const existingIds = allQueries.map((q) => q.id);
        const systemIds = systemQueries.map((q) => q.id);
        const defaultIds = defaultQueries.map((q) => q.id);
        const allIds = [...existingIds, ...systemIds, ...defaultIds];

        const id = generateUniqueId(query.name, allIds);
        const newQuery: SavedQuery = {
          ...query,
          id,
          accountId,
        };

        // Find target group (default to first group)
        const targetGroupId = groupId ?? groups[0]?.id ?? DEFAULT_GROUP_ID;

        set((state) => {
          const currentGroups =
            state.queriesByAccount[accountId] ?? createDefaultGroups(accountId);
          const updatedGroups = currentGroups.map((g) =>
            g.id === targetGroupId
              ? { ...g, queries: [...g.queries, newQuery] }
              : g,
          );
          return {
            queriesByAccount: {
              ...state.queriesByAccount,
              [accountId]: updatedGroups,
            },
          };
        });
        return newQuery;
      },

      addGroup: (accountId, group) => {
        set((state) => {
          const currentGroups =
            state.queriesByAccount[accountId] ?? createDefaultGroups(accountId);
          return {
            queriesByAccount: {
              ...state.queriesByAccount,
              [accountId]: [...currentGroups, group],
            },
          };
        });
      },

      updateQuery: (accountId, queryId, updates) => {
        set((state) => {
          const groups = state.queriesByAccount[accountId] ?? [];
          const updatedGroups = groups.map((g) => ({
            ...g,
            queries: g.queries.map((q) =>
              q.id === queryId ? { ...q, ...updates } : q,
            ),
          }));
          return {
            queriesByAccount: {
              ...state.queriesByAccount,
              [accountId]: updatedGroups,
            },
          };
        });
      },

      deleteQuery: (accountId, queryId) => {
        set((state) => {
          const groups = state.queriesByAccount[accountId] ?? [];
          const updatedGroups = groups.map((g) => ({
            ...g,
            queries: g.queries.filter((q) => q.id !== queryId),
          }));
          return {
            queriesByAccount: {
              ...state.queriesByAccount,
              [accountId]: updatedGroups,
            },
          };
        });
      },

      reorderQueries: (accountId, groupId, queryIds) => {
        set((state) => {
          const groups = state.queriesByAccount[accountId] ?? [];
          const updatedGroups = groups.map((g) => {
            if (g.id !== groupId) return g;
            const queryMap = new Map(g.queries.map((q) => [q.id, q]));
            const reordered = queryIds
              .map((id) => queryMap.get(id))
              .filter((q): q is SavedQuery => q !== undefined);
            return { ...g, queries: reordered };
          });
          return {
            queriesByAccount: {
              ...state.queriesByAccount,
              [accountId]: updatedGroups,
            },
          };
        });
      },

      reorderGroups: (accountId, groupIds) => {
        set((state) => {
          const groups = state.queriesByAccount[accountId] ?? [];
          const groupMap = new Map(groups.map((g) => [g.id, g]));
          const reordered = groupIds
            .map((id) => groupMap.get(id))
            .filter((g): g is SavedQueryGroup => g !== undefined);
          return {
            queriesByAccount: {
              ...state.queriesByAccount,
              [accountId]: reordered,
            },
          };
        });
      },

      updateGroup: (accountId, groupId, updates) => {
        set((state) => {
          const groups = state.queriesByAccount[accountId] ?? [];
          const updatedGroups = groups.map((g) =>
            g.id === groupId ? { ...g, ...updates } : g,
          );
          return {
            queriesByAccount: {
              ...state.queriesByAccount,
              [accountId]: updatedGroups,
            },
          };
        });
      },

      deleteGroup: (accountId, groupId) => {
        if (groupId === "default") return; // Prevent deleting default group
        set((state) => {
          const groups = state.queriesByAccount[accountId] ?? [];
          return {
            queriesByAccount: {
              ...state.queriesByAccount,
              [accountId]: groups.filter((g) => g.id !== groupId),
            },
          };
        });
      },

      clearQueriesForAccount: (accountId) => {
        set((state) => {
          const rest = Object.fromEntries(
            Object.entries(state.queriesByAccount).filter(
              ([key]) => key !== accountId,
            ),
          );
          return { queriesByAccount: rest };
        });
      },
    }),
    {
      name: "codeflow:saved-queries",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let state = persistedState as any;

        if (version < 2) {
          // Migrate: move type from query to filters, remove builtin
          const queriesByAccount: Record<string, SavedQuery[]> = {};
          for (const [accountId, queries] of Object.entries(
            state.queriesByAccount as Record<string, unknown[]>,
          )) {
            queriesByAccount[accountId] = queries.map((q) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const oldQuery = q as any;
              const { type, filters, ...rest } = oldQuery;
              return {
                ...rest,
                filters: {
                  type: type ?? filters?.type,
                  ...filters,
                },
              } as SavedQuery;
            });
          }
          state = { ...state, queriesByAccount };
        }

        if (version < 3) {
          // Migrate: wrap flat array in a default group
          const newQueriesByAccount: Record<string, SavedQueryGroup[]> = {};
          for (const [accountId, queries] of Object.entries(
            state.queriesByAccount as Record<string, SavedQuery[]>,
          )) {
            newQueriesByAccount[accountId] = [
              {
                id: DEFAULT_GROUP_ID,
                title: DEFAULT_GROUP_TITLE,
                queries: queries,
              },
            ];
          }
          state = { ...state, queriesByAccount: newQueriesByAccount };
        }

        return state as SavedQueriesState;
      },
    },
  ),
);

// React hooks for components
export function useSavedQueryGroups(accountId: string): SavedQueryGroup[] {
  return useSavedQueriesStore((state) => state.getQueryGroups(accountId));
}

export function useSavedQueries(accountId: string): SavedQuery[] {
  return useSavedQueriesStore((state) => state.getQueries(accountId));
}

export function useQueryById(
  accountId: string,
  queryId: string,
): SavedQuery | null {
  // Always call the hook unconditionally to satisfy React's rules of hooks
  const storeQuery = useSavedQueriesStore((state) =>
    state.getQueryById(accountId, queryId),
  );

  // Check system queries first (not stored in state)
  const systemQuery = systemQueries.find((q) => q.id === queryId);
  if (systemQuery) {
    return { ...systemQuery, accountId } as SavedQuery;
  }

  return storeQuery;
}
