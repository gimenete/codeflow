import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GitBranch, Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectsStore } from "@/lib/projects-store";
import { useTasksByProjectId, useTasksStore } from "@/lib/tasks-store";
import { RelativeTime } from "@/components/relative-time";
import { CreateTaskDialog } from "@/components/projects/create-task-dialog";

export const Route = createFileRoute("/projects/$project/tasks/")({
  component: TasksListPage,
});

function TasksListPage() {
  const { project: projectSlug } = Route.useParams();
  const project = useProjectsStore((state) =>
    state.getProjectBySlug(projectSlug),
  );
  const tasks = useTasksByProjectId(project?.id ?? "");
  const deleteTask = useTasksStore((state) => state.deleteTask);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  if (!project) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Project not found
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-muted-foreground">
              Manage your work branches and Claude conversations
            </p>
          </div>
          <Button onClick={() => setCreateTaskOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>

        {tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
              <p className="text-muted-foreground mb-4">
                Create a task to start working on a feature or fix
              </p>
              <Button onClick={() => setCreateTaskOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first task
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <Link
                key={task.id}
                to="/projects/$project/tasks/$task"
                params={{ project: projectSlug, task: task.id }}
                className="block"
              >
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer relative group h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <CardTitle className="text-base truncate">
                          {task.branch}
                        </CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              deleteTask(task.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription className="text-xs">
                      Created <RelativeTime date={task.createdAt} />
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {task.conversationId
                        ? "Has conversation"
                        : "No conversation yet"}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <CreateTaskDialog
          projectId={project.id}
          projectPath={project.path}
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
        />
      </div>
    </div>
  );
}
