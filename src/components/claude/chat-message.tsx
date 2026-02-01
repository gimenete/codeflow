import { ClaudeIcon } from "@/components/ui/claude-icon";
import type { ChatMessage as ChatMessageType } from "@/lib/claude";
import { isUserChatMessage, isAssistantChatMessage } from "@/lib/claude";
import { SDKMessageRenderer } from "./sdk-messages";

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  if (isUserChatMessage(message)) {
    const userMsg = message;
    // User message: right-aligned bubble, no avatar
    return (
      <div className="flex justify-end p-4">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%]">
          <p className="text-sm whitespace-pre-wrap">{userMsg.content}</p>
        </div>
      </div>
    );
  }

  if (isAssistantChatMessage(message)) {
    const assistantMsg = message;
    // Assistant message: left-aligned with Claude icon
    return (
      <div className="flex gap-3 p-4 bg-background">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D97757]/10 text-[#D97757]">
          <ClaudeIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <SDKMessageRenderer
            messages={assistantMsg.sdkMessages}
            isStreaming={isStreaming}
          />
          {isStreaming && assistantMsg.sdkMessages.length === 0 && (
            <span className="inline-block w-2 h-4 bg-foreground animate-pulse" />
          )}
        </div>
      </div>
    );
  }

  // Fallback for unknown message types
  return null;
}
