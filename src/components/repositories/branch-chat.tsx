import { useState, useRef, useCallback, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/claude/chat-message";
import { ChatInput } from "@/components/claude/chat-input";
import {
  isElectronWithChatAPI,
  getClaudeChatAPI,
  extractTextFromAgentMessage,
  type AgentMessage,
} from "@/lib/claude";
import {
  useClaudeStore,
  useClaudeSettings,
  useIsStreaming,
  useStreamingContent,
  useConversationByBranchId,
  type PermissionMode,
} from "@/lib/claude-store";
import { useBranchesStore } from "@/lib/branches-store";
import type { TrackedBranch } from "@/lib/github-types";

interface BranchChatProps {
  branch: TrackedBranch;
  cwd: string;
}

export function BranchChat({ branch, cwd }: BranchChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string | null>(null);
  const accumulatedTextRef = useRef<string>("");

  const conversation = useConversationByBranchId(branch.id);
  const settings = useClaudeSettings();
  const isStreaming = useIsStreaming();
  const streamingContent = useStreamingContent();
  const linkConversation = useBranchesStore((state) => state.linkConversation);

  const {
    createConversationForBranch,
    addMessage,
    updateLastAssistantMessage,
    setStreaming,
    appendStreamingContent,
    setStreamingContent,
    updateSettings,
  } = useClaudeStore();

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-slot='scroll-area-viewport']",
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;

    if (!isElectronWithChatAPI()) {
      setError(
        "Chat requires running in Electron with Claude CLI authentication",
      );
      return;
    }

    setError(null);

    // Create a conversation if none exists for this branch
    let conversationId = conversation?.id;
    if (!conversationId) {
      conversationId = createConversationForBranch(branch.id, cwd);
      linkConversation(branch.id, conversationId);
    }

    // Store conversation ID for message handlers
    conversationIdRef.current = conversationId;
    accumulatedTextRef.current = "";

    // Add user message
    const userMessage = inputValue.trim();
    addMessage(conversationId, { role: "user", content: userMessage });
    setInputValue("");

    // Scroll to bottom after adding user message
    setTimeout(scrollToBottom, 0);

    // Add empty assistant message for streaming
    addMessage(conversationId, { role: "assistant", content: "" });
    setStreaming(true);
    setStreamingContent("");

    // Send via IPC with cwd and permissionMode
    const chatAPI = getClaudeChatAPI();
    void chatAPI.sendMessage(userMessage, {
      systemPrompt: settings.systemPrompt || undefined,
      cwd,
      permissionMode: settings.permissionMode,
    });
  }, [
    inputValue,
    isStreaming,
    conversation?.id,
    branch.id,
    cwd,
    settings.systemPrompt,
    settings.permissionMode,
    createConversationForBranch,
    linkConversation,
    addMessage,
    setStreaming,
    setStreamingContent,
    scrollToBottom,
  ]);

  // Setup IPC listeners
  useEffect(() => {
    if (!isElectronWithChatAPI()) return;

    const chatAPI = getClaudeChatAPI();

    const handleMessage = (message: AgentMessage) => {
      const conversationId = conversationIdRef.current;
      if (!conversationId) return;

      // Extract text from assistant messages
      if (message.type === "assistant") {
        const text = extractTextFromAgentMessage(message);
        if (text) {
          accumulatedTextRef.current += text;
          appendStreamingContent(text);
          updateLastAssistantMessage(
            conversationId,
            accumulatedTextRef.current,
          );
          scrollToBottom();
        }
      }
    };

    const handleDone = () => {
      setStreaming(false);
      conversationIdRef.current = null;
      accumulatedTextRef.current = "";
    };

    const handleInterrupted = () => {
      setStreaming(false);
      conversationIdRef.current = null;
      accumulatedTextRef.current = "";
    };

    const handleError = (errorMsg: string) => {
      setError(errorMsg);
      setStreaming(false);

      // Remove empty assistant message on error
      const conversationId = conversationIdRef.current;
      if (conversationId) {
        const conv = useClaudeStore
          .getState()
          .conversations.find((c) => c.id === conversationId);
        if (conv && conv.messages.length > 0) {
          const lastMessage = conv.messages[conv.messages.length - 1];
          if (lastMessage.role === "assistant" && !lastMessage.content) {
            useClaudeStore.setState((state) => ({
              conversations: state.conversations.map((c) =>
                c.id === conversationId
                  ? { ...c, messages: c.messages.slice(0, -1) }
                  : c,
              ),
            }));
          }
        }
      }

      conversationIdRef.current = null;
      accumulatedTextRef.current = "";
    };

    chatAPI.onMessage(handleMessage);
    chatAPI.onDone(handleDone);
    chatAPI.onInterrupted(handleInterrupted);
    chatAPI.onError(handleError);

    return () => {
      chatAPI.removeAllListeners();
    };
  }, [
    appendStreamingContent,
    updateLastAssistantMessage,
    setStreaming,
    scrollToBottom,
  ]);

  const handleStop = useCallback(() => {
    if (isElectronWithChatAPI()) {
      const chatAPI = getClaudeChatAPI();
      void chatAPI.interrupt();
    }
  }, []);

  // Get messages to display (including streaming content)
  const displayMessages = conversation?.messages ?? [];
  const lastMessage = displayMessages[displayMessages.length - 1];
  const isLastMessageStreaming =
    isStreaming && lastMessage?.role === "assistant";

  const handleModeChange = useCallback(
    (mode: PermissionMode) => {
      updateSettings({ permissionMode: mode });
    },
    [updateSettings],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
        {displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
            <h3 className="text-base font-medium mb-2">Start working</h3>
            <p className="text-sm max-w-md">
              Chat with Claude about this branch. Claude has access to the files
              in your repository directory.
            </p>
          </div>
        ) : (
          <div>
            {displayMessages.map((message, index) => (
              <ChatMessage
                key={index}
                message={
                  isLastMessageStreaming && index === displayMessages.length - 1
                    ? {
                        ...message,
                        content: streamingContent || message.content,
                      }
                    : message
                }
                isStreaming={
                  isLastMessageStreaming && index === displayMessages.length - 1
                }
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 border-t">
          Error: {error}
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
          permissionMode={settings.permissionMode}
          onModeChange={handleModeChange}
        />
      </div>
    </div>
  );
}
