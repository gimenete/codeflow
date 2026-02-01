import { useState, useRef, useCallback, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/claude/chat-message";
import { ChatInput } from "@/components/claude/chat-input";
import {
  isElectronWithChatAPI,
  getClaudeChatAPI,
  type SDKMessage,
} from "@/lib/claude";
import {
  useClaudeStore,
  useClaudeSettings,
  useIsStreaming,
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
  const [info, setInfo] = useState<string | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const conversation = useConversationByBranchId(branch.id);
  const settings = useClaudeSettings();
  const isStreaming = useIsStreaming();
  const linkConversation = useBranchesStore((state) => state.linkConversation);

  const {
    createConversationForBranch,
    addUserMessage,
    startAssistantTurn,
    appendSDKMessage,
    setStreaming,
    updateSettings,
    setConversationSessionId,
    clearConversation,
  } = useClaudeStore();

  // Sync sessionIdRef with conversation's sessionId when conversation exists
  useEffect(() => {
    if (conversation?.sessionId) {
      sessionIdRef.current = conversation.sessionId;
    } else {
      sessionIdRef.current = null;
    }
  }, [conversation?.sessionId]);

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

  // Handle slash commands locally
  const handleCommand = useCallback(
    (command: string): boolean => {
      const cmd = command.toLowerCase().trim();

      if (cmd === "/clear") {
        if (conversation?.id) {
          clearConversation(conversation.id);
          // Also clear the session ID so next message starts fresh
          sessionIdRef.current = null;
        }
        setInputValue("");
        setError(null);
        setInfo(null);
        return true;
      }

      if (cmd === "/help") {
        setInfo("Available commands: /clear (clear conversation), /help");
        setError(null);
        setInputValue("");
        return true;
      }

      return false;
    },
    [conversation?.id, clearConversation],
  );

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage = inputValue.trim();

    // Check for slash commands first
    if (userMessage.startsWith("/")) {
      if (handleCommand(userMessage)) {
        return;
      }
      // Unknown command - show error but don't send to Claude
      setError(`Unknown command: ${userMessage.split(" ")[0]}`);
      return;
    }

    if (!isElectronWithChatAPI()) {
      setError(
        "Chat requires running in Electron with Claude CLI authentication",
      );
      return;
    }

    setError(null);
    setInfo(null);

    // Create a conversation if none exists for this branch
    let conversationId = conversation?.id;
    if (!conversationId) {
      conversationId = createConversationForBranch(branch.id, cwd);
      linkConversation(branch.id, conversationId);
    }

    // Store conversation ID for message handlers
    conversationIdRef.current = conversationId;

    // Add user message
    addUserMessage(conversationId, userMessage);
    setInputValue("");

    // Scroll to bottom after adding user message
    setTimeout(scrollToBottom, 0);

    // Start assistant turn for streaming SDK messages
    startAssistantTurn(conversationId);
    setStreaming(true);

    // Send via IPC with cwd, permissionMode, and sessionId for conversation resumption
    const chatAPI = getClaudeChatAPI();
    void chatAPI.sendMessage(userMessage, {
      systemPrompt: settings.systemPrompt || undefined,
      cwd,
      permissionMode: settings.permissionMode,
      sessionId: sessionIdRef.current || undefined,
    });
  }, [
    inputValue,
    isStreaming,
    handleCommand,
    conversation?.id,
    branch.id,
    cwd,
    settings.systemPrompt,
    settings.permissionMode,
    createConversationForBranch,
    linkConversation,
    addUserMessage,
    startAssistantTurn,
    setStreaming,
    scrollToBottom,
  ]);

  // Setup IPC listeners
  useEffect(() => {
    if (!isElectronWithChatAPI()) return;

    const chatAPI = getClaudeChatAPI();

    const handleMessage = (message: SDKMessage) => {
      const conversationId = conversationIdRef.current;
      if (!conversationId) return;

      // Capture session ID from any message (all messages have session_id)
      if (message.session_id && !sessionIdRef.current) {
        sessionIdRef.current = message.session_id;
        setConversationSessionId(conversationId, message.session_id);
      }

      // Append all SDK messages to the current assistant turn
      appendSDKMessage(conversationId, message);
      scrollToBottom();
    };

    const handleDone = () => {
      setStreaming(false);
      conversationIdRef.current = null;
    };

    const handleInterrupted = () => {
      setStreaming(false);
      conversationIdRef.current = null;
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
      }

      conversationIdRef.current = null;
    };

    chatAPI.onMessage(handleMessage);
    chatAPI.onDone(handleDone);
    chatAPI.onInterrupted(handleInterrupted);
    chatAPI.onError(handleError);

    return () => {
      chatAPI.removeAllListeners();
    };
  }, [
    appendSDKMessage,
    setStreaming,
    scrollToBottom,
    setConversationSessionId,
  ]);

  const handleStop = useCallback(() => {
    if (isElectronWithChatAPI()) {
      const chatAPI = getClaudeChatAPI();
      void chatAPI.interrupt();
    }
  }, []);

  // Get messages to display
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
                message={message}
                isStreaming={
                  isLastMessageStreaming && index === displayMessages.length - 1
                }
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Info message */}
      {info && (
        <div className="px-4 py-2 text-sm text-muted-foreground bg-muted/50 border-t">
          {info}
        </div>
      )}

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
