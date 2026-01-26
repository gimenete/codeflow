import { cn } from "@/lib/utils";
import { ReactNode, forwardRef } from "react";
import { ScrollArea } from "./ui/scroll-area";

interface FlexLayoutProps {
  direction: "horizontal" | "vertical";
  children?: ReactNode;
  className?: string;
}

interface ScrollableProps {
  children?: ReactNode;
  className?: string;
}

const Layout = forwardRef<HTMLDivElement, FlexLayoutProps>(function Layout(
  { direction, children, className },
  ref,
) {
  const flexDirection = direction === "horizontal" ? "flex-row" : "flex-col";
  return (
    <div
      ref={ref}
      className={cn(className, "flex overflow-hidden", flexDirection)}
    >
      {children}
    </div>
  );
});

const Vertical = forwardRef<HTMLDivElement, ScrollableProps>(function Vertical(
  { children, className },
  ref,
) {
  return (
    <ScrollArea ref={ref} className={cn(className, "flex-1 min-h-0")}>
      {children}
    </ScrollArea>
  );
});

const Horizontal = forwardRef<HTMLDivElement, ScrollableProps>(
  function Horizontal({ children, className }, ref) {
    return (
      <ScrollArea ref={ref} className={cn(className, "flex-1 min-w-0")}>
        {children}
      </ScrollArea>
    );
  },
);

export const Scrollable = {
  Layout,
  Vertical,
  Horizontal,
};
