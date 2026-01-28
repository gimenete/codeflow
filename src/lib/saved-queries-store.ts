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

// Default queries for a new repository
export const defaultQueries: Omit<SavedQuery, "accountId">[] = [
  {
    id: "my-pulls",
    name: "My Pull Requests",
    icon: "git-pull-request",
    filters: {
      type: "pulls",
      author: "@me",
      state: "open",
    },
  },
  {
    id: "review-requests",
    name: "Review Requests",
    icon: "eye",
    filters: {
      type: "pulls",
      reviewRequested: "@me",
      state: "open",
    },
  },
  {
    id: "my-issues",
    name: "My Issues",
    icon: "issue-opened",
    filters: {
      type: "issues",
      author: "@me",
      state: "open",
    },
  },
  {
    id: "assigned-issues",
    name: "Assigned Issues",
    icon: "issue-opened",
    filters: {
      type: "issues",
      assignee: "@me",
      state: "open",
    },
  },
];

// Default group
const DEFAULT_GROUP_ID = "default";
const DEFAULT_GROUP_TITLE = "Saved Queries";

// Cache for default groups to avoid creating new objects on every render
const defaultGroupsCache = new Map<string, SavedQueryGroup[]>();
// Cache for flattened queries to avoid creating new arrays on every render
const defaultQueriesCache = new Map<string, SavedQuery[]>();

function createDefaultGroups(repositoryId: string): SavedQueryGroup[] {
  const cached = defaultGroupsCache.get(repositoryId);
  if (cached) return cached;

  const queries = defaultQueries.map((q) => ({
    ...q,
    accountId: repositoryId, // Keep field name for backwards compatibility in type
  })) as SavedQuery[];

  // Cache the flattened queries for this repository
  defaultQueriesCache.set(repositoryId, queries);

  const groups: SavedQueryGroup[] = [
    {
      id: DEFAULT_GROUP_ID,
      title: DEFAULT_GROUP_TITLE,
      queries,
    },
  ];

  defaultGroupsCache.set(repositoryId, groups);
  return groups;
}

function getDefaultQueries(repositoryId: string): SavedQuery[] {
  const cached = defaultQueriesCache.get(repositoryId);
  if (cached) return cached;

  // This will also populate the defaultQueriesCache
  createDefaultGroups(repositoryId);
  return defaultQueriesCache.get(repositoryId)!;
}

interface SavedQueriesState {
  // Map of repositoryId -> query groups
  queriesByRepository: Record<string, SavedQueryGroup[]>;

  // Actions (these can mutate state)
  initializeRepository: (repositoryId: string) => void;
  addQuery: (
    repositoryId: string,
    query: Omit<SavedQuery, "id" | "accountId">,
    groupId?: string,
  ) => SavedQuery;
  addGroup: (repositoryId: string, group: SavedQueryGroup) => void;
  updateQuery: (
    repositoryId: string,
    queryId: string,
    updates: Partial<Omit<SavedQuery, "id" | "accountId">>,
  ) => void;
  deleteQuery: (repositoryId: string, queryId: string) => void;
  reorderQueries: (
    repositoryId: string,
    groupId: string,
    queryIds: string[],
  ) => void;
  reorderGroups: (repositoryId: string, groupIds: string[]) => void;
  updateGroup: (
    repositoryId: string,
    groupId: string,
    updates: Partial<Pick<SavedQueryGroup, "title">>,
  ) => void;
  deleteGroup: (repositoryId: string, groupId: string) => void;
  clearQueriesForRepository: (repositoryId: string) => void;
}

