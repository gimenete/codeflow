import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Repository } from "./github-types";

// Slugify helper
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateUniqueSlug(name: string, existingSlugs: string[]): string {
  const baseSlug = slugify(name);
  if (!baseSlug) return `repo-${Date.now()}`;
  if (!existingSlugs.includes(baseSlug)) return baseSlug;

  let counter = 1;
  while (existingSlugs.includes(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
}

function generateId(): string {
  return `repo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface RepositoriesState {
  repositories: Repository[];

  // Actions
  getRepositories: () => Repository[];
  getRepositoryById: (id: string) => Repository | null;
  getRepositoryBySlug: (slug: string) => Repository | null;
  addRepository: (
    repository: Omit<Repository, "id" | "slug" | "createdAt" | "updatedAt">,
  ) => Repository;
  updateRepository: (
    id: string,
    updates: Partial<Omit<Repository, "id" | "createdAt">>,
  ) => void;
  deleteRepository: (id: string) => void;
}

export const useRepositoriesStore = create<RepositoriesState>()(
  persist(
    (set, get) => ({
      repositories: [],

      getRepositories: () => {
        return get().repositories;
      },

      getRepositoryById: (id) => {
        return get().repositories.find((r) => r.id === id) ?? null;
      },

      getRepositoryBySlug: (slug) => {
        return get().repositories.find((r) => r.slug === slug) ?? null;
      },

      addRepository: (repository) => {
        const existingSlugs = get().repositories.map((r) => r.slug);
        const slug = generateUniqueSlug(repository.name, existingSlugs);
        const now = new Date().toISOString();

        const newRepository: Repository = {
          ...repository,
          id: generateId(),
          slug,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          repositories: [...state.repositories, newRepository],
        }));

        return newRepository;
      },

      updateRepository: (id, updates) => {
        set((state) => ({
          repositories: state.repositories.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                }
              : r,
          ),
        }));
      },

      deleteRepository: (id) => {
        set((state) => ({
          repositories: state.repositories.filter((r) => r.id !== id),
        }));
      },
    }),
    {
      name: "codeflow:repositories",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        // Migration from version 1 (old "codeflow:projects" format)
        if (version < 2) {
          // Check if we need to migrate from old projects store
          const oldData = localStorage.getItem("codeflow:projects");
          if (oldData) {
            try {
              const parsed = JSON.parse(oldData);
              if (parsed.state?.projects) {
                // Migrate projects to repositories
                return { repositories: parsed.state.projects };
              }
            } catch {
              // Ignore parse errors
            }
          }
          return { repositories: [] };
        }
        return persistedState as RepositoriesState;
      },
    },
  ),
);

// React hooks for components
export function useRepositories(): Repository[] {
  return useRepositoriesStore((state) => state.repositories);
}

export function useRepositoryById(id: string): Repository | null {
  return useRepositoriesStore((state) => state.getRepositoryById(id));
}

export function useRepositoryBySlug(slug: string): Repository | null {
  return useRepositoriesStore((state) => state.getRepositoryBySlug(slug));
}
