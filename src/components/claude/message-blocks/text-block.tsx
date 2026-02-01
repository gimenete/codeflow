import type { TextBlock as TextBlockType } from "@/lib/claude";
import { MarkdownContent } from "../markdown-content";

interface TextBlockProps {
  block: TextBlockType;
}

export function TextBlock({ block }: TextBlockProps) {
  if (!block.text) return null;

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <MarkdownContent content={block.text} />
    </div>
  );
}
