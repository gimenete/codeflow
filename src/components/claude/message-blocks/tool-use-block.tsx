import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { ToolUseBlock as ToolUseBlockType } from "@/lib/claude";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AskUserQuestionBlock,
  isAskUserQuestionBlock,
} from "@/components/claude/sdk-messages/ask-user-question-block";
import {
  ExitPlanModeBlock,
  isExitPlanModeBlock,
} from "@/components/claude/sdk-messages/exit-plan-mode-block";

interface ToolUseBlockProps {
  block: ToolUseBlockType;
  result?: {
    content: string;
    isError?: boolean;
  };
  status?: "pending" | "running" | "success" | "error";
}

// Map tool names to display-friendly names
const toolDisplayNames: Record<string, string> = {
  Read: "Read",
  Write: "Write",
  Edit: "Edit",
  Bash: "Bash",
  Glob: "Glob",
  Grep: "Grep",
  Task: "Task",
  WebFetch: "Web Fetch",
  WebSearch: "Web Search",
};

function getToolDisplayName(name: string): string {
  return toolDisplayNames[name] || name;
}

function getToolBadgeVariant(
  status?: "pending" | "running" | "success" | "error",
): "default" | "secondary" | "success" | "destructive" {
  switch (status) {
    case "success":
      return "success";
    case "error":
      return "destructive";
    case "running":
      return "default";
    default:
      return "secondary";
  }
}

function formatInput(input: unknown): string {
  if (typeof input === "string") return input;
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

function getToolSummary(name: string, input: unknown): string {
  const inputObj = input as Record<string, unknown>;

  switch (name) {
    case "Read":
      return inputObj.file_path ? String(inputObj.file_path) : "file";
    case "Write":
      return inputObj.file_path ? String(inputObj.file_path) : "file";
    case "Edit":
      return inputObj.file_path ? String(inputObj.file_path) : "file";
    case "Bash":
      return inputObj.command
        ? String(inputObj.command).slice(0, 60) +
            (String(inputObj.command).length > 60 ? "..." : "")
        : "command";
    case "Glob":
      return inputObj.pattern ? String(inputObj.pattern) : "pattern";
    case "Grep":
      return inputObj.pattern ? String(inputObj.pattern) : "pattern";
    case "Task":
      return inputObj.description ? String(inputObj.description) : "task";
    default:
      return "";
  }
}

export function ToolUseBlock({ block, result, status }: ToolUseBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Handle special tool types with custom rendering
  if (isAskUserQuestionBlock(block)) {
    return <AskUserQuestionBlock block={block} />;
  }

  if (isExitPlanModeBlock(block)) {
    return <ExitPlanModeBlock block={block} />;
  }

  const summary = getToolSummary(block.name, block.input);
  const borderColor = cn({
    "border-l-blue-500": status === "running" || status === "pending",
    "border-l-green-500": status === "success",
    "border-l-red-500": status === "error",
    "border-l-muted-foreground/30": !status,
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn("border-l-2 pl-3 py-1 my-2", borderColor)}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:bg-muted/50 rounded px-1 -ml-1">
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <Badge variant={getToolBadgeVariant(status)} className="text-xs">
            {getToolDisplayName(block.name)}
          </Badge>
          {summary && (
            <span className="text-xs text-muted-foreground truncate">
              {summary}
            </span>
          )}
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2">
          <div className="text-xs">
            <div className="text-muted-foreground mb-1">Input:</div>
            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-48 overflow-y-auto">
              {formatInput(block.input)}
            </pre>
          </div>

          {result && (
            <div className="text-xs mt-2">
              <div
                className={cn("mb-1", {
                  "text-red-500": result.isError,
                  "text-muted-foreground": !result.isError,
                })}
              >
                {result.isError ? "Error:" : "Output:"}
              </div>
              <pre
                className={cn(
                  "p-2 rounded text-xs overflow-x-auto max-h-48 overflow-y-auto",
                  {
                    "bg-red-500/10": result.isError,
                    "bg-muted": !result.isError,
                  },
                )}
              >
                {result.content}
              </pre>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
