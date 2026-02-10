import { useRef, useState } from "react";
import { AlertCircle, Check, Plus, UsersRound } from "lucide-react";
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
  CommandGroup,
  CommandSeparator,
} from "@/components/ui/command";
import { useAssignableUsers, useOrgTeams } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ReviewRequest, SuggestedReviewer } from "@/lib/github-types";

interface ReviewerPickerProps {
  accountId: string;
  owner: string;
  repo: string;
  currentRequests: ReviewRequest[];
  suggestedReviewers?: SuggestedReviewer[];
  onReviewRequestsChange: (
    addUsers: string[],
    removeUsers: string[],
    addTeamSlugs?: string[],
    removeTeamSlugs?: string[],
  ) => Promise<void>;
  children: (displayRequests: ReviewRequest[]) => React.ReactNode;
}

export function ReviewerPicker({
  accountId,
  owner,
  repo,
  currentRequests,
  suggestedReviewers,
  onReviewRequestsChange,
  children,
}: ReviewerPickerProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Separate user-based and team-based reviewers
  const userRequests = currentRequests.filter((r) => r.login != null);
  const teamRequests = currentRequests.filter(
    (r) => r.login == null && r.name != null,
  );

  const [pendingLogins, setPendingLogins] = useState<Set<string>>(
    () => new Set(userRequests.map((r) => r.login!)),
  );
  const [pendingTeamSlugs, setPendingTeamSlugs] = useState<Set<string>>(
    () => new Set(teamRequests.filter((r) => r.slug).map((r) => r.slug!)),
  );

  const { data: assignableUsers } = useAssignableUsers(accountId, owner, repo);
  const { data: orgTeams } = useOrgTeams(accountId, owner);

  const initialLoginsRef = useRef<Set<string>>(new Set());
  const initialTeamSlugsRef = useRef<Set<string>>(new Set());

  // Sync pending state from props when closed and props change
  const prevCurrentRequestsRef = useRef(currentRequests);
  if (!open && currentRequests !== prevCurrentRequestsRef.current) {
    prevCurrentRequestsRef.current = currentRequests;
    const newUserRequests = currentRequests.filter((r) => r.login != null);
    const newTeamRequests = currentRequests.filter(
      (r) => r.login == null && r.name != null,
    );
    setPendingLogins(new Set(newUserRequests.map((r) => r.login!)));
    setPendingTeamSlugs(
      new Set(newTeamRequests.filter((r) => r.slug).map((r) => r.slug!)),
    );
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const logins = new Set(userRequests.map((r) => r.login!));
      setPendingLogins(logins);
      initialLoginsRef.current = new Set(logins);

      const teamSlugs = new Set(
        teamRequests.filter((r) => r.slug).map((r) => r.slug!),
      );
      setPendingTeamSlugs(teamSlugs);
      initialTeamSlugsRef.current = new Set(teamSlugs);
      setError(null);
    } else {
      const initialLogins = initialLoginsRef.current;
      const addedUsers = [...pendingLogins].filter(
        (l) => !initialLogins.has(l),
      );
      const removedUsers = [...initialLogins].filter(
        (l) => !pendingLogins.has(l),
      );

      const initialTeams = initialTeamSlugsRef.current;
      const addedTeams = [...pendingTeamSlugs].filter(
        (s) => !initialTeams.has(s),
      );
      const removedTeams = [...initialTeams].filter(
        (s) => !pendingTeamSlugs.has(s),
      );

      if (
        addedUsers.length > 0 ||
        removedUsers.length > 0 ||
        addedTeams.length > 0 ||
        removedTeams.length > 0
      ) {
        onReviewRequestsChange(
          addedUsers,
          removedUsers,
          addedTeams,
          removedTeams,
        ).catch((e: unknown) => {
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

  const toggleTeam = (slug: string) => {
    setPendingTeamSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  // Filter suggested reviewers to exclude already-requested users
  const filteredSuggestions = (suggestedReviewers ?? []).filter(
    (s) => !pendingLogins.has(s.reviewer.login),
  );

  // Always derive display from pending state to avoid flash when closing
  const displayRequests = buildDisplayRequests(
    pendingLogins,
    pendingTeamSlugs,
    teamRequests,
    currentRequests,
    assignableUsers ?? [],
    orgTeams ?? [],
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children(displayRequests)}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Filter users..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>

            {/* Suggested reviewers section */}
            {filteredSuggestions.length > 0 && (
              <>
                <CommandGroup heading="Suggested reviewers">
                  {filteredSuggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion.reviewer.login}
                      value={`suggested-${suggestion.reviewer.login}`}
                      onSelect={() => toggleUser(suggestion.reviewer.login)}
                    >
                      <Avatar className="h-5 w-5 mr-2">
                        <AvatarImage src={suggestion.reviewer.avatarUrl} />
                        <AvatarFallback>
                          {suggestion.reviewer.login.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate flex-1">
                        {suggestion.reviewer.login}
                      </span>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Assignable users */}
            <CommandGroup heading="Users">
              {assignableUsers?.map((user) => (
                <CommandItem
                  key={user.login}
                  value={user.login}
                  onSelect={() => toggleUser(user.login)}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 mr-2 shrink-0",
                      pendingLogins.has(user.login)
                        ? "opacity-100"
                        : "opacity-0",
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
            </CommandGroup>

            {/* Teams (only shown for org repos) */}
            {orgTeams && orgTeams.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Teams">
                  {orgTeams.map((team) => (
                    <CommandItem
                      key={team.slug}
                      value={`team-${team.slug}`}
                      onSelect={() => toggleTeam(team.slug)}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 mr-2 shrink-0",
                          pendingTeamSlugs.has(team.slug)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <UsersRound className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                      <span className="truncate">{team.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
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
  pendingTeamSlugs: Set<string>,
  teamRequests: ReviewRequest[],
  currentRequests: ReviewRequest[],
  assignableUsers: { login: string; avatarUrl: string }[],
  orgTeams: { name: string; slug: string; avatarUrl: string }[],
): ReviewRequest[] {
  const avatarMap = new Map<string, string>();
  for (const r of currentRequests) {
    if (r.login) avatarMap.set(r.login, r.avatarUrl);
  }
  for (const u of assignableUsers) avatarMap.set(u.login, u.avatarUrl);

  const userResults: ReviewRequest[] = Array.from(pendingLogins).map(
    (login) => ({
      login,
      avatarUrl: avatarMap.get(login) ?? "",
    }),
  );

  // Build team results from pending team slugs
  const teamAvatarMap = new Map<string, { name: string; avatarUrl: string }>();
  for (const r of teamRequests) {
    if (r.slug)
      teamAvatarMap.set(r.slug, {
        name: r.name ?? r.slug,
        avatarUrl: r.avatarUrl,
      });
  }
  for (const t of orgTeams) {
    teamAvatarMap.set(t.slug, { name: t.name, avatarUrl: t.avatarUrl });
  }

  const teamResults: ReviewRequest[] = Array.from(pendingTeamSlugs).map(
    (slug) => {
      const info = teamAvatarMap.get(slug);
      return {
        name: info?.name ?? slug,
        slug,
        avatarUrl: info?.avatarUrl ?? "",
      };
    },
  );

  // Also include team requests that don't have slugs (read-only legacy)
  const legacyTeamRequests = teamRequests.filter(
    (r) => !r.slug || !pendingTeamSlugs.has(r.slug),
  );

  return [...userResults, ...teamResults, ...legacyTeamRequests];
}
