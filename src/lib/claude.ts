// Available Claude models
export const CLAUDE_MODELS = {
  "claude-sonnet-4-20250514": "Claude Sonnet 4",
  "claude-opus-4-20250514": "Claude Opus 4",
  "claude-3-5-haiku-20241022": "Claude 3.5 Haiku",
} as const;

export type ModelId = keyof typeof CLAUDE_MODELS;

// ==================== SDK Message Types ====================
// These mirror the types from @anthropic-ai/claude-agent-sdk

// Content block types
export interface TextBlock {
  type: "text";
  text: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string | Array<{ type: "text"; text: string }>;
  is_error?: boolean;
}

export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}

export type ContentBlock =
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock
  | ThinkingBlock;

// SDK Message types
export interface SDKAssistantMessage {
  type: "assistant";
  session_id?: string;
  message: {
    role: "assistant";
    content: ContentBlock[];
  };
}

export interface SDKUserMessage {
  type: "user";
  session_id?: string;
  message: {
    role: "user";
    content: string | ContentBlock[];
  };
}

export interface SDKUserMessageReplay {
  type: "user_message_replay";
  session_id?: string;
  message: {
    role: "user";
    content: string | ContentBlock[];
  };
}

export interface SDKResultMessage {
  type: "result";
  session_id?: string;
  result?: {
    success: boolean;
    duration_ms?: number;
    duration_api_ms?: number;
    input_tokens?: number;
    output_tokens?: number;
    cost_usd?: number;
    error_type?: string;
    error_message?: string;
  };
}

export interface SDKSystemMessage {
  type: "system";
  session_id?: string;
  message?: {
    role: "system";
    content: string;
  };
}

export interface SDKStatusMessage {
  type: "status";
  session_id?: string;
  status: string;
  message?: string;
}

export interface SDKPartialAssistantMessage {
  type: "partial_assistant";
  session_id?: string;
  text?: string;
  content?: ContentBlock[];
}

export interface SDKHookStartedMessage {
  type: "hook_started";
  session_id?: string;
  hook_name: string;
}

export interface SDKHookProgressMessage {
  type: "hook_progress";
  session_id?: string;
  hook_name: string;
  progress?: string;
}

export interface SDKHookResponseMessage {
  type: "hook_response";
  session_id?: string;
  hook_name: string;
  response?: string;
  success?: boolean;
}

export interface SDKAuthStatusMessage {
  type: "auth_status";
  session_id?: string;
  authenticated: boolean;
  method?: string;
}

export interface SDKTaskNotificationMessage {
  type: "task_notification";
  session_id?: string;
  task_id: string;
  status: string;
  message?: string;
}

export interface SDKToolUseSummaryMessage {
  type: "tool_use_summary";
  session_id?: string;
  tool_name: string;
  summary: string;
}

export interface SDKCompactBoundaryMessage {
  type: "compact_boundary";
  session_id?: string;
  reason?: string;
}

export type SDKMessage =
  | SDKAssistantMessage
  | SDKUserMessage
  | SDKUserMessageReplay
  | SDKResultMessage
  | SDKSystemMessage
  | SDKStatusMessage
  | SDKPartialAssistantMessage
  | SDKHookStartedMessage
  | SDKHookProgressMessage
  | SDKHookResponseMessage
  | SDKAuthStatusMessage
  | SDKTaskNotificationMessage
  | SDKToolUseSummaryMessage
  | SDKCompactBoundaryMessage;

// Type guards for SDK messages
export function isAssistantMessage(
  msg: SDKMessage,
): msg is SDKAssistantMessage {
  return msg.type === "assistant";
}

export function isUserMessage(msg: SDKMessage): msg is SDKUserMessage {
  return msg.type === "user";
}

export function isUserMessageReplay(
  msg: SDKMessage,
): msg is SDKUserMessageReplay {
  return msg.type === "user_message_replay";
}

export function isResultMessage(msg: SDKMessage): msg is SDKResultMessage {
  return msg.type === "result";
}

export function isSystemMessage(msg: SDKMessage): msg is SDKSystemMessage {
  return msg.type === "system";
}

export function isStatusMessage(msg: SDKMessage): msg is SDKStatusMessage {
  return msg.type === "status";
}

export function isPartialAssistantMessage(
  msg: SDKMessage,
): msg is SDKPartialAssistantMessage {
  return msg.type === "partial_assistant";
}

export function isHookStartedMessage(
  msg: SDKMessage,
): msg is SDKHookStartedMessage {
  return msg.type === "hook_started";
}

export function isHookProgressMessage(
  msg: SDKMessage,
): msg is SDKHookProgressMessage {
  return msg.type === "hook_progress";
}

export function isHookResponseMessage(
  msg: SDKMessage,
): msg is SDKHookResponseMessage {
  return msg.type === "hook_response";
}

export function isAuthStatusMessage(
  msg: SDKMessage,
): msg is SDKAuthStatusMessage {
  return msg.type === "auth_status";
}

export function isTaskNotificationMessage(
  msg: SDKMessage,
): msg is SDKTaskNotificationMessage {
  return msg.type === "task_notification";
}

