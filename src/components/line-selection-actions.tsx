import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import { RequestChangesDialog } from "@/components/request-changes-dialog";
import { useClaudeStore } from "@/lib/claude-store";
import { formatLineReference, type LineRange } from "@/lib/use-line-selection";
import { toast } from "sonner";
import { useLocation, useNavigate } from "@tanstack/react-router";

interface LineSelectionActionsProps {
  filePath: string;
  lineRange: LineRange;
  anchorElement: HTMLElement | null;
  onDismiss: () => void;
  preventDismiss: () => void;
}

export function LineSelectionActions({
  filePath,
  lineRange,
  anchorElement,
  onDismiss,
  preventDismiss,
}: LineSelectionActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const appendToPrompt = useClaudeStore((s) => s.appendToPrompt);
  const requestInputFocus = useClaudeStore((s) => s.requestInputFocus);
  const location = useLocation();
  const navigate = useNavigate();

  const navigateToAgentTab = useCallback(() => {
    const pathParts = location.pathname.split("/");
    const branchesIndex = pathParts.indexOf("branches");
    if (branchesIndex !== -1 && branchesIndex + 1 < pathParts.length) {
      const basePath = pathParts.slice(0, branchesIndex + 2).join("/");
      requestInputFocus();
      void navigate({ to: `${basePath}/agent` });
    }
  }, [location.pathname, navigate, requestInputFocus]);

  // Update position when anchor element changes
  useEffect(() => {
    if (!anchorElement) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const rect = anchorElement.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.right - 40,
      });
    };

    updatePosition();

    // Update on scroll/resize
    const observer = new ResizeObserver(updatePosition);
    observer.observe(document.body);

    return () => observer.disconnect();
  }, [anchorElement]);

  const handleRequestChanges = useCallback(
    (instructions: string) => {
      const reference = formatLineReference(filePath, lineRange);
      appendToPrompt(`${reference} ${instructions}`);
      toast.success("Change request added to chat", {
        action: {
          label: "Go to chat",
          onClick: navigateToAgentTab,
        },
        duration: 3000,
      });
      onDismiss();
    },
    [filePath, lineRange, appendToPrompt, navigateToAgentTab, onDismiss],
  );

  const handleButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      preventDismiss();
      setDialogOpen(true);
    },
    [preventDismiss],
  );

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) {
        onDismiss();
      }
    },
    [onDismiss],
  );

  if (!position) return null;

  const lineLabel =
    lineRange.start === lineRange.end
      ? `L${lineRange.start}`
      : `L${lineRange.start}-${lineRange.end}`;

  return (
    <>
      <div
        ref={buttonRef}
        className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-150"
        style={{ top: position.top, left: position.left }}
      >
        <Button
          variant="secondary"
          size="sm"
          className="h-7 gap-1.5 shadow-md border"
          onClick={handleButtonClick}
          onMouseDown={(e) => e.preventDefault()}
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          <span className="text-xs font-mono">{lineLabel}</span>
        </Button>
      </div>

      <RequestChangesDialog
        filePath={filePath}
        lineRange={lineRange}
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        onSubmit={handleRequestChanges}
      />
    </>
  );
}
