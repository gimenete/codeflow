import { getAccount } from "@/lib/auth";
import { useRepositoriesStore } from "@/lib/repositories-store";
import { parseRemoteUrl } from "@/lib/remote-url";
import { GitHubPull } from "@/components/github-pull";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/repositories/$repository/pulls/$number")(
  {
    beforeLoad: ({ params }) => {
      const repository = useRepositoriesStore
        .getState()
        .getRepositoryBySlug(params.repository);
      if (!repository) {
        throw redirect({ to: "/", search: { addAccount: false } });
      }
      const remoteInfo = parseRemoteUrl(repository.remoteUrl);
      if (!repository.accountId || !remoteInfo) {
        throw redirect({
          to: "/repositories/$repository/branches",
          params: { repository: params.repository },
        });
      }
      const account = getAccount(repository.accountId);
      if (!account) {
        throw redirect({ to: "/", search: { addAccount: false } });
      }
      return { repository, account, remoteInfo };
    },
    component: PullRequestDetail,
  },
);

function PullRequestDetail() {
  const { repository: repositorySlug, number } = Route.useParams();
  const { account, remoteInfo } = Route.useRouteContext();

  return (
    <GitHubPull
      accountId={account.id}
      owner={remoteInfo.owner}
      repo={remoteInfo.repo}
      number={parseInt(number)}
      basePath={`/repositories/${repositorySlug}/pulls/${number}`}
    />
  );
}
