import type {
  SDKUserMessage,
  SDKUserMessageReplay,
  ContentBlock,
} from "@/lib/claude";
import { isTextBlock } from "@/lib/claude";
import { User } from "lucide-react";
import { MarkdownContent } from "@/components/claude/markdown-content";

interface UserMessageProps {
  message: SDKUserMessage | SDKUserMessageReplay;
  isReplay?: boolean;
}

function getMessageContent(content: string | ContentBlock[]): string {
  if (typeof content === "string") return content;
  return content
    .filter(isTextBlock)
    .map((block) => block.text)
    .join("");
}

export function UserMessage({ message, isReplay }: UserMessageProps) {
  const content = getMessageContent(message.message.content);

  if (!content) return null;

  // SDK user messages (internal prompts) are styled differently from actual user chat messages
  // They appear left-aligned with muted styling to distinguish them as internal prompts
  return (
    <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2 my-2 border border-border/30">
      <div className="flex items-center gap-1.5 text-xs opacity-70 mb-1">
        <User className="h-3 w-3" />
        <span>Agent prompt{isReplay ? " (replay)" : ""}</span>
      </div>
      <div className="text-foreground/80 prose-sm">
        <MarkdownContent content={content} />
      </div>
    </div>
  );
}
