import { CheckCircle2 } from "lucide-react";
import type { ToolUseBlock } from "@/lib/claude";

interface ExitPlanModeBlockProps {
  block: ToolUseBlock;
}

export function ExitPlanModeBlock({ block: _block }: ExitPlanModeBlockProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 my-2 text-sm bg-green-500/10 text-green-700 dark:text-green-400 rounded-md border border-green-500/20">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      <span className="font-medium">Plan ready for review</span>
    </div>
  );
}

// Type guard to check if a tool_use block is ExitPlanMode
export function isExitPlanModeBlock(block: ToolUseBlock): boolean {
  return block.name === "ExitPlanMode";
}
