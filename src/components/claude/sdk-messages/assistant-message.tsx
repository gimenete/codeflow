import { useMemo } from "react";
import type { SDKAssistantMessage } from "@/lib/claude";
import { isToolUseBlock, isToolResultBlock } from "@/lib/claude";
import { ContentBlock } from "../message-blocks";

interface AssistantMessageProps {
  message: SDKAssistantMessage;
  // Tool results from subsequent messages in the conversation
  toolResults?: Map<string, { content: string; isError?: boolean }>;
  // Tool use IDs that are currently running
  runningToolIds?: Set<string>;
}

export function AssistantMessage({
  message,
  toolResults,
  runningToolIds,
}: AssistantMessageProps) {
  // Build a map of tool_use_id to tool name for result display
  const toolNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const block of message.message.content) {
      if (isToolUseBlock(block)) {
        const toolBlock = block;
        names.set(toolBlock.id, toolBlock.name);
      }
    }
    return names;
  }, [message.message.content]);

  // Filter out tool_result blocks - they're usually rendered with the tool_use
  const contentBlocks = message.message.content.filter(
    (block) => !isToolResultBlock(block),
  );

  if (contentBlocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {contentBlocks.map((block, index) => (
        <ContentBlock
          key={index}
          block={block}
          toolResults={toolResults}
          runningToolIds={runningToolIds}
          toolNames={toolNames}
        />
      ))}
    </div>
  );
}
