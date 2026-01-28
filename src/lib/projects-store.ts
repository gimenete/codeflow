import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Project } from "./github-types";

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
  if (!baseSlug) return `project-${Date.now()}`;
  if (!existingSlugs.includes(baseSlug)) return baseSlug;

  let counter = 1;
  while (existingSlugs.includes(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
}

function generateId(): string {
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface ProjectsState {
  projects: Project[];

  // Actions
  getProjects: () => Project[];
  getProjectById: (id: string) => Project | null;
  getProjectBySlug: (slug: string) => Project | null;
  addProject: (
    project: Omit<Project, "id" | "slug" | "createdAt" | "updatedAt">,
  ) => Project;
  updateProject: (
    id: string,
    updates: Partial<Omit<Project, "id" | "createdAt">>,
  ) => void;
  deleteProject: (id: string) => void;
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: [],

      getProjects: () => {
        return get().projects;
      },

      getProjectById: (id) => {
        return get().projects.find((p) => p.id === id) ?? null;
      },

      getProjectBySlug: (slug) => {
        return get().projects.find((p) => p.slug === slug) ?? null;
      },

      addProject: (project) => {
        const existingSlugs = get().projects.map((p) => p.slug);
        const slug = generateUniqueSlug(project.name, existingSlugs);
        const now = new Date().toISOString();

        const newProject: Project = {
          ...project,
          id: generateId(),
          slug,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          projects: [...state.projects, newProject],
        }));

        return newProject;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
        }));
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));
      },
    }),
    {
      name: "codeflow:projects",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        // Handle future migrations here
        if (version < 1) {
          return { projects: [] };
        }
        return persistedState as ProjectsState;
      },
    },
  ),
);

// React hooks for components
export function useProjects(): Project[] {
  return useProjectsStore((state) => state.projects);
}

export function useProjectById(id: string): Project | null {
  return useProjectsStore((state) => state.getProjectById(id));
}

export function useProjectBySlug(slug: string): Project | null {
  return useProjectsStore((state) => state.getProjectBySlug(slug));
}
