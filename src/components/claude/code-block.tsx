import { useState, useCallback, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { codeToHtml } from "shiki";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDiffTheme } from "@/lib/use-diff-theme";

interface CodeBlockProps {
  children: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ children, language, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const theme = useDiffTheme();
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const lang = language || "text";
    codeToHtml(children, {
      lang,
      theme: theme === "dark" ? "github-dark" : "github-light",
    })
      .then((html) => {
        if (!cancelled) setHighlightedHtml(html);
      })
      .catch(() => {
        if (!cancelled) setHighlightedHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [children, language, theme]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [children]);

  return (
    <div className={cn("relative group", className)}>
      {language && (
        <div className="absolute top-0 left-0 px-2 py-1 text-xs text-muted-foreground bg-muted rounded-tl-md rounded-br-md z-10">
          {language}
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={handleCopy}
        title={copied ? "Copied!" : "Copy code"}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
      {highlightedHtml ? (
        <div
          className="overflow-x-auto p-4 pt-8 rounded-md bg-muted text-sm [&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0 [&_code]:!bg-transparent [&_code]:!text-xs"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre className="overflow-x-auto p-4 pt-8 rounded-md bg-muted text-xs">
          <code className={language ? `language-${language}` : undefined}>
            {children}
          </code>
        </pre>
      )}
    </div>
  );
}
