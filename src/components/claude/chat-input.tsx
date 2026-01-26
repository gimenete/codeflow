import { useRef, useCallback } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  className?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isStreaming && value.trim()) {
          onSend();
        }
      }
    },
    [isStreaming, value, onSend],
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
    <form
      onSubmit={handleSubmit}
      className={cn("flex gap-2 items-end", className)}
    >
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
          <Send className="h-4 w-4" />
        </Button>
      )}
    </form>
  );
}
