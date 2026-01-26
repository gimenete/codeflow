import {
  GitMergeIcon,
  GitPullRequestIcon,
  GitPullRequestDraftIcon,
} from "@primer/octicons-react";
import { cn } from "@/lib/utils";

interface PullStateIconProps {
  state: string;
  merged: boolean;
  isDraft?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function PullStateIcon({
  state,
  merged,
  isDraft,
  size = "md",
  className,
}: PullStateIconProps) {
  const containerSize = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const iconSize = size === "sm" ? 12 : 16;

  if (merged) {
    return (
      <div
        className={cn(
          "rounded flex items-center justify-center bg-purple-500",
          containerSize,
          className,
        )}
      >
        <GitMergeIcon size={iconSize} className="text-white" />
      </div>
    );
  }

  if (isDraft) {
    return (
      <div
        className={cn(
          "rounded flex items-center justify-center bg-gray-500",
          containerSize,
          className,
        )}
      >
        <GitPullRequestDraftIcon size={iconSize} className="text-white" />
      </div>
    );
  }

  if (state === "open") {
    return (
      <div
        className={cn(
          "rounded flex items-center justify-center bg-green-500",
          containerSize,
          className,
        )}
      >
        <GitPullRequestIcon size={iconSize} className="text-white" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded flex items-center justify-center bg-red-500",
        containerSize,
        className,
      )}
    >
      <GitPullRequestIcon size={iconSize} className="text-white" />
    </div>
  );
}
