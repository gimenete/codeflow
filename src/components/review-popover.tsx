import { useState } from "react";
import { AlertCircle, Eye } from "lucide-react";
import { GitHubCommentTextarea } from "@/components/github-comment-textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type ReviewEvent = "APPROVE" | "REQUEST_CHANGES" | "COMMENT";

interface ReviewPopoverProps {
  accountId: string;
  owner: string;
  repo: string;
  canApprove: boolean;
  onSubmitReview: (body: string, event: ReviewEvent) => Promise<void>;
}

const submitLabels: Record<ReviewEvent, string> = {
  COMMENT: "Comment",
  APPROVE: "Approve",
  REQUEST_CHANGES: "Request changes",
};

export function ReviewPopover({
  accountId,
  owner,
  repo,
  canApprove,
  onSubmitReview,
}: ReviewPopoverProps) {
  const [open, setOpen] = useState(false);
  const [event, setEvent] = useState<ReviewEvent>("COMMENT");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bodyRequired = event === "COMMENT" || event === "REQUEST_CHANGES";
  const hasBody = body.trim().length > 0;
  const canSubmit = bodyRequired ? hasBody : true;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmitReview(body.trim(), event);
      setBody("");
      setEvent("COMMENT");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Eye className="h-4 w-4" />
          Review
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[36rem] space-y-3">
        <GitHubCommentTextarea
          value={body}
          onChange={setBody}
          accountId={accountId}
          owner={owner}
          repo={repo}
          onSubmit={handleSubmit}
          placeholder="Leave a review comment..."
          className="min-h-[160px] resize-y"
        />

        <RadioGroup
          value={event}
          onValueChange={(v) => setEvent(v as ReviewEvent)}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="COMMENT" id="review-comment" />
            <Label htmlFor="review-comment">Comment</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value="APPROVE"
              id="review-approve"
              disabled={!canApprove}
            />
            <Label
              htmlFor="review-approve"
              className={!canApprove ? "opacity-50" : ""}
            >
              Approve
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value="REQUEST_CHANGES"
              id="review-request-changes"
              disabled={!canApprove}
            />
            <Label
              htmlFor="review-request-changes"
              className={!canApprove ? "opacity-50" : ""}
            >
              Request changes
            </Label>
          </div>
        </RadioGroup>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            size="sm"
          >
            {submitLabels[event]}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
