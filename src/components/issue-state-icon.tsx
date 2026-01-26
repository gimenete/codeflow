import { IssueOpenedIcon, IssueClosedIcon } from "@primer/octicons-react";
import { cn } from "@/lib/utils";

interface IssueStateIconProps {
  state: string;
  size?: "sm" | "md";
  className?: string;
}

export function IssueStateIcon({
  state,
  size = "md",
  className,
}: IssueStateIconProps) {
  const containerSize = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const iconSize = size === "sm" ? 12 : 16;

  if (state === "open") {
    return (
      <div
        className={cn(
          "rounded flex items-center justify-center bg-green-500",
          containerSize,
          className,
        )}
      >
        <IssueOpenedIcon size={iconSize} className="text-white" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded flex items-center justify-center bg-purple-500",
        containerSize,
        className,
      )}
    >
      <IssueClosedIcon size={iconSize} className="text-white" />
    </div>
  );
}
