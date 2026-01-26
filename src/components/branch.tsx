import { GitBranchIcon } from "@primer/octicons-react";
import { cn } from "@/lib/utils";

interface BranchProps {
  name: string;
  className?: string;
}

export function Branch({ name, className }: BranchProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-mono bg-muted px-2 py-0.5 rounded",
        className,
      )}
    >
      <GitBranchIcon size={12} />
      {name}
    </span>
  );
}
