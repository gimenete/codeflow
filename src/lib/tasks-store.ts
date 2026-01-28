import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Task } from "./github-types";

function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Generate a task identifier from branch name (URL-friendly)
export function taskIdFromBranch(branch: string): string {
  return branch
    .replace(/\//g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase();
}

interface TasksState {
  tasks: Task[];

  // Actions
  getTasks: () => Task[];
  getTasksByProjectId: (projectId: string) => Task[];
  getTaskById: (id: string) => Task | null;
  getTaskByBranch: (projectId: string, branch: string) => Task | null;
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => Task;
  updateTask: (
    id: string,
    updates: Partial<Omit<Task, "id" | "createdAt">>,
  ) => void;
  deleteTask: (id: string) => void;
  deleteTasksByProjectId: (projectId: string) => void;
  linkConversation: (taskId: string, conversationId: string) => void;
}

export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      tasks: [],

      getTasks: () => {
        return get().tasks;
      },

      getTasksByProjectId: (projectId) => {
        return get().tasks.filter((t) => t.projectId === projectId);
      },

      getTaskById: (id) => {
        return get().tasks.find((t) => t.id === id) ?? null;
      },

      getTaskByBranch: (projectId, branch) => {
        return (
          get().tasks.find(
            (t) => t.projectId === projectId && t.branch === branch,
          ) ?? null
        );
      },

      addTask: (task) => {
        const now = new Date().toISOString();

        const newTask: Task = {
          ...task,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));

        return newTask;
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));
      },

      deleteTasksByProjectId: (projectId) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.projectId !== projectId),
        }));
      },

      linkConversation: (taskId, conversationId) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  conversationId,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        }));
      },
    }),
    {
      name: "codeflow:tasks",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        // Handle future migrations here
        if (version < 1) {
          return { tasks: [] };
        }
        return persistedState as TasksState;
      },
    },
  ),
);

// React hooks for components
export function useTasks(): Task[] {
  return useTasksStore((state) => state.tasks);
}

export function useTasksByProjectId(projectId: string): Task[] {
  const tasks = useTasksStore((state) => state.tasks);
  return tasks.filter((t) => t.projectId === projectId);
}

export function useTaskById(id: string): Task | null {
  const tasks = useTasksStore((state) => state.tasks);
  return tasks.find((t) => t.id === id) ?? null;
}

export function useTaskByBranch(
  projectId: string,
  branch: string,
): Task | null {
  const tasks = useTasksStore((state) => state.tasks);
  return (
    tasks.find((t) => t.projectId === projectId && t.branch === branch) ?? null
  );
}
