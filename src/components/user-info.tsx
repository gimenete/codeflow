import { useState, useCallback, useRef } from "react";
import { useGitHubUserProfile } from "@/lib/queries";
import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Building,
  MapPin,
  Users,
  GitFork,
  ExternalLink,
} from "lucide-react";

/**
 * Controls how user info is displayed when interacting with usernames.
 * - "popover": shows a popover card on hover
 * - "drawer": shows a right-side drawer on click
 */
export const USER_INFO_DISPLAY: "popover" | "drawer" = "popover";

// Shared profile card content used by both popover and drawer
function UserInfoContent({
  login,
  accountId,
}: {
  login: string;
  accountId: string;
}) {
  const { data: profile, isLoading, error } = useGitHubUserProfile(accountId, login);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{login}</div>
          <div className="text-xs text-muted-foreground">
            Could not load profile
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={profile.avatarUrl} />
          <AvatarFallback>{login.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          {profile.name && (
            <div className="font-medium truncate">{profile.name}</div>
          )}
          <div className="text-sm text-muted-foreground truncate">
            {profile.login}
          </div>
        </div>
      </div>

      {profile.bio && (
        <p className="text-sm text-muted-foreground">{profile.bio}</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {profile.company && (
          <span className="flex items-center gap-1">
            <Building className="h-3 w-3" />
            <span className="truncate">{profile.company}</span>
          </span>
        )}
        {profile.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{profile.location}</span>
          </span>
        )}
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span className="font-medium text-foreground">
            {profile.followers}
          </span>{" "}
          followers
        </span>
        <span className="flex items-center gap-1">
          <GitFork className="h-3 w-3" />
          <span className="font-medium text-foreground">
            {profile.publicRepos}
          </span>{" "}
          repos
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
        <span>
          Joined <RelativeTime date={profile.createdAt} />
        </span>
        <a
          href={profile.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
          GitHub
        </a>
      </div>
    </div>
  );
}

// Popover variant: shows on hover
function UserInfoPopover({
  login,
  accountId,
  children,
}: {
  login: string;
  accountId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    hoverTimeout.current = setTimeout(() => setOpen(true), 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setOpen(false);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="cursor-pointer hover:underline"
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        onMouseEnter={() => {
          if (hoverTimeout.current) {
            clearTimeout(hoverTimeout.current);
            hoverTimeout.current = null;
          }
        }}
        onMouseLeave={handleMouseLeave}
        className="w-80"
        side="bottom"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <UserInfoContent login={login} accountId={accountId} />
      </PopoverContent>
    </Popover>
  );
}

// Drawer variant: shows on click
function UserInfoDrawer({
  login,
  accountId,
  children,
}: {
  login: string;
  accountId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <span
        onClick={() => setOpen(true)}
        className="cursor-pointer hover:underline"
      >
        {children}
      </span>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{login}</SheetTitle>
          <SheetDescription>GitHub profile</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <UserInfoContent login={login} accountId={accountId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Wrapper component that displays a username with user info on interaction.
 * Renders the children (typically the username text) and wraps it with
 * either a hover popover or a click drawer based on USER_INFO_DISPLAY.
 *
 * When no accountId is available, falls back to rendering children as-is.
 */
export function UserLogin({
  login,
  accountId,
  children,
}: {
  login: string;
  accountId?: string;
  children: React.ReactNode;
}) {
  if (!accountId) {
    return <>{children}</>;
  }

  if (USER_INFO_DISPLAY === "drawer") {
    return (
      <UserInfoDrawer login={login} accountId={accountId}>
        {children}
      </UserInfoDrawer>
    );
  }

  return (
    <UserInfoPopover login={login} accountId={accountId}>
      {children}
    </UserInfoPopover>
  );
}
