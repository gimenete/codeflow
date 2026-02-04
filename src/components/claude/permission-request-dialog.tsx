import { useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Terminal,
  FileEdit,
  Eye,
} from "lucide-react";
import type {
  ToolPermissionRequest,
  ToolPermissionResponse,
} from "@/lib/claude";

interface PermissionRequestDialogProps {
  request: ToolPermissionRequest;
  onRespond: (response: ToolPermissionResponse) => void;
}

/** Format tool input for display based on tool type */
function formatToolInput(
  toolName: string,
  input: Record<string, unknown>,
): { summary: string; detail?: string } {
  const str = (val: unknown, fallback = "unknown") =>
    val ? String(val) : fallback;

  switch (toolName) {
    case "Bash":
      return {
        summary: "Run command",
        detail: String(input.command || ""),
      };
    case "Write":
      return {
        summary: `Write file: ${str(input.file_path)}`,
        detail: input.content
          ? String(input.content).slice(0, 200) +
            (String(input.content).length > 200 ? "..." : "")
          : undefined,
      };
    case "Edit":
      return {
        summary: `Edit file: ${str(input.file_path)}`,
        detail: input.old_string
          ? `Replace: "${String(input.old_string).slice(0, 100)}"`
          : undefined,
      };
    case "Read":
      return { summary: `Read file: ${str(input.file_path)}` };
    case "Glob":
      return { summary: `Find files: ${str(input.pattern)}` };
    case "Grep":
      return { summary: `Search: ${str(input.pattern)}` };
    case "WebFetch":
      return { summary: `Fetch URL: ${str(input.url)}` };
    case "WebSearch":
      return { summary: `Web search: ${str(input.query)}` };
    case "NotebookEdit":
      return {
        summary: `Edit notebook: ${str(input.notebook_path)}`,
      };
    default:
      return { summary: `Use tool: ${toolName}` };
  }
}

/** Get an icon for the tool */
function getToolIcon(toolName: string) {
  switch (toolName) {
    case "Bash":
      return Terminal;
    case "Write":
    case "Edit":
    case "NotebookEdit":
      return FileEdit;
    case "Read":
    case "Glob":
    case "Grep":
      return Eye;
    default:
      return Shield;
  }
}

export function PermissionRequestDialog({
  request,
  onRespond,
}: PermissionRequestDialogProps) {
  const { summary, detail } = useMemo(
    () => formatToolInput(request.toolName, request.input),
    [request.toolName, request.input],
  );

  const ToolIcon = getToolIcon(request.toolName);

  const handleAllow = useCallback(() => {
    onRespond({
      requestId: request.requestId,
      behavior: "allow",
    });
  }, [request.requestId, onRespond]);

  const handleAllowAlways = useCallback(() => {
    onRespond({
      requestId: request.requestId,
      behavior: "allow",
      updatedPermissions: request.suggestions,
    });
  }, [request.requestId, request.suggestions, onRespond]);

  const handleDeny = useCallback(() => {
    onRespond({
      requestId: request.requestId,
      behavior: "deny",
      message: "Permission denied by user",
    });
  }, [request.requestId, onRespond]);

  return (
    <div className="space-y-3">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <Badge
              variant="outline"
              className="text-xs border-amber-500/40 text-amber-600"
            >
              Permission Request
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {request.toolName}
            </Badge>
          </div>
          <CardTitle className="text-sm font-medium">
            Claude wants to use the {request.toolName} tool
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {/* Summary */}
          <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50 border border-border/50">
            <ToolIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{summary}</div>
              {detail && (
                <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-all font-mono bg-muted/30 p-2 rounded max-h-40 overflow-auto">
                  {detail}
                </pre>
              )}
            </div>
          </div>

          {/* Reason */}
          {request.decisionReason && (
            <div className="text-xs text-muted-foreground px-2">
              Reason: {request.decisionReason}
            </div>
          )}

          {/* Blocked path */}
          {request.blockedPath && (
            <div className="text-xs text-amber-600 px-2">
              Blocked path: {request.blockedPath}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeny}
          className="text-destructive hover:text-destructive"
        >
          <ShieldX className="h-4 w-4 mr-1" />
          Deny
        </Button>

        <div className="flex items-center gap-2">
          {request.suggestions && request.suggestions.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleAllowAlways}>
              <ShieldCheck className="h-4 w-4 mr-1" />
              Always Allow
            </Button>
          )}
          <Button size="sm" onClick={handleAllow}>
            <ShieldCheck className="h-4 w-4 mr-1" />
            Allow
          </Button>
        </div>
      </div>
    </div>
  );
}
