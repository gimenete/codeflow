import { CommandPalette } from "@/components/command-palette";
import { Scrollable } from "@/components/flex-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { loadAccounts } from "@/lib/auth";
import {
  BreadcrumbProvider,
  useBreadcrumbContext,
  type BreadcrumbItem,
} from "@/lib/breadcrumbs";
import {
  CommandPaletteProvider,
  useOpenCommandPalette,
} from "@/lib/command-palette";
import {
  useHideOnScroll,
  useIsLargeScreen,
  useNavigationHistory,
} from "@/lib/hooks";
import { isElectron, isTauri } from "@/lib/platform";
import { setupClaudeChatIPC } from "@/lib/claude-ipc";
import { requestNotificationPermission } from "@/lib/notifications";
import { useTheme } from "@/lib/use-theme";
import { cn } from "@/lib/utils";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Command,
  Download,
  Loader2,
  Settings,
} from "lucide-react";
import { useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useUpdater } from "@/lib/updater";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function RootLayout() {
  return (
    <BreadcrumbProvider>
      <CommandPaletteProvider>
        <RootLayoutContent />
      </CommandPaletteProvider>
    </BreadcrumbProvider>
  );
}

function NavbarBreadcrumbs({ breadcrumbs }: { breadcrumbs: BreadcrumbItem[] }) {
  return (
    <>
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 && <span className="text-muted-foreground">/</span>}
          {item.dropdown ? (
            <div className="inline-flex">
              {item.href ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-r-none border-r-0"
                  asChild
                >
                  <Link to={item.href}>
                    {item.label}
                    {item.isModified && (
                      <span className="ml-1.5 h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-r-none border-r-0"
                >
                  {item.label}
                  {item.isModified && (
                    <span className="ml-1.5 h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-1.5 rounded-l-none"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {item.dropdown.items.map((dropdownItem, dropdownIndex) => {
                    if ("type" in dropdownItem) {
                      if (dropdownItem.type === "separator") {
                        return <DropdownMenuSeparator key={dropdownIndex} />;
                      }
                      if (dropdownItem.type === "label") {
                        return (
                          <DropdownMenuLabel key={dropdownIndex}>
                            {dropdownItem.text}
                          </DropdownMenuLabel>
                        );
                      }
                    }
                    const menuItem = dropdownItem;
                    return (
                      <DropdownMenuItem
                        key={dropdownIndex}
                        onClick={menuItem.onClick}
                      >
                        {menuItem.avatarUrl && (
                          <Avatar className="h-4 w-4 mr-2">
                            <AvatarImage src={menuItem.avatarUrl} />
                            <AvatarFallback>
                              {menuItem.label[1]?.toUpperCase() ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {menuItem.icon && (
                          <span className="mr-2">{menuItem.icon}</span>
                        )}
                        {menuItem.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <span className="px-3 py-1.5 text-sm">{item.label}</span>
          )}
        </div>
      ))}
    </>
  );
}

function RootLayoutContent() {
  // Keep document .dark class in sync with theme preference + system setting
  useTheme();

  const { breadcrumbs } = useBreadcrumbContext();
  const shouldHideOnScroll = useHideOnScroll();
  const isLargeScreen = useIsLargeScreen();
  const { canGoBack, canGoForward, goBack, goForward } = useNavigationHistory();
  const { toggle: toggleCommandPalette } = useOpenCommandPalette();
  const { updateAvailable, updateDownloaded, installing, installUpdate } =
    useUpdater();

  // Request notification permission and setup IPC listeners on mount
  useEffect(() => {
    requestNotificationPermission();
    setupClaudeChatIPC();
  }, []);

  // Only hide on mobile, always show on large screens
  const isNavbarHidden = !isLargeScreen && shouldHideOnScroll;

  // Detect if running on macOS for keyboard shortcut display
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.userAgent.toLowerCase().includes("mac");

  // Keyboard shortcuts for navigation (Tauri only)
  // macOS: Cmd+[ and Cmd+]
  // Windows/Linux: Alt+Left and Alt+Right
  useHotkeys("meta+[, alt+left", goBack, {
    enabled: isTauri(),
    preventDefault: true,
  });
  useHotkeys("meta+], alt+right", goForward, {
    enabled: isTauri(),
    preventDefault: true,
  });

  // Command palette shortcut: Cmd+K (macOS) / Ctrl+K (Windows/Linux)
  useHotkeys("mod+k", toggleCommandPalette, {
    preventDefault: true,
    enableOnFormTags: true,
  });

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <header
        className={cn(
          "border-b bg-background sticky top-0 z-50 transition-transform duration-300",
          isNavbarHidden && "-translate-y-full",
          isElectron() && "pl-4 app-region-drag",
        )}
      >
        <div
          className={cn(
            "flex h-12 items-center px-4 gap-2",
            isElectron() && "pl-[70px]", // Clear traffic light buttons
          )}
        >
          <span className="font-semibold text-lg mr-4">Codeflow</span>

          {/* Navigation buttons - Tauri only */}
          {isTauri() && (
            <div className="flex items-center gap-1 mr-2 app-region-no-drag">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goBack}
                disabled={!canGoBack}
                title="Go back (Cmd+[ / Alt+←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goForward}
                disabled={!canGoForward}
                title="Go forward (Cmd+] / Alt+→)"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <nav className="flex items-center gap-1 app-region-no-drag">
            {breadcrumbs.length > 0 ? (
              <NavbarBreadcrumbs breadcrumbs={breadcrumbs} />
            ) : undefined}
          </nav>

          <div className="flex-1" />

          {updateAvailable && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 app-region-no-drag border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                  onClick={installUpdate}
                  disabled={!updateDownloaded || installing}
                >
                  {installing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="text-xs">
                    {installing
                      ? "Restarting..."
                      : updateDownloaded
                        ? `Update to v${updateAvailable.version}`
                        : "Downloading..."}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {updateDownloaded
                  ? "Click to update and restart"
                  : `Downloading v${updateAvailable.version}...`}
              </TooltipContent>
            </Tooltip>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 app-region-no-drag"
            asChild
          >
            <Link to="/settings" title="Settings">
              <Settings className="h-4 w-4" />
              <span className="text-xs text-muted-foreground">Settings</span>
            </Link>
          </Button>

          {/* Command palette button */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 app-region-no-drag"
            onClick={toggleCommandPalette}
            title={`Command palette (${isMac ? "⌘K" : "Ctrl+K"})`}
          >
            <Command className="h-4 w-4" />
            <span className="text-xs text-muted-foreground">
              {isMac ? "⌘K" : "Ctrl+K"}
            </span>
          </Button>
        </div>
      </header>

      <Scrollable.Layout direction="vertical">
        <Outlet />
      </Scrollable.Layout>

      <Toaster />

      <CommandPalette />

      {/* {import.meta.env.DEV && <TanStackRouterDevtools />} */}
    </div>
  );
}

export const Route = createRootRoute({
  beforeLoad: async () => {
    await loadAccounts();
  },
  component: RootLayout,
});
