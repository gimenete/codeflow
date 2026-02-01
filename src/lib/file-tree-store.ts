import { create } from "zustand";
import type { FileTreeEntry } from "./fs";

interface FileTreeState {
  // Map from rootPath to tree state
  expandedPathsByRoot: Map<string, Set<string>>;
  entriesByRoot: Map<string, FileTreeEntry[]>;

  // Actions
  getExpandedPaths: (rootPath: string) => Set<string>;
  setExpandedPaths: (rootPath: string, paths: Set<string>) => void;
  togglePath: (rootPath: string, path: string, expanded: boolean) => void;

  getEntries: (rootPath: string) => FileTreeEntry[];
  setEntries: (rootPath: string, entries: FileTreeEntry[]) => void;
  updateEntryChildren: (
    rootPath: string,
    targetPath: string,
    children: FileTreeEntry[],
  ) => void;

  // Clear state for a root
  clearRoot: (rootPath: string) => void;
}

// Helper function to update children in a nested tree
function updateEntryChildrenHelper(
  entries: FileTreeEntry[],
  targetPath: string,
  children: FileTreeEntry[],
): FileTreeEntry[] {
  return entries.map((entry) => {
    if (entry.path === targetPath) {
      return { ...entry, children };
    }
    if (entry.children) {
      return {
        ...entry,
        children: updateEntryChildrenHelper(
          entry.children,
          targetPath,
          children,
        ),
      };
    }
    return entry;
  });
}

export const useFileTreeStore = create<FileTreeState>()((set, get) => ({
  expandedPathsByRoot: new Map(),
  entriesByRoot: new Map(),

  getExpandedPaths: (rootPath) => {
    return get().expandedPathsByRoot.get(rootPath) ?? new Set();
  },

  setExpandedPaths: (rootPath, paths) => {
    set((state) => {
      const newMap = new Map(state.expandedPathsByRoot);
      newMap.set(rootPath, paths);
      return { expandedPathsByRoot: newMap };
    });
  },

  togglePath: (rootPath, path, expanded) => {
    set((state) => {
      const newMap = new Map(state.expandedPathsByRoot);
      const current = newMap.get(rootPath) ?? new Set();
      const newPaths = new Set(current);
      if (expanded) {
        newPaths.add(path);
      } else {
        newPaths.delete(path);
      }
      newMap.set(rootPath, newPaths);
      return { expandedPathsByRoot: newMap };
    });
  },

  getEntries: (rootPath) => {
    return get().entriesByRoot.get(rootPath) ?? [];
  },

  setEntries: (rootPath, entries) => {
    set((state) => {
      const newMap = new Map(state.entriesByRoot);
      newMap.set(rootPath, entries);
      return { entriesByRoot: newMap };
    });
  },

  updateEntryChildren: (rootPath, targetPath, children) => {
    set((state) => {
      const entries = state.entriesByRoot.get(rootPath) ?? [];
      const newEntries = updateEntryChildrenHelper(
        entries,
        targetPath,
        children,
      );
      const newMap = new Map(state.entriesByRoot);
      newMap.set(rootPath, newEntries);
      return { entriesByRoot: newMap };
    });
  },

  clearRoot: (rootPath) => {
    set((state) => {
      const newExpanded = new Map(state.expandedPathsByRoot);
      const newEntries = new Map(state.entriesByRoot);
      newExpanded.delete(rootPath);
      newEntries.delete(rootPath);
      return { expandedPathsByRoot: newExpanded, entriesByRoot: newEntries };
    });
  },
}));

// Stable fallback values to avoid infinite loops in selectors
const EMPTY_SET = new Set<string>();
const EMPTY_ARRAY: FileTreeEntry[] = [];

// React hooks for components
export function useFileTreeExpandedPaths(rootPath: string): Set<string> {
  return useFileTreeStore(
    (state) => state.expandedPathsByRoot.get(rootPath) ?? EMPTY_SET,
  );
}

export function useFileTreeEntries(rootPath: string): FileTreeEntry[] {
  return useFileTreeStore(
    (state) => state.entriesByRoot.get(rootPath) ?? EMPTY_ARRAY,
  );
}
