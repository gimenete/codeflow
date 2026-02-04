import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ModelId,
  ChatMessage,
  UserChatMessage,
  AssistantChatMessage,
  SDKMessage,
  ToolPermissionRequest,
} from "./claude";

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  // Branch-related fields
  cwd?: string; // Working directory for Claude operations
  branchId?: string; // Link to tracked branch if created from branch view
  sessionId?: string; // Claude Agent SDK session ID for resuming conversations
}

export type PermissionMode = "default" | "acceptEdits" | "plan" | "dontAsk";

export interface ClaudeSettings {
  model: ModelId;
  systemPrompt: string;
  permissionMode: PermissionMode;
}

export interface StreamingContext {
  conversationId: string;
  branchId: string;
  branchName: string;
  repositorySlug: string;
}

interface ClaudeState {
  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;

  // Settings
  settings: ClaudeSettings;

  // Streaming state (per-branch)
  streamingBranchIds: Set<string>;
  isStreaming: boolean; // Derived: streamingBranchIds.size > 0
  streamingContent: string;
  currentAssistantTurnId: string | null; // Track current assistant turn for streaming

  // Streaming context (ephemeral, not persisted) - tracks active streaming session
  streamingContext: StreamingContext | null;
  streamingError: string | null;
  agentTabVisible: boolean;

  // Prompt text (ephemeral, not persisted) - for external components to add text to chat input
  promptText: string | null;

  // Focus request (ephemeral, not persisted) - for triggering input focus from external components
  shouldFocusInput: boolean;

  // Permission request (ephemeral, not persisted) - pending SDK-level tool permission request
  pendingPermissionRequest: ToolPermissionRequest | null;

  // Actions - Conversations
  createConversation: () => string;
  createConversationForBranch: (branchId: string, cwd: string) => string;
  deleteConversation: (id: string) => void;
  clearConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  getActiveConversation: () => Conversation | null;
  getConversationByBranchId: (branchId: string) => Conversation | null;

  // Actions - Messages
  addUserMessage: (conversationId: string, content: string) => void;
  startAssistantTurn: (conversationId: string) => void;
  appendSDKMessage: (conversationId: string, message: SDKMessage) => void;
  setConversationSessionId: (conversationId: string, sessionId: string) => void;

  // Actions - Streaming (per-branch)
  startStreaming: (branchId: string) => void;
  stopStreaming: (branchId: string) => void;
  isBranchStreaming: (branchId: string) => boolean;
  setStreaming: (isStreaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;

  // Actions - Settings
  updateSettings: (settings: Partial<ClaudeSettings>) => void;

  // Actions - Streaming context
  setStreamingContext: (ctx: StreamingContext) => void;
  clearStreamingContext: () => void;
  setStreamingError: (error: string | null) => void;
  setAgentTabVisible: (visible: boolean) => void;

  // Actions - Prompt text
  appendToPrompt: (text: string) => void;
  clearPromptText: () => void;

  // Actions - Focus
  requestInputFocus: () => void;
  clearInputFocus: () => void;

  // Actions - Permission requests
  setPendingPermissionRequest: (request: ToolPermissionRequest | null) => void;
}

function generateId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find(
    (m): m is UserChatMessage => m.role === "user",
  );
  if (!firstUserMessage) return "New Conversation";
  const content = firstUserMessage.content.slice(0, 50);
  return content.length < firstUserMessage.content.length
    ? `${content}...`
    : content;
}

