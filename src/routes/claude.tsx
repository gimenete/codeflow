import { useState, useRef, useCallback, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Settings,
  Trash2,
  Download,
  MoreHorizontal,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChatMessage } from "@/components/claude/chat-message";
import { ChatInput } from "@/components/claude/chat-input";
import { ChatSettingsDialog } from "@/components/claude/chat-settings-dialog";
import {
  isElectronWithChatAPI,
  getClaudeChatAPI,
  extractTextFromAgentMessage,
  type AgentMessage,
} from "@/lib/claude";
import {
  useClaudeStore,
  useActiveConversation,
  useConversations,
  useClaudeSettings,
  useIsStreaming,
  useStreamingContent,
} from "@/lib/claude-store";

export const Route = createFileRoute("/claude")({
  component: ClaudePage,
});

function ClaudePage() {
  const [inputValue, setInputValue] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string | null>(null);
  const accumulatedTextRef = useRef<string>("");

  const conversations = useConversations();
  const activeConversation = useActiveConversation();
  const settings = useClaudeSettings();
  const isStreaming = useIsStreaming();
  const streamingContent = useStreamingContent();

  const {
    createConversation,
    deleteConversation,
    clearConversation,
    setActiveConversation,
    addMessage,
    updateLastAssistantMessage,
    setStreaming,
    appendStreamingContent,
    setStreamingContent,
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

    // Create a conversation if none exists
    let conversationId = activeConversation?.id;
    if (!conversationId) {
      conversationId = createConversation();
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

    // Send via IPC
    const chatAPI = getClaudeChatAPI();
    void chatAPI.sendMessage(userMessage, {
      systemPrompt: settings.systemPrompt || undefined,
    });
  }, [
    inputValue,
    isStreaming,
    activeConversation?.id,
    settings.systemPrompt,
    createConversation,
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
      console.log("message:", message);
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

  const handleNewChat = useCallback(() => {
    createConversation();
    setInputValue("");
    setError(null);
  }, [createConversation]);

  const handleExport = useCallback(() => {
    if (!activeConversation) return;

    const content = activeConversation.messages
      .map((m) => `## ${m.role === "user" ? "You" : "Claude"}\n\n${m.content}`)
      .join("\n\n---\n\n");

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeConversation.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeConversation]);

  const handleDeleteConfirm = useCallback(() => {
    if (activeConversation) {
      deleteConversation(activeConversation.id);
    }
    setDeleteDialogOpen(false);
  }, [activeConversation, deleteConversation]);

  // Get messages to display (including streaming content)
  const displayMessages = activeConversation?.messages ?? [];
  const lastMessage = displayMessages[displayMessages.length - 1];
  const isLastMessageStreaming =
    isStreaming && lastMessage?.role === "assistant";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="h-5 w-5 shrink-0" />
          <h1 className="font-semibold truncate">Claude Chat</h1>
        </div>

        <div className="flex items-center gap-2">
          {conversations.length > 0 && (
            <Select
              value={activeConversation?.id ?? ""}
              onValueChange={setActiveConversation}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select conversation" />
              </SelectTrigger>
              <SelectContent>
                {conversations.map((conv) => (
                  <SelectItem key={conv.id} value={conv.id}>
                    <span className="truncate">{conv.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" size="icon" onClick={handleNewChat}>
            <Plus className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              {activeConversation && (
                <>
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="h-4 w-4" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      activeConversation &&
                      clearConversation(activeConversation.id)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear messages
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete conversation
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        {displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
            <h2 className="text-lg font-medium mb-2">Start a conversation</h2>
            <p className="text-sm max-w-md">
              Send a message to start chatting with Claude. Your conversations
              are saved locally.
            </p>
          </div>
        ) : (
          <div className="divide-y">
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
        />
      </div>

      {/* Settings Dialog */}
      <ChatSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
