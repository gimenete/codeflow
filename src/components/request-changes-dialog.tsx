import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface RequestChangesDialogProps {
  filePath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (instructions: string) => void;
}

export function RequestChangesDialog({
  filePath,
  open,
  onOpenChange,
  onSubmit,
}: RequestChangesDialogProps) {
  const [instructions, setInstructions] = useState("");

  const handleSubmit = useCallback(() => {
    if (instructions.trim()) {
      onSubmit(instructions.trim());
      setInstructions("");
      onOpenChange(false);
    }
  }, [instructions, onSubmit, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setInstructions("");
      }
      onOpenChange(newOpen);
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request changes</DialogTitle>
          <DialogDescription>
            Enter instructions for changes to{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
              {filePath}
            </code>
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Describe the changes you want..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[100px]"
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!instructions.trim()}>
            Request changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
