import type {
  SDKUserMessage,
  SDKUserMessageReplay,
  ContentBlock,
} from "@/lib/claude";
import { isTextBlock } from "@/lib/claude";

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

  return (
    <div className="flex justify-end">
      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%]">
        <p className="text-sm whitespace-pre-wrap">{content}</p>
        {isReplay && (
          <span className="text-xs opacity-70 mt-1 block">(replay)</span>
        )}
      </div>
    </div>
  );
}
