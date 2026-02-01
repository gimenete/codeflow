import { Loader2, Sparkles, Zap } from "lucide-react";
import type { SDKStatusMessage } from "@/lib/claude";

interface StatusMessageProps {
  message: SDKStatusMessage;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "compacting":
    case "optimizing":
      return <Sparkles className="h-3.5 w-3.5 text-purple-500 animate-pulse" />;
    case "processing":
      return <Zap className="h-3.5 w-3.5 text-yellow-500" />;
    default:
      return (
        <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
      );
  }
}

function getStatusText(status: string, message?: string): string {
  if (message) return message;
  switch (status) {
    case "compacting":
      return "Optimizing context...";
    case "processing":
      return "Processing...";
    case "thinking":
      return "Thinking...";
    default:
      return status;
  }
}

export function StatusMessage({ message }: StatusMessageProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1 my-1">
      {getStatusIcon(message.status)}
      <span>{getStatusText(message.status, message.message)}</span>
    </div>
  );
}
