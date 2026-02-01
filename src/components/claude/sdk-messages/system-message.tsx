import { Info } from "lucide-react";
import type { SDKSystemMessage } from "@/lib/claude";

interface SystemMessageProps {
  message: SDKSystemMessage;
}

export function SystemMessage({ message }: SystemMessageProps) {
  const content = message.message?.content;

  if (!content) return null;

  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2 my-2">
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span className="whitespace-pre-wrap">{content}</span>
    </div>
  );
}
