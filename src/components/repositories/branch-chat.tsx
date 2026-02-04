import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/claude/chat-message";
import { ChatInput, type ChatInputRef } from "@/components/claude/chat-input";
import { ActiveToolIndicator } from "@/components/claude/active-tool-indicator";
import { QuestionAnswerer } from "@/components/claude/question-answerer";
import { WelcomeMessage } from "@/components/claude/welcome-message";
import type { ImageAttachment } from "@/components/claude/attachment-preview";
import {
  isElectronWithChatAPI,
  getClaudeChatAPI,
  isAssistantMessage,
  isToolUseBlock,
  CLAUDE_MODELS,
  type ModelId,
  type ToolUseBlock,
} from "@/lib/claude";
import { COMMANDS } from "@/lib/commands";
import {
  useClaudeStore,
  useClaudeSettings,
  useIsBranchStreaming,
  useConversationByBranchId,
  useStreamingError,
  type PermissionMode,
} from "@/lib/claude-store";
import { useBranchesStore } from "@/lib/branches-store";
import { useRepositoriesStore } from "@/lib/repositories-store";
import { getPendingQuestion } from "@/lib/agent-status";
import { showNotification } from "@/lib/notifications";
import { router } from "@/main";
import type { TrackedBranch } from "@/lib/github-types";

// Model shorthand mapping
const MODEL_ALIASES: Record<string, ModelId> = {
  sonnet: "claude-sonnet-4-20250514",
  opus: "claude-opus-4-20250514",
  haiku: "claude-3-5-haiku-20241022",
};

interface BranchChatProps {
  branch: TrackedBranch;
  cwd: string;
  isAgentTabActive?: boolean;
}

