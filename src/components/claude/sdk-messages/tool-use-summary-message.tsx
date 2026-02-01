import { Wrench } from "lucide-react";
import type { SDKToolUseSummaryMessage } from "@/lib/claude";
import { Badge } from "@/components/ui/badge";

interface ToolUseSummaryMessageProps {
  message: SDKToolUseSummaryMessage;
}

export function ToolUseSummaryMessage({ message }: ToolUseSummaryMessageProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1 my-1">
      <Wrench className="h-3.5 w-3.5" />
      <Badge variant="secondary" className="text-xs">
        {message.tool_name}
      </Badge>
      <span>{message.summary}</span>
    </div>
  );
}