export function isToolUseSummaryMessage(
  msg: SDKMessage,
): msg is SDKToolUseSummaryMessage {
  return msg.type === "tool_use_summary";
}

export function isCompactBoundaryMessage(
  msg: SDKMessage,
): msg is SDKCompactBoundaryMessage {
  return msg.type === "compact_boundary";
}

// Content block type guards
export function isTextBlock(block: ContentBlock): block is TextBlock {
  return block.type === "text";
}

export function isToolUseBlock(block: ContentBlock): block is ToolUseBlock {
  return block.type === "tool_use";
}

export function isToolResultBlock(
  block: ContentBlock,
): block is ToolResultBlock {
  return block.type === "tool_result";
}

export function isThinkingBlock(block: ContentBlock): block is ThinkingBlock {
  return block.type === "thinking";
}

// ==================== Chat Message Types ====================
// These are the types stored in the conversation

export interface UserChatMessage {
  role: "user";
  content: string;
  timestamp: string;
}

export interface AssistantChatMessage {
  role: "assistant";
  sdkMessages: SDKMessage[];
  timestamp: string;
}

export type ChatMessage = UserChatMessage | AssistantChatMessage;

// Legacy type for backward compatibility during migration
export interface LegacyChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Type guard for chat messages
export function isUserChatMessage(msg: ChatMessage): msg is UserChatMessage {
  return msg.role === "user";
}

export function isAssistantChatMessage(
  msg: ChatMessage,
): msg is AssistantChatMessage {
  return msg.role === "assistant";
}

// Helper to check if a message is legacy format
export function isLegacyChatMessage(
  msg: ChatMessage | LegacyChatMessage,
): msg is LegacyChatMessage {
  return (
    msg.role === "assistant" && "content" in msg && !("sdkMessages" in msg)
  );
}

// Agent SDK message types (legacy - kept for backward compatibility)
export interface AgentMessage {
  type: "user" | "assistant" | "result" | "system";
  session_id?: string; // Session ID for resuming conversations
  message?: {
    role?: string;
    content?: Array<{
      type: string;
      text?: string;
      name?: string;
      input?: unknown;
      tool_use_id?: string;
      content?: string;
    }>;
  };
  result?: {
    tool_use_id: string;
    content: string;
  };
  stats?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// Type declarations for the IPC-exposed chat API
export interface ClaudeChatAPI {
  sendMessage: (
    prompt: string,
    options?: {
      systemPrompt?: string;
      allowedTools?: string[];
      cwd?: string;
      permissionMode?: string;
      sessionId?: string; // Session ID for resuming conversation
    },
  ) => Promise<void>;
  interrupt: () => Promise<void>;
  onMessage: (callback: (message: SDKMessage) => void) => void;
  onDone: (callback: () => void) => void;
  onInterrupted: (callback: () => void) => void;
  onError: (callback: (error: string) => void) => void;
  removeAllListeners: () => void;
}

declare global {
  interface Window {
    claudeChatAPI?: ClaudeChatAPI;
  }
}

// Helper to check if running in Electron with chat API
export function isElectronWithChatAPI(): boolean {
  return typeof window !== "undefined" && !!window.claudeChatAPI;
}

// Helper to get the chat API (throws if not available)
export function getClaudeChatAPI(): ClaudeChatAPI {
  if (!window.claudeChatAPI) {
    throw new Error(
      "Claude Chat API not available. Make sure you're running in Electron.",
    );
  }
  return window.claudeChatAPI;
}

// Extract text content from an SDK message
export function extractTextFromSDKMessage(message: SDKMessage): string {
  if (isAssistantMessage(message)) {
    return message.message.content
      .filter(isTextBlock)
      .map((block) => block.text)
      .join("");
  }
  if (isPartialAssistantMessage(message)) {
    if (message.text) return message.text;
    if (message.content) {
      return message.content
        .filter(isTextBlock)
        .map((block) => block.text)
        .join("");
    }
  }
  return "";
}

// Check if SDK message contains tool use
export function hasToolUse(message: SDKMessage): boolean {
  if (isAssistantMessage(message)) {
    return message.message.content.some(isToolUseBlock);
  }
  return false;
}

// Get tool use blocks from an SDK message
export function getToolUseBlocks(
  message: SDKMessage,
): Array<{ name: string; input: unknown; id: string }> {
  if (isAssistantMessage(message)) {
    return message.message.content.filter(isToolUseBlock).map((block) => ({
      name: block.name,
      input: block.input,
      id: block.id,
    }));
  }
  return [];
}

// Extract text from an assistant chat message (aggregates all SDK messages)
export function extractTextFromAssistantMessage(
  message: AssistantChatMessage,
): string {
  return message.sdkMessages.map(extractTextFromSDKMessage).join("");
}

// Legacy function for backward compatibility
export function extractTextFromAgentMessage(message: AgentMessage): string {
  if (message.type === "assistant" && message.message?.content) {
    return message.message.content
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text)
      .join("");
  }
  return "";
}
