import { useClaudeStore, useConversationByBranchId } from "./claude-store";
import type { Conversation } from "./claude-store";
import { isAssistantMessage, isToolUseBlock } from "./claude";
import type { AskUserQuestionInput } from "@/components/claude/sdk-messages/ask-user-question-block";

export type AgentStatus = "working" | "waiting" | "idle";

export interface PendingQuestion {
  id: string;
  input: AskUserQuestionInput;
}

export function getPendingQuestion(
  conversation: Conversation | null,
  dismissedIds?: Set<string>,
): PendingQuestion | null {
  if (!conversation) return null;

  const lastMsg = conversation.messages[conversation.messages.length - 1];
  if (!lastMsg || lastMsg.role !== "assistant") return null;

  const sdkMessages = lastMsg.sdkMessages;
  if (!sdkMessages || sdkMessages.length === 0) return null;

  const toolUses: { id: string; input: unknown }[] = [];
  const toolResults = new Set<string>();

  for (const sdkMsg of sdkMessages) {
    if (isAssistantMessage(sdkMsg)) {
      for (const block of sdkMsg.message.content) {
        if (isToolUseBlock(block) && block.name === "AskUserQuestion") {
          toolUses.push({ id: block.id, input: block.input });
        }
        if (block.type === "tool_result") {
          toolResults.add(block.tool_use_id);
        }
      }
    }
  }

  const unanswered = toolUses.find(
    (t) => !toolResults.has(t.id) && (!dismissedIds || !dismissedIds.has(t.id)),
  );
  return unanswered
    ? { id: unanswered.id, input: unanswered.input as AskUserQuestionInput }
    : null;
}

export function useAgentStatus(branchId: string): AgentStatus {
  const isBranchStreaming = useClaudeStore((state) =>
    state.streamingBranchIds.has(branchId),
  );
  const conversation = useConversationByBranchId(branchId);

  if (isBranchStreaming) return "working";
  if (getPendingQuestion(conversation) !== null) return "waiting";
  return "idle";
}
