import { Link, useParams, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  GitBranch,
  GitPullRequest,
  CircleDot,
  ListTodo,
  Plus,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Project } from "@/lib/github-types";
import { useTasksByProjectId } from "@/lib/tasks-store";
import { CreateTaskDialog } from "./create-task-dialog";

interface ProjectSidebarProps {
  project: Project;
}

export function ProjectSidebar({ project }: ProjectSidebarProps) {
  const { project: projectSlug, task } = useParams({ strict: false });
  const location = useLocation();
  const tasks = useTasksByProjectId(project.id);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  return (
    <div className="w-64 border-r bg-muted/10 flex flex-col h-full">
      {/* Project Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold truncate">{project.name}</h2>
        {project.githubOwner && project.githubRepo && (
          <p className="text-xs text-muted-foreground truncate">
            {project.githubOwner}/{project.githubRepo}
          </p>
        )}
      </div>

      <ScrollArea className="flex-1">
        {/* Navigation */}
        <div className="p-2">
          <div className="space-y-1">
            <Link
              to="/projects/$project/tasks"
              params={{ project: projectSlug! }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                location.pathname.includes("/tasks")
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
              )}
            >
              <ListTodo className="h-4 w-4" />
              Tasks
            </Link>

            {project.githubOwner && project.githubRepo && (
              <>
                <Link
                  to="/projects/$project/issues"
                  params={{ project: projectSlug! }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    location.pathname.includes("/issues")
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <CircleDot className="h-4 w-4" />
                  Issues
                </Link>

                <Link
                  to="/projects/$project/pulls"
                  params={{ project: projectSlug! }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    location.pathname.includes("/pulls")
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <GitPullRequest className="h-4 w-4" />
                  Pull Requests
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Tasks Section */}
        <div className="p-2 border-t">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tasks
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCreateTaskOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1">
            {tasks.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No tasks yet
              </p>
            ) : (
              tasks.map((t) => (
                <Link
                  key={t.id}
                  to="/projects/$project/tasks/$task"
                  params={{ project: projectSlug!, task: t.id }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    task === t.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <GitBranch className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t.branch}</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 opacity-50" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Pull Requests Section - Quick links */}
        {project.githubOwner && project.githubRepo && (
          <div className="p-2 border-t">
            <div className="px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Pull Requests
              </span>
            </div>
            <div className="space-y-1">
              <Link
                to="/projects/$project/pulls"
                params={{ project: projectSlug! }}
                search={{ filter: "open" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                Open
              </Link>
              <Link
                to="/projects/$project/pulls"
                params={{ project: projectSlug! }}
                search={{ filter: "created" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                Created by me
              </Link>
              <Link
                to="/projects/$project/pulls"
                params={{ project: projectSlug! }}
                search={{ filter: "review" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                Review requested
              </Link>
            </div>
          </div>
        )}

        {/* Issues Section - Quick links */}
        {project.githubOwner && project.githubRepo && (
          <div className="p-2 border-t">
            <div className="px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Issues
              </span>
            </div>
            <div className="space-y-1">
              <Link
                to="/projects/$project/issues"
                params={{ project: projectSlug! }}
                search={{ filter: "open" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                Open
              </Link>
              <Link
                to="/projects/$project/issues"
                params={{ project: projectSlug! }}
                search={{ filter: "created" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                Created by me
              </Link>
              <Link
                to="/projects/$project/issues"
                params={{ project: projectSlug! }}
                search={{ filter: "assigned" }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                Assigned to me
              </Link>
            </div>
          </div>
        )}
      </ScrollArea>

      <CreateTaskDialog
        projectId={project.id}
        projectPath={project.path}
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
      />
    </div>
  );
}
