import type { SDKPartialAssistantMessage } from "@/lib/claude";
import { isTextBlock } from "@/lib/claude";
import { ContentBlock } from "../message-blocks";
import { MarkdownContent } from "../markdown-content";

interface PartialAssistantMessageProps {
  message: SDKPartialAssistantMessage;
  isStreaming?: boolean;
}

export function PartialAssistantMessage({
  message,
  isStreaming,
}: PartialAssistantMessageProps) {
  // If we have direct text, render it with markdown
  if (message.text) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <MarkdownContent content={message.text} />
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-foreground animate-pulse ml-0.5" />
        )}
      </div>
    );
  }

  // If we have content blocks, render them
  if (message.content && message.content.length > 0) {
    // Find text blocks for streaming cursor
    const hasTextBlock = message.content.some(isTextBlock);

    return (
      <div className="space-y-1">
        {message.content.map((block, index) => (
          <ContentBlock key={index} block={block} />
        ))}
        {isStreaming && !hasTextBlock && (
          <span className="inline-block w-2 h-4 bg-foreground animate-pulse" />
        )}
      </div>
    );
  }

  // Empty partial message - show streaming cursor
  if (isStreaming) {
    return (
      <span className="inline-block w-2 h-4 bg-foreground animate-pulse" />
    );
  }

  return null;
}
