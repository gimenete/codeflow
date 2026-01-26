import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { RepoIcon } from "@primer/octicons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocalRepositories, useAddRepositoryDialog } from "@/lib/git";
import { AddRepositoryDialog } from "@/components/add-repository-dialog";

export const Route = createFileRoute("/git/")({
  component: GitIndexPage,
});

function GitIndexPage() {
  const { repositories } = useLocalRepositories();
  const { isOpen, setOpen } = useAddRepositoryDialog();

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RepoIcon size={24} />
            Local Repositories
          </h1>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Repository
          </Button>
        </div>

        {repositories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <RepoIcon size={48} className="mx-auto mb-4 opacity-50" />
              No local repositories configured.
              <br />
              Click "Add Repository" to add a git repository from your
              filesystem.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repositories.map((repo) => (
              <Link
                key={repo.id}
                to="/git/$repo"
                params={{ repo: repo.id }}
                className="block"
              >
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <RepoIcon size={16} />
                      {repo.name}
                    </CardTitle>
                    <CardDescription className="text-xs truncate">
                      {repo.path}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <AddRepositoryDialog open={isOpen} onOpenChange={setOpen} />
      </div>
    </div>
  );
}
