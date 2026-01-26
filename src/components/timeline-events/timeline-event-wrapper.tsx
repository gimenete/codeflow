import type { ReactNode } from "react";

interface TimelineEventWrapperProps {
  children: ReactNode;
}

export function TimelineEventWrapper({ children }: TimelineEventWrapperProps) {
  return <div className="pl-6">{children}</div>;
}
