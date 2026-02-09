import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Scrollable } from "@/components/flex-layout";
import {
  SidebarSwitcherDropdown,
  SwitcherTriggerButton,
} from "@/components/sidebar-switcher-dropdown";
import type { Account } from "@/lib/github-types";
import { getIconById } from "@/lib/query-icons";
import { useSavedQueries } from "@/lib/saved-queries-store";
import { cn } from "@/lib/utils";
import { Link, useLocation, useParams } from "@tanstack/react-router";
import { Search } from "lucide-react";

interface AccountSidebarProps {
  account: Account;
}

export function AccountSidebar({ account }: AccountSidebarProps) {
  const { query } = useParams({ strict: false });
  const location = useLocation();
  const repositoryId = `account:${account.id}`;
  const savedQueries = useSavedQueries(repositoryId);

  return (
    <div className="w-64 border-r bg-muted/10 flex flex-col h-full">
      {/* Account Header */}
      <div className="p-4 border-b">
        <SidebarSwitcherDropdown
          trigger={
            <SwitcherTriggerButton>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={account.avatarUrl} />
                  <AvatarFallback>
                    {account.login.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">@{account.login}</h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {account.host}
                  </p>
                </div>
              </div>
            </SwitcherTriggerButton>
          }
        />
      </div>

      <Scrollable.Vertical>
        {/* Issues and Pulls Section */}
        <div className="p-2">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Issues and Pulls
            </span>
          </div>
          <div className="space-y-1">
            {savedQueries.map((q) => {
              const Icon = getIconById(q.icon);
              const isActive =
                location.pathname.includes("/queries/") && query === q.id;
              return (
                <Link
                  key={q.id}
                  to="/accounts/$account/queries/$query"
                  params={{ account: account.id, query: q.id }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {Icon ? (
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Search className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">{q.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </Scrollable.Vertical>
    </div>
  );
}
