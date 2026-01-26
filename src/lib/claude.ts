// Available Claude models
export const CLAUDE_MODELS = {
  "claude-sonnet-4-20250514": "Claude Sonnet 4",
  "claude-opus-4-20250514": "Claude Opus 4",
  "claude-3-5-haiku-20241022": "Claude 3.5 Haiku",
} as const;

export type ModelId = keyof typeof CLAUDE_MODELS;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Agent SDK message types
export interface AgentMessage {
  type: "user" | "assistant" | "result" | "system";
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
    options?: { systemPrompt?: string; allowedTools?: string[] }
  ) => Promise<void>;
  interrupt: () => Promise<void>;
  onMessage: (callback: (message: AgentMessage) => void) => void;
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
      "Claude Chat API not available. Make sure you're running in Electron."
    );
  }
  return window.claudeChatAPI;
}

// Extract text content from an agent message
export function extractTextFromAgentMessage(message: AgentMessage): string {
  if (message.type === "assistant" && message.message?.content) {
    return message.message.content
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text)
      .join("");
  }
  return "";
}

// Check if agent message contains tool use
export function hasToolUse(message: AgentMessage): boolean {
  if (message.type === "assistant" && message.message?.content) {
    return message.message.content.some((block) => block.type === "tool_use");
  }
  return false;
}

// Get tool use blocks from an agent message
export function getToolUseBlocks(
  message: AgentMessage
): Array<{ name: string; input: unknown; id: string }> {
  if (message.type === "assistant" && message.message?.content) {
    return message.message.content
      .filter((block) => block.type === "tool_use")
      .map((block) => ({
        name: block.name || "",
        input: block.input,
        id: block.tool_use_id || "",
      }));
  }
  return [];
}
