import { Link } from "@tanstack/react-router";
import { GitBranch, MoreHorizontal, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project } from "@/lib/github-types";
import { useProjectsStore } from "@/lib/projects-store";
import { useTasksByProjectId } from "@/lib/tasks-store";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const deleteProject = useProjectsStore((state) => state.deleteProject);
  const tasks = useTasksByProjectId(project.id);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteProject(project.id);
  };

  return (
    <Link
      to="/projects/$project"
      params={{ project: project.slug }}
      className="block"
    >
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer relative group">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription className="text-xs truncate">
            {project.path}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {project.githubOwner && project.githubRepo && (
              <span>
                {project.githubOwner}/{project.githubRepo}
              </span>
            )}
            {tasks.length > 0 && (
              <span className="flex items-center gap-1">
                <GitBranch className="h-3.5 w-3.5" />
                {tasks.length} task{tasks.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
