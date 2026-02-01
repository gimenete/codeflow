import type { ContentBlock as ContentBlockType } from "@/lib/claude";
import {
  isTextBlock,
  isToolUseBlock,
  isToolResultBlock,
  isThinkingBlock,
} from "@/lib/claude";
import { TextBlock } from "./text-block";
import { ToolResultBlock } from "./tool-result-block";
import { ThinkingBlock } from "./thinking-block";

interface ContentBlockProps {
  block: ContentBlockType;
  // Map of tool_use_id to tool name (for displaying in tool results)
  toolNames?: Map<string, string>;
}

export function ContentBlock({ block, toolNames }: ContentBlockProps) {
  if (isTextBlock(block)) {
    return <TextBlock block={block} />;
  }

  if (isToolUseBlock(block)) {
    // Tool use blocks are now shown only via ActiveToolIndicator
    return null;
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
