import { KeyRound, Check, X } from "lucide-react";
import type { SDKAuthStatusMessage } from "@/lib/claude";

interface AuthStatusMessageProps {
  message: SDKAuthStatusMessage;
}

export function AuthStatusMessage({ message }: AuthStatusMessageProps) {
  const isAuthenticated = message.authenticated;

  return (
    <div className="flex items-center gap-2 text-xs py-1 my-1">
      <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
      {isAuthenticated ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-500" />
          <span className="text-muted-foreground">
            Authenticated{message.method && ` via ${message.method}`}
          </span>
        </>
      ) : (
        <>
          <X className="h-3.5 w-3.5 text-red-500" />
          <span className="text-red-500">Not authenticated</span>
        </>
      )}
    </div>
  );
}
