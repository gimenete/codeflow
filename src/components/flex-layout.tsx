import { cn } from "@/lib/utils";
import { ReactNode, forwardRef } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Scrollbar } from "@radix-ui/react-scroll-area";

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
      className={cn(className, "flex flex-1 overflow-hidden", flexDirection)}
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

const Both = forwardRef<HTMLDivElement, ScrollableProps>(function Both(
  { children, className },
  ref,
) {
  return (
    <ScrollArea ref={ref} className={cn(className, "flex-1 min-h-0 min-w-0")}>
      {children}
      <Scrollbar orientation="horizontal" />
      <Scrollbar orientation="vertical" />
    </ScrollArea>
  );
});

export const Scrollable = {
  Layout,
  Vertical,
  Horizontal,
  Both,
};
