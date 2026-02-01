import type { SDKMessage } from "@/lib/claude";
import {
  isAssistantMessage,
  isUserMessage,
  isUserMessageReplay,
  isResultMessage,
  isStatusMessage,
  isPartialAssistantMessage,
  isSystemMessage,
  isHookStartedMessage,
  isHookProgressMessage,
  isHookResponseMessage,
  isAuthStatusMessage,
  isTaskNotificationMessage,
  isToolUseSummaryMessage,
  isCompactBoundaryMessage,
  isToolUseBlock,
  isToolResultBlock,
} from "@/lib/claude";
import { AssistantMessage } from "./assistant-message";
import { UserMessage } from "./user-message";
import { ResultMessage } from "./result-message";
import { StatusMessage } from "./status-message";
import { PartialAssistantMessage } from "./partial-assistant-message";
import { SystemMessage } from "./system-message";
import {
  HookStartedMessage,
  HookProgressMessage,
  HookResponseMessage,
} from "./hook-messages";
import { AuthStatusMessage } from "./auth-status-message";
import { TaskNotificationMessage } from "./task-notification-message";
import { ToolUseSummaryMessage } from "./tool-use-summary-message";
import { CompactBoundaryMessage } from "./compact-boundary-message";

interface SDKMessageRendererProps {
  messages: SDKMessage[];
  isStreaming?: boolean;
}

// Build tool results map from the messages
function buildToolResults(
  messages: SDKMessage[],
): Map<string, { content: string; isError?: boolean }> {
  const results = new Map<string, { content: string; isError?: boolean }>();

  for (const message of messages) {
    if (isAssistantMessage(message)) {
      for (const block of message.message.content) {
        if (isToolResultBlock(block)) {
          const content =
            typeof block.content === "string"
              ? block.content
              : block.content.map((c) => c.text).join("");
          results.set(block.tool_use_id, {
            content,
            isError: block.is_error,
          });
        }
      }
    }
  }

  return results;
}

// Find all tool_use IDs that don't have results yet
function findRunningToolIds(
  messages: SDKMessage[],
  toolResults: Map<string, { content: string; isError?: boolean }>,
): Set<string> {
  const running = new Set<string>();

  for (const message of messages) {
    if (isAssistantMessage(message)) {
      for (const block of message.message.content) {
        if (isToolUseBlock(block)) {
          const toolBlock = block;
          if (!toolResults.has(toolBlock.id)) {
            running.add(toolBlock.id);
          }
        }
      }
    }
  }

  return running;
}

export function SDKMessageRenderer({
  messages,
  isStreaming,
}: SDKMessageRendererProps) {
  if (messages.length === 0) {
    return null;
  }

  // Pre-compute tool results and running tools
  const toolResults = buildToolResults(messages);
  const runningToolIds = findRunningToolIds(messages, toolResults);

  return (
    <div className="space-y-2">
      {messages.map((message, index) => {
        const isLastMessage = index === messages.length - 1;
        const showStreamingCursor = isStreaming && isLastMessage;

        if (isAssistantMessage(message)) {
          return (
            <AssistantMessage
              key={index}
              message={message}
              toolResults={toolResults}
              runningToolIds={showStreamingCursor ? runningToolIds : undefined}
            />
          );
        }

        if (isUserMessage(message)) {
          return <UserMessage key={index} message={message} />;
        }

        if (isUserMessageReplay(message)) {
          return <UserMessage key={index} message={message} isReplay />;
        }

        if (isResultMessage(message)) {
          return <ResultMessage key={index} message={message} />;
        }

        if (isStatusMessage(message)) {
          return <StatusMessage key={index} message={message} />;
        }

        if (isPartialAssistantMessage(message)) {
          return (
            <PartialAssistantMessage
              key={index}
              message={message}
              isStreaming={showStreamingCursor}
            />
          );
        }

        if (isSystemMessage(message)) {
          return <SystemMessage key={index} message={message} />;
        }

        if (isHookStartedMessage(message)) {
          return <HookStartedMessage key={index} message={message} />;
        }

        if (isHookProgressMessage(message)) {
          return <HookProgressMessage key={index} message={message} />;
        }

        if (isHookResponseMessage(message)) {
          return <HookResponseMessage key={index} message={message} />;
        }

        if (isAuthStatusMessage(message)) {
          return <AuthStatusMessage key={index} message={message} />;
        }

        if (isTaskNotificationMessage(message)) {
          return <TaskNotificationMessage key={index} message={message} />;
        }

        if (isToolUseSummaryMessage(message)) {
          return <ToolUseSummaryMessage key={index} message={message} />;
        }

        if (isCompactBoundaryMessage(message)) {
          return <CompactBoundaryMessage key={index} message={message} />;
        }

        // Unknown message type - skip
        return null;
      })}
    </div>
  );
}