export const useClaudeStore = create<ClaudeState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      settings: {
        model: "claude-sonnet-4-20250514",
        systemPrompt: "",
        permissionMode: "acceptEdits",
      },
      streamingBranchIds: new Set<string>(),
      isStreaming: false,
      streamingContent: "",
      currentAssistantTurnId: null,
      streamingContext: null,
      streamingError: null,
      agentTabVisible: true,
      promptText: null,
      shouldFocusInput: false,
      pendingPermissionRequest: null,

      createConversation: () => {
        const id = generateId();
        const now = new Date().toISOString();
        const conversation: Conversation = {
          id,
          title: "New Conversation",
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
        }));
        return id;
      },

      createConversationForBranch: (branchId, cwd) => {
        const id = generateId();
        const now = new Date().toISOString();
        const conversation: Conversation = {
          id,
          title: "New Conversation",
          messages: [],
          createdAt: now,
          updatedAt: now,
          branchId,
          cwd,
        };
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
        }));
        return id;
      },

      deleteConversation: (id) => {
        set((state) => {
          const newConversations = state.conversations.filter(
            (c) => c.id !== id,
          );
          return {
            conversations: newConversations,
            activeConversationId:
              state.activeConversationId === id
                ? (newConversations[0]?.id ?? null)
                : state.activeConversationId,
          };
        });
      },

      clearConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id
              ? {
                  ...c,
                  messages: [],
                  title: "New Conversation",
                  updatedAt: new Date().toISOString(),
                  sessionId: undefined, // Clear session ID when clearing conversation
                }
              : c,
          ),
        }));
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
      },

      getActiveConversation: () => {
        const state = get();
        return (
          state.conversations.find(
            (c) => c.id === state.activeConversationId,
          ) ?? null
        );
      },

      getConversationByBranchId: (branchId) => {
        return get().conversations.find((c) => c.branchId === branchId) ?? null;
      },

      addUserMessage: (conversationId, content) => {
        const message: UserChatMessage = {
          role: "user",
          content,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const newMessages = [...c.messages, message];
            return {
              ...c,
              messages: newMessages,
              title:
                c.title === "New Conversation"
                  ? generateTitle(newMessages)
                  : c.title,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      startAssistantTurn: (conversationId) => {
        const turnId = `turn-${Date.now()}`;
        const message: AssistantChatMessage = {
          role: "assistant",
          sdkMessages: [],
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              messages: [...c.messages, message],
              updatedAt: new Date().toISOString(),
            };
          }),
          currentAssistantTurnId: turnId,
        }));
      },

      appendSDKMessage: (conversationId, sdkMessage) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const messages = [...c.messages];
            const lastIndex = messages.length - 1;
            const lastMessage = messages[lastIndex];
            if (lastIndex >= 0 && lastMessage?.role === "assistant") {
              const assistantMsg = lastMessage;
              messages[lastIndex] = {
                ...assistantMsg,
                sdkMessages: [...assistantMsg.sdkMessages, sdkMessage],
              };
            }
            return { ...c, messages, updatedAt: new Date().toISOString() };
          }),
        }));
      },

      setConversationSessionId: (conversationId, sessionId) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, sessionId } : c,
          ),
        }));
      },

      startStreaming: (branchId) => {
        set((state) => {
          const next = new Set(state.streamingBranchIds);
          next.add(branchId);
          return {
            streamingBranchIds: next,
            isStreaming: true,
            streamingContent: "",
            currentAssistantTurnId: `turn-${Date.now()}`,
          };
        });
      },

      stopStreaming: (branchId) => {
        set((state) => {
          const next = new Set(state.streamingBranchIds);
          next.delete(branchId);
          return {
            streamingBranchIds: next,
            isStreaming: next.size > 0,
            streamingContent: "",
            currentAssistantTurnId: null,
          };
        });
      },

      isBranchStreaming: (branchId) => {
        return get().streamingBranchIds.has(branchId);
      },

      setStreaming: (isStreaming) => {
        set({ isStreaming });
        if (!isStreaming) {
          set({ streamingContent: "", currentAssistantTurnId: null });
        }
      },

      setStreamingContent: (content) => {
        set({ streamingContent: content });
      },

      appendStreamingContent: (chunk) => {
        set((state) => ({
          streamingContent: state.streamingContent + chunk,
        }));
      },

      updateSettings: (settings) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
      },

      setStreamingContext: (ctx) => {
        set({ streamingContext: ctx });
      },

      clearStreamingContext: () => {
        set({ streamingContext: null });
      },

      setStreamingError: (error) => {
        set({ streamingError: error });
      },

      setAgentTabVisible: (visible) => {
        set({ agentTabVisible: visible });
      },

      appendToPrompt: (text) => {
        const current = get().promptText;
        if (current) {
          set({ promptText: current + "\n" + text });
        } else {
          set({ promptText: text });
        }
      },

      clearPromptText: () => {
        set({ promptText: null });
      },

      requestInputFocus: () => {
        set({ shouldFocusInput: true });
      },

      clearInputFocus: () => {
        set({ shouldFocusInput: false });
      },

      setPendingPermissionRequest: (request) => {
        set({ pendingPermissionRequest: request });
      },
    }),
    {
      name: "codeflow:claude-chat",
      version: 6,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        settings: state.settings,
      }),
      migrate: (persistedState, version) => {
        const state = persistedState as Record<string, unknown>;
        if (version < 2) {
          // Migration from version 1: remove CLI auth fields
          const settings = state.settings as Record<string, unknown>;
          if (settings) {
            delete settings.authSource;
            delete settings.cliAccessToken;
            delete settings.cliExpiresAt;
          }
        }
        if (version < 3) {
          // Migration from version 2: remove apiKey (now using Agent SDK with CLI auth)
          const settings = state.settings as Record<string, unknown>;
          if (settings) {
            delete settings.apiKey;
          }
        }
        if (version < 4) {
          // Migration from version 3: add cwd and branchId fields to conversations
          // No changes needed - new fields are optional and will be undefined for existing conversations
          // Note: taskId was renamed to branchId in version 4
          const conversations =
            (state.conversations as Array<Record<string, unknown>>) ?? [];
          state.conversations = conversations.map((c) => {
            if (c.taskId) {
              return { ...c, branchId: c.taskId, taskId: undefined };
            }
            return c;
          });
        }
        if (version < 5) {
          // Migration from version 4: add permissionMode to settings
          const settings = state.settings as Record<string, unknown>;
          if (settings && !settings.permissionMode) {
            settings.permissionMode = "acceptEdits";
          }
        }
        if (version < 6) {
          // Migration from version 5: convert legacy messages to new format
          // Legacy format: { role: "user" | "assistant", content: string }
          // New format: UserChatMessage | AssistantChatMessage
          const conversations =
            (state.conversations as Array<Record<string, unknown>>) ?? [];
          state.conversations = conversations.map((c) => {
            const messages =
              (c.messages as Array<Record<string, unknown>>) ?? [];
            const migratedMessages = messages.map((m) => {
              const role = m.role as string;
              const now = new Date().toISOString();
              if (role === "user") {
                return {
                  role: "user",
                  content: (m.content as string) || "",
                  timestamp: now,
                };
              } else {
                // Convert assistant message with plain content to new format
                // Create a synthetic SDK message with the text content
                const content = (m.content as string) || "";
                return {
                  role: "assistant",
                  sdkMessages: content
                    ? [
                        {
                          type: "assistant",
                          message: {
                            role: "assistant",
                            content: [{ type: "text", text: content }],
                          },
                        },
                      ]
                    : [],
                  timestamp: now,
                };
              }
            });
            return { ...c, messages: migratedMessages };
          });
        }
        return state as unknown as ClaudeState;
      },
    },
  ),
);

// React hooks for easier component access
export function useActiveConversation(): Conversation | null {
  return useClaudeStore(
    (state) =>
      state.conversations.find((c) => c.id === state.activeConversationId) ??
      null,
  );
}

export function useConversations(): Conversation[] {
  return useClaudeStore((state) => state.conversations);
}

export function useClaudeSettings(): ClaudeSettings {
  return useClaudeStore((state) => state.settings);
}

export function useIsStreaming(): boolean {
  return useClaudeStore((state) => state.isStreaming);
}

export function useStreamingContent(): string {
  return useClaudeStore((state) => state.streamingContent);
}

export function useConversationByBranchId(
  branchId: string,
): Conversation | null {
  return useClaudeStore(
    (state) => state.conversations.find((c) => c.branchId === branchId) ?? null,
  );
}

export function useIsBranchStreaming(branchId: string): boolean {
  return useClaudeStore((state) => state.streamingBranchIds.has(branchId));
}

export function useStreamingError(): string | null {
  return useClaudeStore((state) => state.streamingError);
}

export function usePendingPermissionRequest(): ToolPermissionRequest | null {
  return useClaudeStore((state) => state.pendingPermissionRequest);
}
