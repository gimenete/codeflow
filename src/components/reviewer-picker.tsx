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
import { useMentionableUsers } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ReviewRequest } from "@/lib/github-types";

interface ReviewerPickerProps {
  accountId: string;
  owner: string;
  repo: string;
  currentRequests: ReviewRequest[];
  onReviewRequestsChange: (add: string[], remove: string[]) => Promise<void>;
  children: (displayRequests: ReviewRequest[]) => React.ReactNode;
}

export function ReviewerPicker({
  accountId,
  owner,
  repo,
  currentRequests,
  onReviewRequestsChange,
  children,
}: ReviewerPickerProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only manage user-based reviewers (not teams)
  const userRequests = currentRequests.filter((r) => r.login != null);
  const teamRequests = currentRequests.filter(
    (r) => r.login == null && r.name != null,
  );

  const [pendingLogins, setPendingLogins] = useState<Set<string>>(
    () => new Set(userRequests.map((r) => r.login!)),
  );
  const { data: mentionableUsers } = useMentionableUsers(
    accountId,
    owner,
    repo,
  );

  const initialLoginsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setPendingLogins(
        new Set(
          currentRequests.filter((r) => r.login != null).map((r) => r.login!),
        ),
      );
    }
  }, [currentRequests, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const logins = new Set(userRequests.map((r) => r.login!));
      setPendingLogins(logins);
      initialLoginsRef.current = new Set(logins);
      setError(null);
    } else {
      const initial = initialLoginsRef.current;
      const added = [...pendingLogins].filter((l) => !initial.has(l));
      const removed = [...initial].filter((l) => !pendingLogins.has(l));
      if (added.length > 0 || removed.length > 0) {
        onReviewRequestsChange(added, removed).catch((e: unknown) => {
          setError(
            e instanceof Error ? e.message : "Failed to update review requests",
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

  const displayRequests = buildDisplayRequests(
    pendingLogins,
    teamRequests,
    currentRequests,
    mentionableUsers ?? [],
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children(displayRequests)}</PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Filter users..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            {mentionableUsers?.map((user) => (
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

function buildDisplayRequests(
  pendingLogins: Set<string>,
  teamRequests: ReviewRequest[],
  currentRequests: ReviewRequest[],
  mentionableUsers: { login: string; avatarUrl: string }[],
): ReviewRequest[] {
  const avatarMap = new Map<string, string>();
  for (const r of currentRequests) {
    if (r.login) avatarMap.set(r.login, r.avatarUrl);
  }
  for (const u of mentionableUsers) avatarMap.set(u.login, u.avatarUrl);

  const userResults: ReviewRequest[] = Array.from(pendingLogins).map(
    (login) => ({
      login,
      avatarUrl: avatarMap.get(login) ?? "",
    }),
  );

  // Keep team requests as-is (read-only)
  return [...userResults, ...teamRequests];
}
