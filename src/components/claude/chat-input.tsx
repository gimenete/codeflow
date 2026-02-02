import {
  useRef,
  useCallback,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  ArrowUp,
  Square,
  Shield,
  FileEdit,
  Map,
  Ban,
  ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PermissionMode } from "@/lib/claude-store";
import {
  AttachmentPreview,
  type ImageAttachment,
} from "@/components/claude/attachment-preview";
import {
  CommandAutocomplete,
  type Command,
  filterCommands,
} from "@/components/claude/command-autocomplete";
import { FileAutocomplete } from "@/components/claude/file-autocomplete";

const MODES: PermissionMode[] = ["default", "acceptEdits", "plan", "dontAsk"];

const MODE_CONFIG: Record<
  PermissionMode,
  { label: string; color: string; Icon: typeof Shield }
> = {
  default: { label: "Default", color: "text-blue-500", Icon: Shield },
  acceptEdits: {
    label: "Accept Edits",
    color: "text-purple-500",
    Icon: FileEdit,
  },
  plan: { label: "Plan Mode", color: "text-emerald-600", Icon: Map },
  dontAsk: { label: "Don't Ask", color: "text-orange-500", Icon: Ban },
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  className?: string;
  permissionMode: PermissionMode;
  onModeChange: (mode: PermissionMode) => void;
  attachments?: ImageAttachment[];
  onAttachmentsChange?: (attachments: ImageAttachment[]) => void;
  onCommand?: (command: string) => void;
  cwd?: string;
}

export interface ChatInputRef {
  focus: () => void;
}

