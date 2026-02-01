import { useRef, useCallback } from "react";
import { ArrowUp, Square, Shield, FileEdit, Map, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PermissionMode } from "@/lib/claude-store";

const MODES: PermissionMode[] = ["default", "acceptEdits", "plan", "dontAsk"];

const MODE_CONFIG: Record<
  PermissionMode,
  { label: string; color: string; Icon: typeof Shield }
> = {
  default: { label: "Default", color: "text-blue-500", Icon: Shield },
  acceptEdits: {
    label: "Accept Edits",
    color: "text-purple-500",
    Icon: FileEdit,
  },
  plan: { label: "Plan Mode", color: "text-emerald-600", Icon: Map },
  dontAsk: { label: "Don't Ask", color: "text-orange-500", Icon: Ban },
};

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  className?: string;
  permissionMode: PermissionMode;
  onModeChange: (mode: PermissionMode) => void;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
  className,
  permissionMode,
  onModeChange,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        const currentIndex = MODES.indexOf(permissionMode);
        const nextIndex = (currentIndex + 1) % MODES.length;
        onModeChange(MODES[nextIndex]);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isStreaming && value.trim()) {
          onSend();
        }
      }
    },
    [isStreaming, value, onSend, permissionMode, onModeChange],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isStreaming) {
        onStop();
      } else if (value.trim()) {
        onSend();
      }
    },
    [isStreaming, value, onSend, onStop],
  );

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className={cn("flex gap-2 items-end")}>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message... (Enter to send, Shift+Enter for newline)"
          disabled={disabled}
          className="min-h-[44px] max-h-[200px] resize-none"
          rows={1}
        />
        {isStreaming ? (
          <Button
            type="submit"
            size="icon"
            variant="destructive"
            className="h-11 w-11 shrink-0"
            title="Stop generation"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0"
            disabled={disabled || !value.trim()}
            title="Send message"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </form>
      {(() => {
        const { label, color, Icon } = MODE_CONFIG[permissionMode];
        return (
          <div className={cn("text-xs mt-1 flex items-center gap-1", color)}>
            <Icon className="h-3 w-3" />
            <span className="font-medium">{label}</span>
            <span className="ml-1 opacity-60">(Shift+Tab to change)</span>
          </div>
        );
      })()}
    </div>
  );
}
