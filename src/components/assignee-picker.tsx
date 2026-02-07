import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { useAssignableUsers } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { Author } from "@/lib/github-types";

interface AssigneePickerProps {
  accountId: string;
  owner: string;
  repo: string;
  currentAssignees: Author[];
  onAssigneesChange: (add: string[], remove: string[]) => Promise<void>;
  children: (displayAssignees: Author[]) => React.ReactNode;
}

export function AssigneePicker({
  accountId,
  owner,
  repo,
  currentAssignees,
  onAssigneesChange,
  children,
}: AssigneePickerProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingLogins, setPendingLogins] = useState<Set<string>>(
    () => new Set(currentAssignees.map((a) => a.login)),
  );
  const { data: assignableUsers } = useAssignableUsers(
    accountId,
    owner,
    repo,
  );

  const initialLoginsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setPendingLogins(new Set(currentAssignees.map((a) => a.login)));
    }
  }, [currentAssignees, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const logins = new Set(currentAssignees.map((a) => a.login));
      setPendingLogins(logins);
      initialLoginsRef.current = new Set(logins);
      setError(null);
    } else {
      const initial = initialLoginsRef.current;
      const added = [...pendingLogins].filter((l) => !initial.has(l));
      const removed = [...initial].filter((l) => !pendingLogins.has(l));
      if (added.length > 0 || removed.length > 0) {
        onAssigneesChange(added, removed).catch((e: unknown) => {
          setError(
            e instanceof Error ? e.message : "Failed to update assignees",
          );
        });
      }
    }
    setOpen(nextOpen);
  };

  const toggleUser = (login: string) => {
    setPendingLogins((prev) => {
      const next = new Set(prev);
      if (next.has(login)) {
        next.delete(login);
      } else {
        next.add(login);
      }
      return next;
    });
  };

  const displayAssignees = buildDisplayAssignees(
    pendingLogins,
    currentAssignees,
    assignableUsers ?? [],
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children(displayAssignees)}</PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Filter users..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            {assignableUsers?.map((user) => (
              <CommandItem
                key={user.login}
                value={user.login}
                onSelect={() => toggleUser(user.login)}
              >
                <Check
                  className={cn(
                    "h-4 w-4 mr-2 shrink-0",
                    pendingLogins.has(user.login) ? "opacity-100" : "opacity-0",
                  )}
                />
                <Avatar className="h-5 w-5 mr-2">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback>
                    {user.login.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{user.login}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive p-2 border-t">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function buildDisplayAssignees(
  logins: Set<string>,
  currentAssignees: Author[],
  assignableUsers: { login: string; avatarUrl: string }[],
): Author[] {
  const avatarMap = new Map<string, string>();
  for (const a of currentAssignees) avatarMap.set(a.login, a.avatarUrl);
  for (const u of assignableUsers) avatarMap.set(u.login, u.avatarUrl);
  return Array.from(logins).map((login) => ({
    login,
    avatarUrl: avatarMap.get(login) ?? "",
  }));
}
