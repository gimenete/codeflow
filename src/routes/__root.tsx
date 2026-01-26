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
import { loadAccounts } from "@/lib/auth";
import {
  BreadcrumbProvider,
  useBreadcrumbContext,
  type BreadcrumbDropdownItem,
  type BreadcrumbItem,
} from "@/lib/breadcrumbs";
import {
  useHideOnScroll,
  useIsLargeScreen,
  useNavigationHistory,
} from "@/lib/hooks";
import { isTauri } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";

function RootLayout() {
  return (
    <BreadcrumbProvider>
      <RootLayoutContent />
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
                    const menuItem = dropdownItem as BreadcrumbDropdownItem;
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
  const { breadcrumbs } = useBreadcrumbContext();
  const shouldHideOnScroll = useHideOnScroll();
  const isLargeScreen = useIsLargeScreen();
  const { canGoBack, canGoForward, goBack, goForward } = useNavigationHistory();

  // Only hide on mobile, always show on large screens
  const isNavbarHidden = !isLargeScreen && shouldHideOnScroll;

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

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <header
        className={cn(
          "border-b bg-background sticky top-0 z-50 transition-transform duration-300",
          isNavbarHidden && "-translate-y-full",
        )}
      >
        <div className="flex h-12 items-center px-4 gap-2">
          <Link
            to="/"
            search={{ addAccount: false }}
            className="font-semibold text-lg mr-4"
          >
            Codeflow
          </Link>

          {/* Navigation buttons - Tauri only */}
          {isTauri() && (
            <div className="flex items-center gap-1 mr-2">
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

          <nav className="flex items-center gap-1">
            {breadcrumbs.length > 0 ? (
              <NavbarBreadcrumbs breadcrumbs={breadcrumbs} />
            ) : undefined}
          </nav>

          <div className="flex-1" />
        </div>
      </header>

      <Scrollable.Layout direction="vertical">
        <Outlet />
      </Scrollable.Layout>

      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  );
}

export const Route = createRootRoute({
  beforeLoad: async () => {
    await loadAccounts();
  },
  component: RootLayout,
});