export const useSavedQueriesStore = create<SavedQueriesState>()(
  persist(
    (set, get) => ({
      queriesByRepository: {},

      initializeRepository: (repositoryId) => {
        const existing = get().queriesByRepository[repositoryId];
        if (existing) return;

        // Initialize with defaults
        const initial = createDefaultGroups(repositoryId);
        set((state) => ({
          queriesByRepository: {
            ...state.queriesByRepository,
            [repositoryId]: initial,
          },
        }));
      },

      addQuery: (repositoryId, query, groupId) => {
        // Ensure repository is initialized
        get().initializeRepository(repositoryId);

        const groups = get().queriesByRepository[repositoryId] ?? [];
        const allQueries = groups.flatMap((g) => g.queries);
        const existingIds = allQueries.map((q) => q.id);
        const systemIds = systemQueries.map((q) => q.id);
        const defaultIds = defaultQueries.map((q) => q.id);
        const allIds = [...existingIds, ...systemIds, ...defaultIds];

        const id = generateUniqueId(query.name, allIds);
        const newQuery: SavedQuery = {
          ...query,
          id,
          accountId: repositoryId,
        };

        // Find target group (default to first group)
        const targetGroupId = groupId ?? groups[0]?.id ?? DEFAULT_GROUP_ID;

        set((state) => {
          const currentGroups =
            state.queriesByRepository[repositoryId] ??
            createDefaultGroups(repositoryId);
          const updatedGroups = currentGroups.map((g) =>
            g.id === targetGroupId
              ? { ...g, queries: [...g.queries, newQuery] }
              : g,
          );
          return {
            queriesByRepository: {
              ...state.queriesByRepository,
              [repositoryId]: updatedGroups,
            },
          };
        });
        return newQuery;
      },

      addGroup: (repositoryId, group) => {
        set((state) => {
          const currentGroups =
            state.queriesByRepository[repositoryId] ??
            createDefaultGroups(repositoryId);
          return {
            queriesByRepository: {
              ...state.queriesByRepository,
              [repositoryId]: [...currentGroups, group],
            },
          };
        });
      },

      updateQuery: (repositoryId, queryId, updates) => {
        set((state) => {
          const groups = state.queriesByRepository[repositoryId] ?? [];
          const updatedGroups = groups.map((g) => ({
            ...g,
            queries: g.queries.map((q) =>
              q.id === queryId ? { ...q, ...updates } : q,
            ),
          }));
          return {
            queriesByRepository: {
              ...state.queriesByRepository,
              [repositoryId]: updatedGroups,
            },
          };
        });
      },

      deleteQuery: (repositoryId, queryId) => {
        set((state) => {
          const groups = state.queriesByRepository[repositoryId] ?? [];
          const updatedGroups = groups.map((g) => ({
            ...g,
            queries: g.queries.filter((q) => q.id !== queryId),
          }));
          return {
            queriesByRepository: {
              ...state.queriesByRepository,
              [repositoryId]: updatedGroups,
            },
          };
        });
      },

      reorderQueries: (repositoryId, groupId, queryIds) => {
        set((state) => {
          const groups = state.queriesByRepository[repositoryId] ?? [];
          const updatedGroups = groups.map((g) => {
            if (g.id !== groupId) return g;
            const queryMap = new Map(g.queries.map((q) => [q.id, q]));
            const reordered = queryIds
              .map((id) => queryMap.get(id))
              .filter((q): q is SavedQuery => q !== undefined);
            return { ...g, queries: reordered };
          });
          return {
            queriesByRepository: {
              ...state.queriesByRepository,
              [repositoryId]: updatedGroups,
            },
          };
        });
      },

      reorderGroups: (repositoryId, groupIds) => {
        set((state) => {
          const groups = state.queriesByRepository[repositoryId] ?? [];
          const groupMap = new Map(groups.map((g) => [g.id, g]));
          const reordered = groupIds
            .map((id) => groupMap.get(id))
            .filter((g): g is SavedQueryGroup => g !== undefined);
          return {
            queriesByRepository: {
              ...state.queriesByRepository,
              [repositoryId]: reordered,
            },
          };
        });
      },

      updateGroup: (repositoryId, groupId, updates) => {
        set((state) => {
          const groups = state.queriesByRepository[repositoryId] ?? [];
          const updatedGroups = groups.map((g) =>
            g.id === groupId ? { ...g, ...updates } : g,
          );
          return {
            queriesByRepository: {
              ...state.queriesByRepository,
              [repositoryId]: updatedGroups,
            },
          };
        });
      },

      deleteGroup: (repositoryId, groupId) => {
        if (groupId === "default") return; // Prevent deleting default group
        set((state) => {
          const groups = state.queriesByRepository[repositoryId] ?? [];
          return {
            queriesByRepository: {
              ...state.queriesByRepository,
              [repositoryId]: groups.filter((g) => g.id !== groupId),
            },
          };
        });
      },

      clearQueriesForRepository: (repositoryId) => {
        set((state) => {
          const rest = Object.fromEntries(
            Object.entries(state.queriesByRepository).filter(
              ([key]) => key !== repositoryId,
            ),
          );
          return { queriesByRepository: rest };
        });
      },
    }),
    {
      name: "codeflow:saved-queries-v2", // New key, no migration needed
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Pure selector functions (no side effects)
function getQueryGroupsFromState(
  state: SavedQueriesState,
  repositoryId: string,
): SavedQueryGroup[] {
  return (
    state.queriesByRepository[repositoryId] ?? createDefaultGroups(repositoryId)
  );
}

// Cache for flattened queries derived from store state (keyed by repositoryId + groups reference)
const flattenedQueriesCache = new WeakMap<SavedQueryGroup[], SavedQuery[]>();

function getQueriesFromState(
  state: SavedQueriesState,
  repositoryId: string,
): SavedQuery[] {
  const groups = state.queriesByRepository[repositoryId];

  // If no persisted groups, use the cached default queries
  if (!groups) {
    return getDefaultQueries(repositoryId);
  }

  // Check if we already computed the flattened queries for these groups
  const cached = flattenedQueriesCache.get(groups);
  if (cached) return cached;

  // Compute and cache
  const queries = groups.flatMap((g) => g.queries);
  flattenedQueriesCache.set(groups, queries);
  return queries;
}

function getQueryByIdFromState(
  state: SavedQueriesState,
  repositoryId: string,
  queryId: string,
): SavedQuery | null {
  // Check system queries first
  const systemQuery = systemQueries.find((q) => q.id === queryId);
  if (systemQuery) {
    return { ...systemQuery, accountId: repositoryId } as SavedQuery;
  }
  const queries = getQueriesFromState(state, repositoryId);
  return queries.find((q) => q.id === queryId) ?? null;
}

// Non-hook helper for synchronous access (e.g., from event handlers)
export function getQueryById(
  repositoryId: string,
  queryId: string,
): SavedQuery | null {
  return getQueryByIdFromState(
    useSavedQueriesStore.getState(),
    repositoryId,
    queryId,
  );
}

// React hooks for components - use pure selectors
export function useSavedQueryGroups(repositoryId: string): SavedQueryGroup[] {
  return useSavedQueriesStore((state) =>
    getQueryGroupsFromState(state, repositoryId),
  );
}

export function useSavedQueries(repositoryId: string): SavedQuery[] {
  return useSavedQueriesStore((state) =>
    getQueriesFromState(state, repositoryId),
  );
}

export function useQueryById(
  repositoryId: string,
  queryId: string,
): SavedQuery | null {
  return useSavedQueriesStore((state) =>
    getQueryByIdFromState(state, repositoryId, queryId),
  );
}
