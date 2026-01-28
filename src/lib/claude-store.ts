import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ModelId, ChatMessage } from "./claude";

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  // Branch-related fields
  cwd?: string; // Working directory for Claude operations
  branchId?: string; // Link to tracked branch if created from branch view
}

export interface ClaudeSettings {
  model: ModelId;
  systemPrompt: string;
}

interface ClaudeState {
  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;

  // Settings
  settings: ClaudeSettings;

  // Streaming state
  isStreaming: boolean;
  streamingContent: string;

  // Actions - Conversations
  createConversation: () => string;
  createConversationForBranch: (branchId: string, cwd: string) => string;
  deleteConversation: (id: string) => void;
  clearConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  getActiveConversation: () => Conversation | null;
  getConversationByBranchId: (branchId: string) => Conversation | null;

  // Actions - Messages
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateLastAssistantMessage: (conversationId: string, content: string) => void;

  // Actions - Streaming
  setStreaming: (isStreaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;

  // Actions - Settings
  updateSettings: (settings: Partial<ClaudeSettings>) => void;
}

function generateId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
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
      },
      isStreaming: false,
      streamingContent: "",

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

      addMessage: (conversationId, message) => {
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

      updateLastAssistantMessage: (conversationId, content) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const messages = [...c.messages];
            const lastIndex = messages.length - 1;
            if (lastIndex >= 0 && messages[lastIndex].role === "assistant") {
              messages[lastIndex] = { ...messages[lastIndex], content };
            }
            return { ...c, messages, updatedAt: new Date().toISOString() };
          }),
        }));
      },

      setStreaming: (isStreaming) => {
        set({ isStreaming });
        if (!isStreaming) {
          set({ streamingContent: "" });
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
    }),
    {
      name: "codeflow:claude-chat",
      version: 4,
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
