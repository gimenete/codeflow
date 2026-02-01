import { MarkdownContent } from "./markdown-content";
import { ClaudeIcon } from "@/components/ui/claude-icon";
import type { ChatMessage as ChatMessageType } from "@/lib/claude";

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    // User message: right-aligned bubble, no avatar
    return (
      <div className="flex justify-end p-4">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%]">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message: left-aligned with Claude icon
  return (
    <div className="flex gap-3 p-4 bg-background">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D97757]/10 text-[#D97757]">
        <ClaudeIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <MarkdownContent content={message.content} />
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-foreground animate-pulse ml-0.5" />
          )}
        </div>
      </div>
    </div>
  );
}
