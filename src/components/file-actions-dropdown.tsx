import { useState, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Copy, AtSign, MessageSquarePlus } from "lucide-react";
import { RequestChangesDialog } from "@/components/request-changes-dialog";
import { useClaudeStore } from "@/lib/claude-store";
import { toast } from "sonner";
import { useLocation, useNavigate } from "@tanstack/react-router";

interface FileActionsDropdownProps {
  filePath: string;
}

export function FileActionsDropdown({ filePath }: FileActionsDropdownProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const appendToPrompt = useClaudeStore((s) => s.appendToPrompt);
  const requestInputFocus = useClaudeStore((s) => s.requestInputFocus);
  const location = useLocation();
  const navigate = useNavigate();

  const navigateToAgentTab = useCallback(() => {
    // Extract the base path and navigate to the agent tab
    const pathParts = location.pathname.split("/");
    // Find the index of "branches" and get the branch part
    const branchesIndex = pathParts.indexOf("branches");
    if (branchesIndex !== -1 && branchesIndex + 1 < pathParts.length) {
      // Build the agent path: /repositories/{repo}/branches/{branch}/agent
      const basePath = pathParts.slice(0, branchesIndex + 2).join("/");
      requestInputFocus();
      void navigate({ to: `${basePath}/agent` });
    }
  }, [location.pathname, navigate, requestInputFocus]);

  const handleCopyPath = useCallback(() => {
    void navigator.clipboard.writeText(filePath);
    toast.success("Path copied to clipboard");
  }, [filePath]);

  const handleMentionFile = useCallback(() => {
    appendToPrompt(`@${filePath} `);
    toast.success("File mentioned in chat", {
      action: {
        label: "Go to chat",
        onClick: navigateToAgentTab,
      },
      duration: 3000,
    });
  }, [filePath, appendToPrompt, navigateToAgentTab]);

  const handleRequestChanges = useCallback(
    (instructions: string) => {
      appendToPrompt(`@${filePath} ${instructions}`);
      toast.success("Change request added to chat", {
        action: {
          label: "Go to chat",
          onClick: navigateToAgentTab,
        },
        duration: 3000,
      });
    },
    [filePath, appendToPrompt, navigateToAgentTab],
  );

  if (!filePath) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCopyPath}>
            <Copy className="h-4 w-4" />
            Copy path
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleMentionFile}>
            <AtSign className="h-4 w-4" />
            Mention file
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <MessageSquarePlus className="h-4 w-4" />
            Ask or request changes
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RequestChangesDialog
        filePath={filePath}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleRequestChanges}
      />
    </>
  );
}
