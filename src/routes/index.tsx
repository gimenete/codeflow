import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccounts, getAccount, getAccounts } from "@/lib/auth";
import { isElectron } from "@/lib/platform";
import {
  useRepositoriesStore,
  useRepositories,
} from "@/lib/repositories-store";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { AddRepositoryDialog } from "@/components/repositories/add-repository-dialog";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Try to redirect to last visited account or repository
    try {
      const raw = localStorage.getItem("codeflow:last-visited");
      if (raw) {
        const last = JSON.parse(raw) as { type: string; id: string };
        if (last.type === "account" && last.id) {
          const account = getAccount(last.id);
          if (account) {
            throw redirect({
              to: "/accounts/$account",
              params: { account: last.id },
            });
          }
        } else if (last.type === "repository" && last.id) {
          const repository = useRepositoriesStore
            .getState()
            .getRepositoryBySlug(last.id);
          if (repository) {
            throw redirect({
              to: "/repositories/$repository",
              params: { repository: last.id },
            });
          }
        }
      }
    } catch (e) {
      // Re-throw redirects
      if (e instanceof Response || (e && typeof e === "object" && "to" in e)) {
        throw e;
      }
      // Ignore parse errors, fall through to defaults below
    }

    // No saved location — try first repository, then first account
    const repositories = useRepositoriesStore.getState().getRepositories();
    if (repositories.length > 0) {
      throw redirect({
        to: "/repositories/$repository",
        params: { repository: repositories[0].slug },
      });
    }

    const accounts = getAccounts();
    if (accounts.length > 0) {
      throw redirect({
        to: "/accounts/$account",
        params: { account: accounts[0].id },
      });
    }
  },
  component: HomePage,
});

function HomePage() {
  const { accounts } = useAccounts();
  const repositories = useRepositories();
  const [isAddAccountOpen, setAddAccountOpen] = useState(false);
  const [isAddRepositoryOpen, setAddRepositoryOpen] = useState(false);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Welcome to Codeflow</h1>
          <p className="text-muted-foreground">
            {accounts.length === 0 && repositories.length === 0
              ? "Get started by adding a GitHub account or a repository."
              : "Select a repository or account to get started."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          {isElectron() && (
            <Button onClick={() => setAddRepositoryOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Repository
            </Button>
          )}
          <Button
            variant={isElectron() ? "outline" : "default"}
            onClick={() => setAddAccountOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Account
          </Button>
        </div>
      </div>

      <AddAccountDialog
        open={isAddAccountOpen}
        onOpenChange={setAddAccountOpen}
      />
      {isElectron() && (
        <AddRepositoryDialog
          open={isAddRepositoryOpen}
          onOpenChange={setAddRepositoryOpen}
        />
      )}
    </div>
  );
}
