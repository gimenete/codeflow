import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Repository, AgentType, IssueTracker } from "./github-types";
import { getAccount } from "./auth";
import { isGitHubUrl } from "./remote-url";

// Types for migration from v2
interface RepositoryV2 {
  id: string;
  slug: string;
  name: string;
  path: string;
  githubAccountId: string | null;
  githubOwner: string | null;
  githubRepo: string | null;
  createdAt: string;
  updatedAt: string;
}

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
      version: 4,
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

        // Migration from version 2: convert GitHub fields to new format
        if (version < 3) {
          const state = persistedState as { repositories: RepositoryV2[] };
          const migratedRepositories: Repository[] = state.repositories.map(
            (repo) => {
              // Build remote URL from old GitHub fields
              let remoteUrl: string | null = null;
              if (repo.githubOwner && repo.githubRepo) {
                const account = repo.githubAccountId
                  ? getAccount(repo.githubAccountId)
                  : null;
                const host = account?.host ?? "github.com";
                remoteUrl = `https://${host}/${repo.githubOwner}/${repo.githubRepo}`;
              }

              // Determine issue tracker based on remote URL
              const issueTracker: IssueTracker | null = isGitHubUrl(remoteUrl)
                ? "github"
                : null;

              return {
                id: repo.id,
                slug: repo.slug,
                name: repo.name,
                path: repo.path || null, // Convert empty string to null
                accountId: repo.githubAccountId,
                remoteUrl,
                agent: "claude" as AgentType,
                issueTracker,
                worktreesDirectory: null,
                branchPrefix: null,
                createdAt: repo.createdAt,
                updatedAt: repo.updatedAt,
              };
            },
          );

          return { repositories: migratedRepositories };
        }

        // Migration from version 3: add worktreesDirectory and branchPrefix
        if (version < 4) {
          const state = persistedState as { repositories: Repository[] };
          return {
            repositories: state.repositories.map((repo) => ({
              ...repo,
              worktreesDirectory: repo.worktreesDirectory ?? null,
              branchPrefix: repo.branchPrefix ?? null,
            })),
          };
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
