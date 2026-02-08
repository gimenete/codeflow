import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CommitSuggestionPopoverProps {
  /** Default headline pre-filled in the form */
  defaultHeadline: string;
  /** The trigger button element */
  trigger: React.ReactNode;
  /** Called when the user submits the form */
  onCommit: (headline: string, body: string) => Promise<void>;
  align?: "start" | "center" | "end";
}

export function CommitSuggestionPopover({
  defaultHeadline,
  trigger,
  onCommit,
  align = "end",
}: CommitSuggestionPopoverProps) {
  const [open, setOpen] = useState(false);
  const [headline, setHeadline] = useState(defaultHeadline);
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setHeadline(defaultHeadline);
      setBody("");
      setError(null);
    }
    setOpen(nextOpen);
  };

  const handleSubmit = async () => {
    if (!headline.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onCommit(headline.trim(), body.trim());
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to commit suggestion");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className="w-96 space-y-3">
        <p className="text-sm font-medium">Commit suggestion</p>
        <Input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Commit headline"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Optional extended description..."
          className="min-h-[80px] resize-y"
        />
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={!headline.trim() || isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Commit suggestion
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
