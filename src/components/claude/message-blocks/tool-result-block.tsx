import { useState } from "react";
import { ChevronRight, ChevronDown, Check, X } from "lucide-react";
import type { ToolResultBlock as ToolResultBlockType } from "@/lib/claude";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ToolResultBlockProps {
  block: ToolResultBlockType;
  toolName?: string;
}

function getResultContent(
  content: string | Array<{ type: "text"; text: string }>,
): string {
  if (typeof content === "string") return content;
  return content.map((c) => c.text).join("");
}

const MAX_PREVIEW_LENGTH = 100;

export function ToolResultBlock({ block, toolName }: ToolResultBlockProps) {
  const [isOpen, setIsOpen] = useState(block.is_error ?? false);
  const content = getResultContent(block.content);
  const isError = block.is_error ?? false;
  const isLongContent = content.length > MAX_PREVIEW_LENGTH;

  // Show first line or truncated content as preview
  const preview = isLongContent
    ? content.slice(0, MAX_PREVIEW_LENGTH) + "..."
    : content.split("\n")[0];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn("border-l-2 pl-3 py-1 my-2", {
          "border-l-red-500": isError,
          "border-l-green-500": !isError,
        })}
      >
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:bg-muted/50 rounded px-1 -ml-1">
          {isLongContent &&
            (isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ))}
          {!isLongContent && <div className="w-3.5" />}
          {isError ? (
            <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
          ) : (
            <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
          )}
          {toolName && (
            <span className="text-xs text-muted-foreground">{toolName}:</span>
          )}
          <span
            className={cn("text-xs truncate", {
              "text-red-500": isError,
              "text-muted-foreground": !isError,
            })}
          >
            {preview}
          </span>
        </CollapsibleTrigger>

        {isLongContent && (
          <CollapsibleContent className="mt-2">
            <pre
              className={cn(
                "p-2 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto",
                {
                  "bg-red-500/10": isError,
                  "bg-muted": !isError,
                },
              )}
            >
              {content}
            </pre>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}
