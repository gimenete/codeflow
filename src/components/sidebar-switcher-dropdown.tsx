import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccounts } from "@/lib/auth";
import { getOwnerRepo } from "@/lib/remote-url";
import { useRepositories } from "@/lib/repositories-store";
import { isElectron } from "@/lib/platform";
import { RepoIcon } from "@primer/octicons-react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Plus } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface SidebarSwitcherDropdownProps {
  trigger: ReactNode;
  onAddRepository?: () => void;
}

export function SidebarSwitcherDropdown({
  trigger,
  onAddRepository,
}: SidebarSwitcherDropdownProps) {
  const navigate = useNavigate();
  const { accounts } = useAccounts();
  const repositories = useRepositories();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-popover">
        {/* Accounts group */}
        {accounts.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Accounts</DropdownMenuLabel>
            {accounts.map((a) => (
              <DropdownMenuItem
                key={a.id}
                onClick={() =>
                  navigate({
                    to: "/accounts/$account",
                    params: { account: a.id },
                  })
                }
              >
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage src={a.avatarUrl} />
                  <AvatarFallback>
                    {a.login.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate">@{a.login}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {a.host}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}

        {/* Repositories group */}
        {(repositories.length > 0 || (isElectron() && onAddRepository)) && (
          <>
            {accounts.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              <DropdownMenuLabel>Repositories</DropdownMenuLabel>
              {repositories.map((repo) => {
                const repoOwnerRepo = getOwnerRepo(repo.remoteUrl);
                return (
                  <DropdownMenuItem
                    key={repo.id}
                    onClick={() =>
                      navigate({
                        to: "/repositories/$repository",
                        params: { repository: repo.slug },
                      })
                    }
                  >
                    <RepoIcon size={16} className="shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate">{repo.name}</div>
                      {repoOwnerRepo && (
                        <div className="text-xs text-muted-foreground truncate">
                          {repoOwnerRepo}
                        </div>
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })}
              {isElectron() && onAddRepository && (
                <DropdownMenuItem onClick={onAddRepository}>
                  <Plus className="h-4 w-4" />
                  Add Repository
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SwitcherTriggerButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className={cn(
        "flex items-center justify-between w-full text-left gap-2 rounded-md hover:bg-accent/50 transition-colors p-1 -m-1",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
