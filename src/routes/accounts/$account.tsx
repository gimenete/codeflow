import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getAccount } from "@/lib/auth";
import { AccountSidebar } from "@/components/accounts/account-sidebar";
import { Scrollable } from "@/components/flex-layout";

export const Route = createFileRoute("/accounts/$account")({
  beforeLoad: ({ params }) => {
    const account = getAccount(params.account);
    if (!account) {
      throw redirect({ to: "/", search: { addAccount: false } });
    }
    return { account };
  },
  component: AccountLayout,
});

function AccountLayout() {
  const { account } = Route.useRouteContext();

  return (
    <Scrollable.Layout direction="horizontal">
      <AccountSidebar account={account} />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </Scrollable.Layout>
  );
}
