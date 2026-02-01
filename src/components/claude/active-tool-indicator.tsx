import { Loader2 } from "lucide-react";

interface ActiveToolIndicatorProps {
  toolName: string;
  summary?: string;
}

// Map tool names to display-friendly names
const toolDisplayNames: Record<string, string> = {
  Read: "Reading",
  Write: "Writing",
  Edit: "Editing",
  Bash: "Running command",
  Glob: "Finding files",
  Grep: "Searching",
  Task: "Running task",
  WebFetch: "Fetching web page",
  WebSearch: "Searching web",
  AskUserQuestion: "Asking question",
  ExitPlanMode: "Finishing plan",
};

function getToolDisplayName(name: string): string {
  return toolDisplayNames[name] || `Running ${name}`;
}

export function ActiveToolIndicator({
  toolName,
  summary,
}: ActiveToolIndicatorProps) {
  const displayName = getToolDisplayName(toolName);

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-md border border-border/50">
      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
      <span className="font-medium">{displayName}</span>
      {summary && (
        <span className="truncate text-xs opacity-75">{summary}</span>
      )}
    </div>
  );
}
