import {
  isElectronWithChatAPI,
  getClaudeChatAPI,
  type SDKMessage,
  type ToolPermissionRequest,
} from "./claude";
import { useClaudeStore } from "./claude-store";
import { showNotification } from "./notifications";
import { router } from "@/main";

let initialized = false;

/**
 * Registers persistent IPC listeners for Claude chat messages.
 * Call once at app startup. Idempotent — subsequent calls are no-ops.
 *
 * Listeners read/write state via useClaudeStore.getState() so they are
 * decoupled from any React component lifecycle.
 */
export function setupClaudeChatIPC(): void {
  if (initialized) return;
  if (!isElectronWithChatAPI()) return;

  initialized = true;
  const chatAPI = getClaudeChatAPI();

  chatAPI.onMessage((message: SDKMessage) => {
    console.log("[Claude SDK Message]", message);

    const { streamingContext } = useClaudeStore.getState();
    if (!streamingContext) return;

    const { conversationId } = streamingContext;

    // Capture session ID from the first message that carries one
    if (message.session_id) {
      const conv = useClaudeStore
        .getState()
        .conversations.find((c) => c.id === conversationId);
      if (conv && !conv.sessionId) {
        useClaudeStore
          .getState()
          .setConversationSessionId(conversationId, message.session_id);
      }
    }

    // Append all SDK messages to the current assistant turn
    useClaudeStore.getState().appendSDKMessage(conversationId, message);
  });

  // Listen for permission requests from the main process
  chatAPI.onPermissionRequest((request: ToolPermissionRequest) => {
    console.log("[Claude Permission Request]", request);
    useClaudeStore.getState().setPendingPermissionRequest(request);

    // Notify user if agent tab is not visible
    const { agentTabVisible, streamingContext } = useClaudeStore.getState();
    if (!agentTabVisible || document.hidden) {
      showNotification(
        "Permission requested",
        `Claude wants to use ${request.toolName}`,
        () => {
          window.focus();
          if (streamingContext) {
            void router.navigate({
              to: "/repositories/$repository/branches/$branch/agent",
              params: {
                repository: streamingContext.repositorySlug,
                branch: streamingContext.branchId,
              },
            });
          }
        },
      );
    }
  });

  chatAPI.onDone(() => {
    const { streamingContext, agentTabVisible } = useClaudeStore.getState();
    if (!streamingContext) return;

    useClaudeStore.getState().setPendingPermissionRequest(null);
    const { branchId, branchName, repositorySlug } = streamingContext;
    useClaudeStore.getState().stopStreaming(branchId);
    useClaudeStore.getState().clearStreamingContext();

    if (!agentTabVisible || document.hidden) {
      showNotification(
        "Agent finished",
        `Agent completed work on branch "${branchName}"`,
        () => {
          window.focus();
          void router.navigate({
            to: "/repositories/$repository/branches/$branch/agent",
            params: { repository: repositorySlug, branch: branchId },
          });
        },
      );
    }
  });

  chatAPI.onInterrupted(() => {
    const { streamingContext } = useClaudeStore.getState();
    if (!streamingContext) return;

    useClaudeStore.getState().setPendingPermissionRequest(null);
    useClaudeStore.getState().stopStreaming(streamingContext.branchId);
    useClaudeStore.getState().clearStreamingContext();
  });

  chatAPI.onError((errorMsg: string) => {
    const { streamingContext } = useClaudeStore.getState();

    useClaudeStore.getState().setPendingPermissionRequest(null);
    useClaudeStore.getState().setStreamingError(errorMsg);

    if (streamingContext) {
      const { conversationId, branchId } = streamingContext;
      useClaudeStore.getState().stopStreaming(branchId);

      // Remove empty assistant message on error
      const conv = useClaudeStore
        .getState()
        .conversations.find((c) => c.id === conversationId);
      if (conv && conv.messages.length > 0) {
        const lastMessage = conv.messages[conv.messages.length - 1];
        if (
          lastMessage.role === "assistant" &&
          "sdkMessages" in lastMessage &&
          lastMessage.sdkMessages.length === 0
        ) {
          useClaudeStore.setState((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === conversationId
                ? { ...c, messages: c.messages.slice(0, -1) }
                : c,
            ),
          }));
        }
      }

      useClaudeStore.getState().clearStreamingContext();
    }

    if (document.hidden) {
      const slug = streamingContext?.repositorySlug;
      const bId = streamingContext?.branchId;
      showNotification(
        "Agent error",
        `Agent encountered an error: ${errorMsg}`,
        () => {
          window.focus();
          if (slug && bId) {
            void router.navigate({
              to: "/repositories/$repository/branches/$branch/agent",
              params: { repository: slug, branch: bId },
            });
          }
        },
      );
    }
  });
}