export function BranchChat({
  branch,
  cwd,
  isAgentTabActive = true,
}: BranchChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dismissedQuestionIds, setDismissedQuestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  const conversation = useConversationByBranchId(branch.id);
  const repository = useRepositoriesStore((s) =>
    s.getRepositoryById(branch.repositoryId),
  );
  const settings = useClaudeSettings();
  const isStreaming = useIsBranchStreaming(branch.id);
  const streamingError = useStreamingError();
  const linkConversation = useBranchesStore((state) => state.linkConversation);

  const {
    createConversationForBranch,
    addUserMessage,
    startAssistantTurn,
    startStreaming,
    updateSettings,
    clearConversation,
    setStreamingContext,
    setStreamingError,
    setAgentTabVisible,
  } = useClaudeStore();

  const promptText = useClaudeStore((s) => s.promptText);
  const clearPromptText = useClaudeStore((s) => s.clearPromptText);
  const shouldFocusInput = useClaudeStore((s) => s.shouldFocusInput);
  const clearInputFocus = useClaudeStore((s) => s.clearInputFocus);

  // Sync agentTabVisible with the store
  useEffect(() => {
    setAgentTabVisible(isAgentTabActive);
    return () => {
      setAgentTabVisible(false);
    };
  }, [isAgentTabActive, setAgentTabVisible]);

  // Consume promptText from store and append to input
  useEffect(() => {
    if (promptText) {
      setInputValue((prev) => {
        const needsSpace = prev.trim().length > 0 && !prev.endsWith(" ");
        return prev + (needsSpace ? " " : "") + promptText;
      });
      clearPromptText();
    }
  }, [promptText, clearPromptText]);

  // Focus input when requested from store
  useEffect(() => {
    if (shouldFocusInput) {
      // Small delay to ensure the tab has switched and the input is visible
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 50);
      clearInputFocus();
    }
  }, [shouldFocusInput, clearInputFocus]);

  const scrollToBottom = useCallback((force = false) => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-slot='scroll-area-viewport']",
      );
      if (viewport) {
        // Only scroll if forced or user is already near the bottom (within 100px)
        const isNearBottom =
          viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
          100;
        if (force || isNearBottom) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    }
  }, []);

  // Auto-scroll when new SDK messages arrive during streaming
  const lastAssistantMessage =
    conversation?.messages[conversation.messages.length - 1];
  const sdkMessageCount =
    lastAssistantMessage?.role === "assistant"
      ? lastAssistantMessage.sdkMessages.length
      : 0;

  useEffect(() => {
    if (isStreaming && sdkMessageCount > 0) {
      scrollToBottom();
    }
  }, [isStreaming, sdkMessageCount, scrollToBottom]);

  // Handle slash commands locally
  const handleCommand = useCallback(
    (command: string): boolean => {
      const trimmed = command.trim();
      const spaceIndex = trimmed.indexOf(" ");
      const cmd = (
        spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex)
      ).toLowerCase();
      const args =
        spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();

      if (cmd === "/clear") {
        if (conversation?.id) {
          clearConversation(conversation.id);
        }
        setInputValue("");
        setError(null);
        setInfo(null);
        return true;
      }

      if (cmd === "/help") {
        const lines = COMMANDS.map((c) => `/${c.name} — ${c.description}`);
        setInfo(lines.join("\n"));
        setError(null);
        setInputValue("");
        return true;
      }

      if (cmd === "/model") {
        if (!args) {
          // Show current model
          const currentModel = settings.model;
          const displayName = CLAUDE_MODELS[currentModel] ?? currentModel;
          setInfo(`Current model: ${displayName} (${currentModel})`);
          setError(null);
          setInputValue("");
          return true;
        }
        const alias = args.toLowerCase();
        const modelId = MODEL_ALIASES[alias];
        if (modelId) {
          updateSettings({ model: modelId });
          const displayName = CLAUDE_MODELS[modelId];
          setInfo(`Model switched to ${displayName}`);
          setError(null);
          setInputValue("");
          return true;
        }
        // Invalid model name
        const validOptions = Object.keys(MODEL_ALIASES).join(", ");
        setError(`Unknown model "${args}". Valid options: ${validOptions}`);
        setInputValue("");
        return true;
      }

      if (cmd === "/compact") {
        // Send as a regular message to Claude (triggers SDK compaction)
        return false;
      }

      return false;
    },
    [conversation, clearConversation, settings.model, updateSettings],
  );

  const handleSend = useCallback(async () => {
    const hasContent = inputValue.trim() || attachments.length > 0;
    if (!hasContent || isStreaming) return;

    const userMessage = inputValue.trim();

    // Check for slash commands first
    if (userMessage.startsWith("/")) {
      const handled = handleCommand(userMessage);
      if (handled) {
        return;
      }
      // Commands that return false are sent to Claude (e.g. /compact)
      // But truly unknown commands should show an error
      const cmdName = userMessage.split(" ")[0].toLowerCase();
      const isKnownCommand = COMMANDS.some((c) => "/" + c.name === cmdName);
      if (!isKnownCommand) {
        setError(`Unknown command: ${cmdName}`);
        return;
      }
    }

    if (!isElectronWithChatAPI()) {
      setError(
        "Chat requires running in Electron with Claude CLI authentication",
      );
      return;
    }

    setError(null);
    setInfo(null);
    setStreamingError(null);

    // Create a conversation if none exists for this branch
    let conversationId = conversation?.id;
    if (!conversationId) {
      conversationId = createConversationForBranch(branch.id, cwd);
      linkConversation(branch.id, conversationId);
    }

    // Store streaming context in the store for global IPC listeners
    setStreamingContext({
      conversationId,
      branchId: branch.id,
      branchName: branch.branch,
      repositorySlug: repository?.slug ?? "",
    });

    // Build message with attachments info
    const messageWithAttachments =
      attachments.length > 0
        ? `${userMessage}\n\n[Attached ${attachments.length} image(s)]`
        : userMessage;

    // Add user message
    addUserMessage(conversationId, messageWithAttachments);
    setInputValue("");

    // Clear attachments after adding to message
    const currentAttachments = [...attachments];
    setAttachments([]);

    // Scroll to bottom after adding user message (force scroll since user just sent)
    setTimeout(() => scrollToBottom(true), 0);

    // Start assistant turn for streaming SDK messages
    startAssistantTurn(conversationId);
    startStreaming(branch.id);

    // Prepare images for API if any
    const images =
      currentAttachments.length > 0
        ? currentAttachments.map((a) => ({
            type: "base64" as const,
            media_type: a.mimeType as
              | "image/png"
              | "image/jpeg"
              | "image/gif"
              | "image/webp",
            data: a.base64,
          }))
        : undefined;

    // Send via IPC with cwd, permissionMode, and sessionId for conversation resumption
    const chatAPI = getClaudeChatAPI();
    void chatAPI.sendMessage(userMessage, {
      systemPrompt: settings.systemPrompt || undefined,
      cwd,
      permissionMode: settings.permissionMode,
      sessionId: conversation?.sessionId || undefined,
      images,
    });
  }, [
    inputValue,
    attachments,
    isStreaming,
    handleCommand,
    conversation?.id,
    conversation?.sessionId,
    branch.id,
    branch.branch,
    cwd,
    settings.systemPrompt,
    settings.permissionMode,
    createConversationForBranch,
    linkConversation,
    addUserMessage,
    startAssistantTurn,
    startStreaming,
    scrollToBottom,
    setStreamingContext,
    setStreamingError,
    repository?.slug,
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

  // Compute active tool from the last assistant message's SDK messages
  const activeTool = useMemo((): {
    name: string;
    summary: string;
  } | null => {
    if (!isStreaming || !lastMessage || lastMessage.role !== "assistant") {
      return null;
    }

    const sdkMessages = lastMessage.sdkMessages;
    if (!sdkMessages || sdkMessages.length === 0) return null;

    // Find tool_use blocks that don't have a corresponding tool_result
    const toolUseBlocks: ToolUseBlock[] = [];
    const completedToolIds = new Set<string>();

    for (const msg of sdkMessages) {
      if (isAssistantMessage(msg)) {
        for (const block of msg.message.content) {
          if (isToolUseBlock(block)) {
            toolUseBlocks.push(block);
          }
        }
      }
      // Check for tool results to mark tools as completed
      if (msg.type === "assistant") {
        const assistantMsg = msg;
        for (const block of assistantMsg.message.content) {
          if (block.type === "tool_result") {
            completedToolIds.add(block.tool_use_id);
          }
        }
      }
    }

    // Find the last incomplete tool
    const runningTool = [...toolUseBlocks]
      .reverse()
      .find((t) => !completedToolIds.has(t.id));

    if (!runningTool) return null;

    // Generate summary based on tool type
    const input = runningTool.input as Record<string, unknown>;
    let summary = "";
    switch (runningTool.name) {
      case "Read":
        summary = input.file_path ? String(input.file_path) : "";
        break;
      case "Write":
      case "Edit":
        summary = input.file_path ? String(input.file_path) : "";
        break;
      case "Bash":
        summary = input.command
          ? String(input.command).slice(0, 50) +
            (String(input.command).length > 50 ? "..." : "")
          : "";
        break;
      case "Glob":
      case "Grep":
        summary = input.pattern ? String(input.pattern) : "";
        break;
      case "Task":
        summary = input.description ? String(input.description) : "";
        break;
      default:
        summary = "";
    }

    return { name: runningTool.name, summary };
  }, [isStreaming, lastMessage]);

  // Detect pending AskUserQuestion that needs an answer
  const pendingQuestion = useMemo(
    () => getPendingQuestion(conversation, dismissedQuestionIds),
    [conversation, dismissedQuestionIds],
  );

  const handleModeChange = useCallback(
    (mode: PermissionMode) => {
      updateSettings({ permissionMode: mode });
    },
    [updateSettings],
  );

  // Handle question answer submission
  const handleQuestionSubmit = useCallback(
    async (answers: Record<string, string | string[]>) => {
      if (!pendingQuestion || isStreaming) return;

      // Format answers as a text message
      const lines = pendingQuestion.input.questions.map((q, i) => {
        const answer = answers[i.toString()];
        const formatted = Array.isArray(answer) ? answer.join(", ") : answer;
        return `- ${q.header || `Question ${i + 1}`}: ${formatted}`;
      });

      const message = `Here are my answers:\n${lines.join("\n")}`;

      if (!isElectronWithChatAPI()) {
        setError(
          "Chat requires running in Electron with Claude CLI authentication",
        );
        return;
      }

      setError(null);
      setInfo(null);
      setStreamingError(null);

      // Get or create conversation
      let conversationId = conversation?.id;
      if (!conversationId) {
        conversationId = createConversationForBranch(branch.id, cwd);
        linkConversation(branch.id, conversationId);
      }

      // Store streaming context in the store for global IPC listeners
      setStreamingContext({
        conversationId,
        branchId: branch.id,
        branchName: branch.branch,
        repositorySlug: repository?.slug ?? "",
      });

      // Add user message with the answers
      addUserMessage(conversationId, message);

      // Scroll to bottom
      setTimeout(() => scrollToBottom(true), 0);

      // Start assistant turn
      startAssistantTurn(conversationId);
      startStreaming(branch.id);

      // Send via IPC - use existing sessionId to continue the conversation
      const chatAPI = getClaudeChatAPI();
      void chatAPI.sendMessage(message, {
        systemPrompt: settings.systemPrompt || undefined,
        cwd,
        permissionMode: settings.permissionMode,
        sessionId: conversation?.sessionId || undefined,
      });
    },
    [
      pendingQuestion,
      isStreaming,
      conversation?.id,
      conversation?.sessionId,
      branch.id,
      branch.branch,
      cwd,
      settings.systemPrompt,
      settings.permissionMode,
      createConversationForBranch,
      linkConversation,
      addUserMessage,
      startAssistantTurn,
      startStreaming,
      scrollToBottom,
      setStreamingContext,
      setStreamingError,
      repository?.slug,
    ],
  );

  const handleQuestionCancel = useCallback(() => {
    // Dismiss the current question so user can type a different message
    if (pendingQuestion) {
      setDismissedQuestionIds((prev) => new Set([...prev, pendingQuestion.id]));
    }
  }, [pendingQuestion]);

  // Notify when a new pending question appears and the agent tab is not active
  const lastNotifiedQuestionRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      pendingQuestion &&
      pendingQuestion.id !== lastNotifiedQuestionRef.current &&
      (!isAgentTabActive || document.hidden)
    ) {
      lastNotifiedQuestionRef.current = pendingQuestion.id;
      showNotification(
        "Agent needs input",
        `Agent on branch "${branch.branch}" is waiting for your answer`,
        () => {
          window.focus();
          void router.navigate({
            to: "/repositories/$repository/branches/$branch/agent",
            params: { repository: repository?.slug ?? "", branch: branch.id },
          });
        },
      );
    }
  }, [
    pendingQuestion,
    isAgentTabActive,
    branch.branch,
    repository?.slug,
    branch.id,
  ]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
        {displayMessages.length === 0 ? (
          <WelcomeMessage />
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
        <div className="flex items-start gap-2 px-4 py-2 text-sm text-muted-foreground bg-muted/50 border-t">
          <span className="flex-1 whitespace-pre-line">{info}</span>
          <button
            onClick={() => setInfo(null)}
            className="shrink-0 p-0.5 hover:text-foreground rounded"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Error message */}
      {(error || streamingError) && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 border-t">
          Error: {error || streamingError}
        </div>
      )}

      {/* Active tool indicator */}
      {activeTool && (
        <div className="px-4 py-3">
          <ActiveToolIndicator
            toolName={activeTool.name}
            summary={activeTool.summary}
          />
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        {pendingQuestion && !isStreaming ? (
          <QuestionAnswerer
            questions={pendingQuestion.input.questions}
            onSubmit={handleQuestionSubmit}
            onCancel={handleQuestionCancel}
          />
        ) : (
          <ChatInput
            ref={chatInputRef}
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            onStop={handleStop}
            isStreaming={isStreaming}
            permissionMode={settings.permissionMode}
            onModeChange={handleModeChange}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            cwd={cwd}
            modelName={CLAUDE_MODELS[settings.model] ?? settings.model}
          />
        )}
      </div>
    </div>
  );
}
