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
import { CompactBoundaryMessage } from "./compact-boundary-message";

interface SDKMessageRendererProps {
  messages: SDKMessage[];
  isStreaming?: boolean;
}

export function SDKMessageRenderer({
  messages,
  isStreaming,
}: SDKMessageRendererProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {messages.map((message, index) => {
        const isLastMessage = index === messages.length - 1;
        const showStreamingCursor = isStreaming && isLastMessage;

        if (isAssistantMessage(message)) {
          return <AssistantMessage key={index} message={message} />;
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
          return null;
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