// Helper to find @ trigger position
function findAtTrigger(
  text: string,
  cursorPos: number,
): { start: number; searchText: string } | null {
  for (let i = cursorPos - 1; i >= 0; i--) {
    if (text[i] === "@") {
      return { start: i, searchText: text.slice(i + 1, cursorPos) };
    }
    if (text[i] === " " || text[i] === "\n") break;
  }
  return null;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  function ChatInput(
    {
      value,
      onChange,
      onSend,
      onStop,
      isStreaming,
      disabled,
      className,
      permissionMode,
      onModeChange,
      attachments = [],
      onAttachmentsChange,
      onCommand,
      cwd,
    },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
    }));
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [showCommands, setShowCommands] = useState(false);
    const [commandFilter, setCommandFilter] = useState("");
    const [showFilePicker, setShowFilePicker] = useState(false);
    const [fileSearchText, setFileSearchText] = useState("");
    const [atPosition, setAtPosition] = useState<{ start: number } | null>(
      null,
    );
    const [cursorPosition, setCursorPosition] = useState(0);
    const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
    const [selectedFileIndex, setSelectedFileIndex] = useState(0);

    // Detect / commands and @ file mentions
    useEffect(() => {
      const startsWithSlash = value.startsWith("/");
      if (startsWithSlash && !isStreaming) {
        setShowCommands(true);
        setCommandFilter(value.slice(1));
      } else {
        setShowCommands(false);
        setCommandFilter("");
      }
    }, [value, isStreaming]);

    // Detect @ mentions
    useEffect(() => {
      if (isStreaming) {
        setShowFilePicker(false);
        return;
      }

      const atTrigger = findAtTrigger(value, cursorPosition);
      if (atTrigger) {
        setShowFilePicker(true);
        setFileSearchText(atTrigger.searchText);
        setAtPosition({ start: atTrigger.start });
      } else {
        setShowFilePicker(false);
        setFileSearchText("");
        setAtPosition(null);
      }
    }, [value, cursorPosition, isStreaming]);

    // Reset command index when filter changes
    useEffect(() => {
      setSelectedCommandIndex(0);
    }, [commandFilter]);

    // Reset file index when search text changes
    useEffect(() => {
      setSelectedFileIndex(0);
    }, [fileSearchText]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Handle autocomplete interactions
        if (showCommands || showFilePicker) {
          if (e.key === "Escape") {
            e.preventDefault();
            setShowCommands(false);
            setShowFilePicker(false);
            return;
          }

          // Handle arrow key navigation
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (showCommands) {
              const commands = filterCommands(commandFilter);
              setSelectedCommandIndex((prev) =>
                Math.min(prev + 1, commands.length - 1),
              );
            } else if (showFilePicker) {
              setSelectedFileIndex((prev) => prev + 1);
            }
            return;
          }

          if (e.key === "ArrowUp") {
            e.preventDefault();
            if (showCommands) {
              setSelectedCommandIndex((prev) => Math.max(prev - 1, 0));
            } else if (showFilePicker) {
              setSelectedFileIndex((prev) => Math.max(prev - 1, 0));
            }
            return;
          }

          // Handle Enter when autocomplete is open - select highlighted item
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (showCommands) {
              const commands = filterCommands(commandFilter);
              if (
                commands.length > 0 &&
                selectedCommandIndex < commands.length
              ) {
                setShowCommands(false);
                if (onCommand) {
                  onCommand(commands[selectedCommandIndex].name);
                }
                onChange("");
              } else {
                setShowCommands(false);
              }
            }
            // For file picker, let file-autocomplete handle Enter via its own handler
            return;
          }
        }

        if (e.key === "Tab" && e.shiftKey) {
          e.preventDefault();
          const currentIndex = MODES.indexOf(permissionMode);
          const nextIndex = (currentIndex + 1) % MODES.length;
          onModeChange(MODES[nextIndex]);
          return;
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (!isStreaming && value.trim()) {
            onSend();
          }
        }
      },
      [
        isStreaming,
        value,
        onSend,
        permissionMode,
        onModeChange,
        showCommands,
        showFilePicker,
        commandFilter,
        onCommand,
        onChange,
        selectedCommandIndex,
      ],
    );

    const handleSubmit = useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        if (isStreaming) {
          onStop();
        } else if (value.trim()) {
          onSend();
        }
      },
      [isStreaming, value, onSend, onStop],
    );

    // Handle cursor position tracking
    const handleSelect = useCallback(
      (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        setCursorPosition(e.currentTarget.selectionStart);
      },
      [],
    );

    const handleTextChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        setCursorPosition(e.target.selectionStart);
      },
      [onChange],
    );

    // Image drop handling
    const processFile = useCallback(async (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        console.warn(`Unsupported file type: ${file.type}`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        console.warn(`File too large: ${file.size} bytes`);
        return;
      }

      return new Promise<ImageAttachment | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(",")[1];
          resolve({
            id: crypto.randomUUID(),
            file,
            dataUrl,
            base64,
            mimeType: file.type,
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
      async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (!onAttachmentsChange) return;

        const files = Array.from(e.dataTransfer.files).filter((f) =>
          f.type.startsWith("image/"),
        );

        const newAttachments: ImageAttachment[] = [];
        for (const file of files) {
          const attachment = await processFile(file);
          if (attachment) {
            newAttachments.push(attachment);
          }
        }

        if (newAttachments.length > 0) {
          onAttachmentsChange([...attachments, ...newAttachments]);
        }
      },
      [attachments, onAttachmentsChange, processFile],
    );

    const handleRemoveAttachment = useCallback(
      (id: string) => {
        if (onAttachmentsChange) {
          onAttachmentsChange(attachments.filter((a) => a.id !== id));
        }
      },
      [attachments, onAttachmentsChange],
    );

    const handlePaste = useCallback(
      async (e: React.ClipboardEvent) => {
        if (!onAttachmentsChange) return;

        const items = Array.from(e.clipboardData.items);
        const imageItems = items.filter((item) =>
          item.type.startsWith("image/"),
        );

        if (imageItems.length === 0) return;

        e.preventDefault();

        const newAttachments: ImageAttachment[] = [];
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (file) {
            const attachment = await processFile(file);
            if (attachment) {
              newAttachments.push(attachment);
            }
          }
        }

        if (newAttachments.length > 0) {
          onAttachmentsChange([...attachments, ...newAttachments]);
        }
      },
      [attachments, onAttachmentsChange, processFile],
    );

    // Command selection
    const handleCommandSelect = useCallback(
      (command: Command) => {
        setShowCommands(false);
        if (onCommand) {
          onCommand(command.name);
        }
        onChange("");
      },
      [onCommand, onChange],
    );

    // File selection
    const handleFileSelect = useCallback(
      (filePath: string) => {
        if (!atPosition) return;

        // Replace @searchText with @filePath (keeping the @ prefix)
        const before = value.slice(0, atPosition.start);
        const after = value.slice(cursorPosition);
        const newValue = `${before}@${filePath} ${after}`;
        onChange(newValue);
        setShowFilePicker(false);
        setAtPosition(null);

        // Focus textarea and set cursor after the inserted path
        setTimeout(() => {
          if (textareaRef.current) {
            // +1 for @, +1 for space after path
            const newCursorPos = atPosition.start + 1 + filePath.length + 1;
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            setCursorPosition(newCursorPos);
          }
        }, 0);
      },
      [atPosition, cursorPosition, value, onChange],
    );

    return (
      <div className={cn("relative", className)} ref={containerRef}>
        {/* Command autocomplete - positioned above input */}
        {showCommands && (
          <CommandAutocomplete
            filter={commandFilter}
            onSelect={handleCommandSelect}
            onClose={() => setShowCommands(false)}
            selectedIndex={selectedCommandIndex}
          />
        )}

        {/* File autocomplete - positioned above input */}
        {showFilePicker && cwd && (
          <FileAutocomplete
            cwd={cwd}
            searchText={fileSearchText}
            onSelect={handleFileSelect}
            onClose={() => setShowFilePicker(false)}
            selectedIndex={selectedFileIndex}
            onSelectedIndexChange={setSelectedFileIndex}
          />
        )}

        <form onSubmit={handleSubmit}>
          <div
            className={cn(
              "relative rounded-lg border bg-background transition-colors",
              isDragOver && "border-primary ring-2 ring-primary/20",
              "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Attachment preview */}
            <AttachmentPreview
              attachments={attachments}
              onRemove={handleRemoveAttachment}
            />

            {/* Drag overlay */}
            {isDragOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg z-10">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <ImagePlus className="h-5 w-5" />
                  <span>Drop images here</span>
                </div>
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onSelect={handleSelect}
              onPaste={handlePaste}
              placeholder="Send a message... (Enter to send, Shift+Enter for newline)"
              disabled={disabled}
              className={cn(
                "w-full min-h-[44px] max-h-[200px] resize-none px-3 py-2.5",
                "bg-transparent border-0 focus:outline-none focus:ring-0",
                "placeholder:text-muted-foreground text-sm",
              )}
              rows={1}
            />

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t">
              {/* Permission mode indicator */}
              {(() => {
                const { label, color, Icon } = MODE_CONFIG[permissionMode];
                return (
                  <div className={cn("text-xs flex items-center gap-1", color)}>
                    <Icon className="h-3 w-3" />
                    <span className="font-medium">{label}</span>
                    <span className="ml-1 opacity-60">(Shift+Tab)</span>
                  </div>
                );
              })()}

              {/* Send/Stop button */}
              {isStreaming ? (
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  className="h-7 px-3"
                  title="Stop generation"
                >
                  <Square className="h-3.5 w-3.5 mr-1" />
                  Stop
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  className="h-7 px-3"
                  disabled={
                    disabled || (!value.trim() && attachments.length === 0)
                  }
                  title="Send message"
                >
                  <ArrowUp className="h-3.5 w-3.5 mr-1" />
                  Send
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    );
  },
);
