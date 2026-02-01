import { Loader2, Check, X, Webhook } from "lucide-react";
import type {
  SDKHookStartedMessage,
  SDKHookProgressMessage,
  SDKHookResponseMessage,
} from "@/lib/claude";

interface HookStartedMessageProps {
  message: SDKHookStartedMessage;
}

export function HookStartedMessage({ message }: HookStartedMessageProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1 my-1">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <Webhook className="h-3 w-3" />
      <span>Running hook: {message.hook_name}</span>
    </div>
  );
}

interface HookProgressMessageProps {
  message: SDKHookProgressMessage;
}

export function HookProgressMessage({ message }: HookProgressMessageProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1 my-1">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <Webhook className="h-3 w-3" />
      <span>
        {message.hook_name}
        {message.progress && `: ${message.progress}`}
      </span>
    </div>
  );
}

interface HookResponseMessageProps {
  message: SDKHookResponseMessage;
}

export function HookResponseMessage({ message }: HookResponseMessageProps) {
  const isSuccess = message.success !== false;

  return (
    <div className="flex items-center gap-2 text-xs py-1 my-1">
      {isSuccess ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <X className="h-3.5 w-3.5 text-red-500" />
      )}
      <Webhook className="h-3 w-3 text-muted-foreground" />
      <span className={isSuccess ? "text-muted-foreground" : "text-red-500"}>
        Hook {message.hook_name}:{" "}
        {message.response || (isSuccess ? "completed" : "failed")}
      </span>
    </div>
  );
}
