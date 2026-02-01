import { useState } from "react";
import { ChevronRight, ChevronDown, Brain } from "lucide-react";
import type { ThinkingBlock as ThinkingBlockType } from "@/lib/claude";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ThinkingBlockProps {
  block: ThinkingBlockType;
}

export function ThinkingBlock({ block }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!block.thinking) return null;

  // Get first line as preview
  const lines = block.thinking.split("\n");
  const preview =
    lines[0].length > 60 ? lines[0].slice(0, 60) + "..." : lines[0];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-l-2 border-l-purple-500/50 pl-3 py-1 my-2 bg-purple-500/5 rounded-r">
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:bg-purple-500/10 rounded px-1 -ml-1">
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-purple-500/70 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-purple-500/70 shrink-0" />
          )}
          <Brain className="h-3.5 w-3.5 text-purple-500/70 shrink-0" />
          <span className="text-xs text-purple-500/70 font-medium">
            Thinking
          </span>
          {!isOpen && (
            <span className="text-xs text-muted-foreground/60 italic truncate">
              {preview}
            </span>
          )}
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2">
          <div className="text-xs text-muted-foreground/80 italic whitespace-pre-wrap pl-1">
            {block.thinking}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
