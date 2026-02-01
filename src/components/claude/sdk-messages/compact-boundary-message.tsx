import { Sparkles } from "lucide-react";
import type { SDKCompactBoundaryMessage } from "@/lib/claude";

interface CompactBoundaryMessageProps {
  message: SDKCompactBoundaryMessage;
}

export function CompactBoundaryMessage({
  message,
}: CompactBoundaryMessageProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-purple-500/70 py-1 my-2">
      <div className="flex-1 border-t border-purple-500/20" />
      <Sparkles className="h-3.5 w-3.5" />
      <span>{message.reason || "Context optimized"}</span>
      <div className="flex-1 border-t border-purple-500/20" />
    </div>
  );
}
