import type { ContentBlock as ContentBlockType } from "@/lib/claude";
import {
  isTextBlock,
  isToolUseBlock,
  isToolResultBlock,
  isThinkingBlock,
} from "@/lib/claude";
import { TextBlock } from "./text-block";
import { ToolUseBlock } from "./tool-use-block";
import { ToolResultBlock } from "./tool-result-block";
import { ThinkingBlock } from "./thinking-block";

interface ContentBlockProps {
  block: ContentBlockType;
  // For tool_use blocks, we may have the result available
  toolResults?: Map<string, { content: string; isError?: boolean }>;
  // Track running tool uses
  runningToolIds?: Set<string>;
  // Map of tool_use_id to tool name (for displaying in tool results)
  toolNames?: Map<string, string>;
}

export function ContentBlock({
  block,
  toolResults,
  runningToolIds,
  toolNames,
}: ContentBlockProps) {
  if (isTextBlock(block)) {
    return <TextBlock block={block} />;
  }

  if (isToolUseBlock(block)) {
    const toolBlock = block;
    const result = toolResults?.get(toolBlock.id);
    const isRunning = runningToolIds?.has(toolBlock.id);
    const status = result
      ? result.isError
        ? "error"
        : "success"
      : isRunning
        ? "running"
        : "pending";

    return <ToolUseBlock block={toolBlock} result={result} status={status} />;
  }

  if (isToolResultBlock(block)) {
    const toolName = toolNames?.get(block.tool_use_id);
    return <ToolResultBlock block={block} toolName={toolName} />;
  }

  if (isThinkingBlock(block)) {
    return <ThinkingBlock block={block} />;
  }

  // Unknown block type - render nothing
  return null;
}
