import { getAccount } from "@/lib/auth";
import { GitHubPull } from "@/components/github-pull";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/accounts/$account/pulls/$owner/$repo/$number",
)({
  beforeLoad: ({ params }) => {
    const account = getAccount(params.account);
    if (!account) {
      throw redirect({ to: "/", search: { addAccount: false } });
    }
    return { account };
  },
  component: AccountPullRequestDetail,
});

function AccountPullRequestDetail() {
  const { account: accountSlug, owner, repo, number } = Route.useParams();
  const { account } = Route.useRouteContext();

  return (
    <GitHubPull
      accountId={account.id}
      owner={owner}
      repo={repo}
      number={parseInt(number)}
      basePath={`/accounts/${accountSlug}/pulls/${owner}/${repo}/${number}`}
    />
  );
}
