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
import type { Repository } from "@/lib/github-types";
import { useRepositoriesStore } from "@/lib/repositories-store";
import { useBranchesByRepositoryId } from "@/lib/branches-store";

interface RepositoryCardProps {
  repository: Repository;
}

export function RepositoryCard({ repository }: RepositoryCardProps) {
  const deleteRepository = useRepositoriesStore(
    (state) => state.deleteRepository,
  );
  const branches = useBranchesByRepositoryId(repository.id);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteRepository(repository.id);
  };

  return (
    <Link
      to="/repositories/$repository"
      params={{ repository: repository.slug }}
      className="block"
    >
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer relative group">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{repository.name}</CardTitle>
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
                  Remove Repository
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription className="text-xs truncate">
            {repository.path}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {repository.githubOwner && repository.githubRepo && (
              <span>
                {repository.githubOwner}/{repository.githubRepo}
              </span>
            )}
            {branches.length > 0 && (
              <span className="flex items-center gap-1">
                <GitBranch className="h-3.5 w-3.5" />
                {branches.length} tracked branch
                {branches.length !== 1 ? "es" : ""}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
