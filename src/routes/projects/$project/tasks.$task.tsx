import { useEffect } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useProjectsStore } from "@/lib/projects-store";
import { useTasksStore, useTaskById } from "@/lib/tasks-store";
import { TaskChat } from "@/components/projects/task-chat";
import { TaskDiffPanel } from "@/components/projects/task-diff-panel";

export const Route = createFileRoute("/projects/$project/tasks/$task")({
  beforeLoad: ({ params }) => {
    const project = useProjectsStore
      .getState()
      .getProjectBySlug(params.project);
    if (!project) {
      throw redirect({ to: "/", search: { addAccount: false } });
    }

    return { project };
  },
  component: TaskDetailPage,
});

function TaskDetailPage() {
  const { project } = Route.useRouteContext();
  const { task: taskId } = Route.useParams();
  const task = useTaskById(taskId);
  const navigate = useNavigate();

  // Redirect if task not found (after hydration)
  useEffect(() => {
    if (task === null) {
      // Give hydration a moment, then redirect if still not found
      const timeout = setTimeout(() => {
        const currentTask = useTasksStore.getState().getTaskById(taskId);
        if (!currentTask || currentTask.projectId !== project.id) {
          void navigate({
            to: "/projects/$project/tasks",
            params: { project: project.slug },
          });
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [task, taskId, project, navigate]);

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading task...</div>
      </div>
    );
  }

  const cwd = task.worktreePath || project.path;

  return (
    <div className="flex h-full">
      {/* Chat Panel */}
      <div className="flex-1 min-w-0">
        <TaskChat task={task} cwd={cwd} />
      </div>

      {/* Diff Panel */}
      <div className="w-80 shrink-0">
        <TaskDiffPanel task={task} projectPath={cwd} />
      </div>
    </div>
  );
}
