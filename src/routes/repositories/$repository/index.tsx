import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRepositoriesStore } from "@/lib/repositories-store";
import { useBranchesStore } from "@/lib/branches-store";
import { parseRemoteUrl } from "@/lib/remote-url";
import { getCurrentBranch } from "@/lib/git";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/repositories/$repository/")({
  component: RepositoryIndexRedirect,
});

function RepositoryIndexRedirect() {
  const { repository: repositorySlug } = Route.useParams();
  const repository = useRepositoriesStore((state) =>
    state.getRepositoryBySlug(repositorySlug),
  );
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repository) return;

    async function doRedirect() {
      if (repository!.path) {
        try {
          const branchName = await getCurrentBranch(repository!.path);
          const { getBranchByName, addBranch } = useBranchesStore.getState();
          let tracked = getBranchByName(repository!.id, branchName);
          if (!tracked) {
            tracked = addBranch({
              repositoryId: repository!.id,
              branch: branchName,
              worktreePath: null,
              conversationId: null,
              pullNumber: null,
              pullOwner: null,
              pullRepo: null,
            });
          }
          void navigate({
            to: "/repositories/$repository/branches/$branch/agent",
            params: { repository: repositorySlug, branch: tracked.id },
            replace: true,
          });
        } catch {
          setError("Failed to determine current branch.");
        }
      } else {
        const remoteInfo = parseRemoteUrl(repository!.remoteUrl);
        const hasRemote = repository!.accountId && remoteInfo;
        if (hasRemote) {
          void navigate({
            to: "/repositories/$repository/queries/$query",
            params: { repository: repositorySlug, query: "issues" },
            replace: true,
          });
        } else {
          setError(
            "This repository has no local path and no remote configured.",
          );
        }
      }
    }

    void doRedirect();
  }, [repository, repositorySlug, navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
