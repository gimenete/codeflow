import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  Coins,
} from "lucide-react";
import type { SDKResultMessage } from "@/lib/claude";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ResultMessageProps {
  message: SDKResultMessage;
}

function formatDuration(ms?: number): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(count?: number): string {
  if (!count) return "-";
  if (count < 1000) return count.toString();
  return `${(count / 1000).toFixed(1)}k`;
}

function formatCost(usd?: number): string {
  if (!usd) return "-";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function ResultMessage({ message }: ResultMessageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const result = message.result;

  if (!result) return null;

  const hasError = result.error_type !== undefined;
  const hasStats =
    result.duration_ms ||
    result.input_tokens ||
    result.output_tokens ||
    result.cost_usd;

  if (!hasError) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn("rounded px-3 py-2 my-2 text-xs", {
          "bg-green-500/10 border border-green-500/20": !hasError,
          "bg-red-500/10 border border-red-500/20": hasError,
        })}
      >
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
          {hasStats &&
            (isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ))}
          {!hasStats && <div className="w-3.5" />}
          {!hasError ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span className="text-green-600 dark:text-green-400">
                Completed
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <span className="text-red-600 dark:text-red-400">
                {result.error_type || "Error"}
                {result.error_message && `: ${result.error_message}`}
              </span>
            </>
          )}
        </CollapsibleTrigger>

        {hasStats && (
          <CollapsibleContent className="mt-2 pt-2 border-t border-current/10">
            <div className="flex flex-wrap gap-4 text-muted-foreground">
              {result.duration_ms && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(result.duration_ms)}</span>
                </div>
              )}
              {(result.input_tokens || result.output_tokens) && (
                <div className="flex items-center gap-1">
                  <span>
                    {formatTokens(result.input_tokens)} in /{" "}
                    {formatTokens(result.output_tokens)} out
                  </span>
                </div>
              )}
              {result.cost_usd && (
                <div className="flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  <span>{formatCost(result.cost_usd)}</span>
                </div>
              )}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}
