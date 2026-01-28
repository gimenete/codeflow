import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderKanban, Plus, User } from "lucide-react";
import { RepoIcon } from "@primer/octicons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAccounts, useAddAccountDialog } from "@/lib/auth";
import { useLocalRepositories, useAddRepositoryDialog } from "@/lib/git";
import { isElectron } from "@/lib/platform";
import { useRepositories } from "@/lib/repositories-store";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { AddRepositoryDialog as AddLegacyRepositoryDialog } from "@/components/add-repository-dialog";
import { AddRepositoryDialog } from "@/components/repositories/add-repository-dialog";
import { RepositoryCard } from "@/components/repositories/repository-card";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    addAccount: search.addAccount === true,
  }),
  component: HomePage,
});

function HomePage() {
  const { addAccount } = Route.useSearch();
  const { accounts } = useAccounts();
  const { repositories: legacyRepositories } = useLocalRepositories();
  const repositories = useRepositories();
  const { isOpen: isAddAccountOpen, setOpen: setAddAccountOpen } =
    useAddAccountDialog(addAccount);
  const { isOpen: isAddRepoOpen, setOpen: setAddRepoOpen } =
    useAddRepositoryDialog();
  const [isAddRepositoryOpen, setAddRepositoryOpen] = useState(false);

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto py-6 px-4 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Welcome to Codeflow</h1>
        </div>

        {isElectron() && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Repositories
              </h2>
              <Button size="sm" onClick={() => setAddRepositoryOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Repository
              </Button>
            </div>

            {repositories.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No repositories yet.
                  <br />
                  Click "Add Repository" to add your first repository.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {repositories.map((repository) => (
                  <RepositoryCard key={repository.id} repository={repository} />
                ))}
              </div>
            )}
          </section>
        )}

        {isElectron() && legacyRepositories.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <RepoIcon size={20} />
                Local Repositories (Legacy)
              </h2>
              <Button size="sm" onClick={() => setAddRepoOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Repository
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {legacyRepositories.map((repo) => (
                <Link
                  key={repo.id}
                  to="/git/$repo"
                  params={{ repo: repo.id }}
                  className="block"
                >
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{repo.name}</CardTitle>
                      <CardDescription className="text-xs truncate">
                        {repo.path}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              GitHub Accounts
            </h2>
            <Button size="sm" onClick={() => setAddAccountOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Account
            </Button>
          </div>

          {accounts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No GitHub accounts configured.
                <br />
                Click "Add Account" to connect your GitHub account.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={account.avatarUrl} />
                        <AvatarFallback>
                          {account.login.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          @{account.login}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {account.host}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </section>

        <AddAccountDialog
          open={isAddAccountOpen}
          onOpenChange={setAddAccountOpen}
        />
        {isElectron() && (
          <>
            <AddRepositoryDialog
              open={isAddRepositoryOpen}
              onOpenChange={setAddRepositoryOpen}
            />
            <AddLegacyRepositoryDialog
              open={isAddRepoOpen}
              onOpenChange={setAddRepoOpen}
            />
          </>
        )}
      </div>
    </div>
  );
}
