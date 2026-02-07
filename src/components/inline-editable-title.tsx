import { useEffect, useRef, useState } from "react";
import { Check, Loader2, PencilIcon, X } from "lucide-react";
import { EmojiText } from "@/components/emoji-text";
import { Button } from "@/components/ui/button";

interface InlineEditableTitleProps {
  title: string;
  number: number;
  canEdit: boolean;
  onSave: (newTitle: string) => Promise<void>;
}

export function InlineEditableTitle({
  title,
  number,
  canEdit,
  onSave,
}: InlineEditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Auto-size the input to match text width
  useEffect(() => {
    if (isEditing && inputRef.current && measureRef.current) {
      measureRef.current.textContent = editValue || " ";
      inputRef.current.style.width = `${measureRef.current.offsetWidth + 2}px`;
    }
  }, [editValue, isEditing]);

  const handleStartEditing = () => {
    setEditValue(title);
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(title);
    setError(null);
  };

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === title) {
      handleCancel();
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      setIsEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update title");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            {/* Hidden span for measuring text width */}
            <span
              ref={measureRef}
              className="invisible absolute whitespace-pre text-xl font-semibold"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              className="min-w-48 w-full text-xl font-semibold bg-transparent border border-input rounded-md px-2 py-0.5 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50"
            />
          </div>
          <span className="text-xl text-muted-foreground font-normal shrink-0">
            #{number}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void handleSave()}
              disabled={isSaving || !editValue.trim()}
              title="Save"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCancel}
              disabled={isSaving}
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <h1 className="text-xl font-semibold group/title">
      <EmojiText text={title} />{" "}
      <span className="text-muted-foreground font-normal">#{number}</span>
      {canEdit && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-1 opacity-0 group-hover/title:opacity-100 align-middle"
          onClick={handleStartEditing}
          title="Edit title"
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      )}
    </h1>
  );
}
