import { cn } from "@/lib/utils";

interface CommitHashProps {
  sha: string;
  className?: string;
}

export function CommitHash({ sha, className }: CommitHashProps) {
  return (
    <span className={cn("font-mono text-xs", className)}>
      {sha.substring(0, 7)}
    </span>
  );
}
