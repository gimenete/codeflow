import { useMemo, useState, useEffect, type ReactNode } from "react";
import { codeToHtml } from "shiki";
import { PatchDiff } from "@pierre/diffs/react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyToClipboard } from "@/components/copy-to-clipboard";
import { useDiffTheme } from "@/lib/use-diff-theme";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { CommitSuggestionPopover } from "@/components/commit-suggestion-popover";
import { Button } from "@/components/ui/button";
import { CheckIcon, PlusIcon } from "lucide-react";

export interface SuggestionInfo {
  id: string;
  suggestion: string;
  isApplied: boolean;
  isOutdated: boolean;
}

interface HtmlRendererProps {
  html: string;
  className?: string;
  onCheckboxToggle?: (index: number, checked: boolean) => void;
  suggestions?: SuggestionInfo[];
  onCommitSuggestion?: (
    suggestionId: string,
    headline: string,
    body: string,
  ) => Promise<void>;
  onAddSuggestionToBatch?: (suggestion: SuggestionInfo) => void;
  onRemoveSuggestionFromBatch?: (suggestionId: string) => void;
  isSuggestionInBatch?: (suggestionId: string) => boolean;
  commentPath?: string;
}

interface ProcessContext {
  onCheckboxToggle?: (index: number, checked: boolean) => void;
  checkboxCounter: { current: number };
  suggestions?: SuggestionInfo[];
  suggestionCounter: { current: number };
  onCommitSuggestion?: (
    suggestionId: string,
    headline: string,
    body: string,
  ) => Promise<void>;
  onAddSuggestionToBatch?: (suggestion: SuggestionInfo) => void;
  onRemoveSuggestionFromBatch?: (suggestionId: string) => void;
  isSuggestionInBatch?: (suggestionId: string) => boolean;
  commentPath?: string;
}

export function HtmlRenderer({
  html,
  className,
  onCheckboxToggle,
  suggestions,
  onCommitSuggestion,
  onAddSuggestionToBatch,
  onRemoveSuggestionFromBatch,
  isSuggestionInBatch,
  commentPath,
}: HtmlRendererProps) {
  const content = useMemo(() => {
    if (!html) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const ctx: ProcessContext = {
      onCheckboxToggle,
      checkboxCounter: { current: 0 },
      suggestions,
      suggestionCounter: { current: 0 },
      onCommitSuggestion,
      onAddSuggestionToBatch,
      onRemoveSuggestionFromBatch,
      isSuggestionInBatch,
      commentPath,
    };

    return processNode(doc.body, ctx);
  }, [
    html,
    onCheckboxToggle,
    suggestions,
    onCommitSuggestion,
    onAddSuggestionToBatch,
    onRemoveSuggestionFromBatch,
    isSuggestionInBatch,
    commentPath,
  ]);

  if (!html) {
    return (
      <p className="text-muted-foreground italic">No description provided.</p>
    );
  }

  return <div className={cn("html-renderer", className)}>{content}</div>;
}

let keyCounter = 0;

function getKey(): string {
  return `html-node-${keyCounter++}`;
}

function extractLanguage(preElement: Element): string | null {
  const langAttr = preElement.getAttribute("lang");
  if (langAttr) return langAttr;

  const codeChild = preElement.querySelector("code");
  if (codeChild) {
    const codeClass = codeChild.getAttribute("class") ?? "";
    const match = codeClass.match(/highlight-source-(\S+)/);
    if (match) return match[1];
  }
  return null;
}

function HighlightedPre({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const theme = useDiffTheme();
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    codeToHtml(code, {
      lang: language,
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
  }, [code, language, theme]);

  return (
    <div className="relative group shiki-wrapper">
      <CopyToClipboard
        text={code}
        className="absolute top-1 right-1 h-7 w-7 opacity-100 transition-colors z-10 bg-background hover:bg-muted shadow-sm cursor-pointer"
      />
      {highlightedHtml ? (
        <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
      ) : (
        <pre>
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

function PlainPre({ code }: { code: string }) {
  return (
    <div className="relative group">
      <CopyToClipboard
        text={code}
        className="absolute top-1 right-1 h-7 w-7 opacity-100 transition-colors z-10 bg-background hover:bg-muted shadow-sm cursor-pointer"
      />
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

interface SuggestedLine {
  type: "deletion" | "addition" | "context";
  text: string;
}

function extractSuggestedChangeLines(element: Element): SuggestedLine[] {
  const rows = element.querySelectorAll("tr");
  const lines: SuggestedLine[] = [];
  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) continue;
    const codeCell = cells[cells.length - 1];
    const text = codeCell.textContent ?? "";
    if (codeCell.classList.contains("blob-code-deletion")) {
      lines.push({ type: "deletion", text });
    } else if (codeCell.classList.contains("blob-code-addition")) {
      lines.push({ type: "addition", text });
    } else {
      lines.push({ type: "context", text });
    }
  }
  return lines;
}

function SuggestedChangeDiff({
  lines,
  suggestionInfo,
  onCommitSuggestion,
  onAddSuggestionToBatch,
  onRemoveSuggestionFromBatch,
  isSuggestionInBatch,
  commentPath,
}: {
  lines: SuggestedLine[];
  suggestionInfo?: SuggestionInfo;
  onCommitSuggestion?: (
    suggestionId: string,
    headline: string,
    body: string,
  ) => Promise<void>;
  onAddSuggestionToBatch?: (suggestion: SuggestionInfo) => void;
  onRemoveSuggestionFromBatch?: (suggestionId: string) => void;
  isSuggestionInBatch?: (suggestionId: string) => boolean;
  commentPath?: string;
}) {
  const theme = useDiffTheme();

  const deletions = lines.filter((l) => l.type !== "addition").length;
  const additions = lines.filter((l) => l.type !== "deletion").length;

  const patchLines = lines.map((l) => {
    if (l.type === "deletion") return `-${l.text}`;
    if (l.type === "addition") return `+${l.text}`;
    return ` ${l.text}`;
  });

  const fullPatch = `diff --git a/file b/file
--- a/file
+++ b/file
@@ -1,${deletions} +1,${additions} @@
${patchLines.join("\n")}`;

  const canAct =
    suggestionInfo &&
    !suggestionInfo.isApplied &&
    !suggestionInfo.isOutdated &&
    onCommitSuggestion;

  const inBatch =
    suggestionInfo && isSuggestionInBatch
      ? isSuggestionInBatch(suggestionInfo.id)
      : false;

  const defaultHeadline = commentPath
    ? `Apply suggestion to ${commentPath}`
    : "Apply suggestion from code review";

  return (
    <div className="not-prose my-2 overflow-hidden rounded border">
      <div className="bg-muted px-3 py-1.5 text-xs font-medium border-b flex items-center justify-between">
        <span>
          Suggested change
          {suggestionInfo?.isApplied && (
            <span className="ml-2 text-green-600 inline-flex items-center gap-0.5">
              <CheckIcon className="h-3 w-3" />
              Applied
            </span>
          )}
          {suggestionInfo?.isOutdated && !suggestionInfo.isApplied && (
            <span className="ml-2 text-muted-foreground">Outdated</span>
          )}
        </span>
        {canAct && (
          <span className="flex items-center gap-1">
            <CommitSuggestionPopover
              defaultHeadline={defaultHeadline}
              onCommit={(headline, body) =>
                onCommitSuggestion(suggestionInfo.id, headline, body)
              }
              align="end"
              trigger={
                <Button variant="outline" size="sm" className="h-6 text-xs">
                  Commit suggestion
                </Button>
              }
            />
            {onAddSuggestionToBatch && onRemoveSuggestionFromBatch && (
              <Button
                variant={inBatch ? "secondary" : "outline"}
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  if (inBatch) {
                    onRemoveSuggestionFromBatch(suggestionInfo.id);
                  } else {
                    onAddSuggestionToBatch(suggestionInfo);
                  }
                }}
              >
                {inBatch ? (
                  <>
                    <CheckIcon className="h-3 w-3 mr-0.5" />
                    Added to batch
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-3 w-3 mr-0.5" />
                    Add to batch
                  </>
                )}
              </Button>
            )}
          </span>
        )}
      </div>
      <PatchDiff
        patch={fullPatch}
        options={{
          themeType: theme,
          diffStyle: "unified",
          overflow: "wrap",
          disableFileHeader: true,
        }}
        className="font-mono text-xs"
      />
    </div>
  );
}

function processNode(node: Node, ctx?: ProcessContext): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  const key = getKey();

  // Short-circuit all <pre> blocks
  if (tagName === "pre") {
    const language = extractLanguage(element);
    const code = element.textContent ?? "";
    if (language) {
      return <HighlightedPre key={key} code={code} language={language} />;
    }
    // Plain pre — still wrap with copy button
    return <PlainPre key={key} code={code} />;
  }

  // Short-circuit suggested change blocks
  if (
    tagName === "div" &&
    element.classList.contains("js-suggested-changes-blob")
  ) {
    const lines = extractSuggestedChangeLines(element);
    const suggestionIndex = ctx?.suggestionCounter
      ? ctx.suggestionCounter.current++
      : 0;
    const suggestionInfo = ctx?.suggestions?.[suggestionIndex];
    return (
      <SuggestedChangeDiff
        key={key}
        lines={lines}
        suggestionInfo={suggestionInfo}
        onCommitSuggestion={ctx?.onCommitSuggestion}
        onAddSuggestionToBatch={ctx?.onAddSuggestionToBatch}
        onRemoveSuggestionFromBatch={ctx?.onRemoveSuggestionFromBatch}
        isSuggestionInBatch={ctx?.isSuggestionInBatch}
        commentPath={ctx?.commentPath}
      />
    );
  }

  const children = Array.from(element.childNodes).map((child) =>
    processNode(child, ctx),
  );

  switch (tagName) {
    case "body":
      return <>{children}</>;

    case "a": {
      const href = element.getAttribute("href") ?? "#";
      return (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    }

    case "img": {
      const src = element.getAttribute("src") ?? "";
      const alt = element.getAttribute("alt") ?? "";
      return <img key={key} src={src} alt={alt} loading="lazy" />;
    }

    case "code": {
      const codeClass = element.getAttribute("class") ?? "";
      return (
        <code key={key} className={codeClass}>
          {children}
        </code>
      );
    }

    case "input": {
      const type = element.getAttribute("type");
      if (type === "checkbox") {
        const checked = element.hasAttribute("checked");
        if (ctx?.onCheckboxToggle) {
          const index = ctx.checkboxCounter.current++;
          const toggle = ctx.onCheckboxToggle;
          return (
            <Checkbox
              key={key}
              checked={checked}
              className="cursor-pointer"
              onCheckedChange={(newChecked) => {
                if (typeof newChecked === "boolean") {
                  toggle(index, newChecked);
                }
              }}
            />
          );
        }
        return <Checkbox key={key} checked={checked} disabled />;
      }
      return null;
    }

    case "table":
      return <table key={key}>{children}</table>;

    case "th":
      return <th key={key}>{children}</th>;

    case "td":
      return <td key={key}>{children}</td>;

    case "thead":
      return <thead key={key}>{children}</thead>;

    case "tbody":
      return <tbody key={key}>{children}</tbody>;

    case "tr":
      return <tr key={key}>{children}</tr>;

    case "p":
      return <p key={key}>{children}</p>;

    case "br":
      return <br key={key} />;

    case "hr":
      return <hr key={key} />;

    case "h1":
      return <h1 key={key}>{children}</h1>;

    case "h2":
      return <h2 key={key}>{children}</h2>;

    case "h3":
      return <h3 key={key}>{children}</h3>;

    case "h4":
      return <h4 key={key}>{children}</h4>;

    case "h5":
      return <h5 key={key}>{children}</h5>;

    case "h6":
      return <h6 key={key}>{children}</h6>;

    case "strong":
    case "b":
      return <strong key={key}>{children}</strong>;

    case "em":
    case "i":
      return <em key={key}>{children}</em>;

    case "u":
      return <u key={key}>{children}</u>;

    case "s":
    case "del":
      return <del key={key}>{children}</del>;

    case "ul":
      return <ul key={key}>{children}</ul>;

    case "ol":
      return <ol key={key}>{children}</ol>;

    case "li":
      return <li key={key}>{children}</li>;

    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;

    case "div":
      return <div key={key}>{children}</div>;

    case "span":
      return <span key={key}>{children}</span>;

    case "sup":
      return <sup key={key}>{children}</sup>;

    case "sub":
      return <sub key={key}>{children}</sub>;

    case "details": {
      // Find the summary element and separate it from the rest of the content
      const childNodes = Array.from(element.childNodes);
      const summaryNode = childNodes.find(
        (node) =>
          node.nodeType === Node.ELEMENT_NODE &&
          (node as Element).tagName.toLowerCase() === "summary",
      );
      const contentNodes = childNodes.filter((node) => node !== summaryNode);

      const summaryContent = summaryNode ? processNode(summaryNode, ctx) : null;
      const contentChildren = contentNodes.map((child) =>
        processNode(child, ctx),
      );

      return (
        <Collapsible key={key}>
          {summaryContent}
          <CollapsibleContent>{contentChildren}</CollapsibleContent>
        </Collapsible>
      );
    }

    case "summary":
      return <CollapsibleTrigger key={key}>{children}</CollapsibleTrigger>;

    default:
      // For unknown tags, just render children
      return <>{children}</>;
  }
}

interface MentionProps {
  username: string;
  host?: string;
}

export function Mention({ username, host = "github.com" }: MentionProps) {
  return (
    <a
      href={`https://${host}/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline font-medium"
    >
      @{username}
    </a>
  );
}

interface EmojiProps {
  name: string;
}

const emojiMap: Record<string, string> = {
  "+1": "\uD83D\uDC4D",
  "-1": "\uD83D\uDC4E",
  laugh: "\uD83D\uDE04",
  hooray: "\uD83C\uDF89",
  confused: "\uD83D\uDE15",
  heart: "\u2764\uFE0F",
  rocket: "\uD83D\uDE80",
  eyes: "\uD83D\uDC40",
  bug: "\uD83D\uDC1B",
  fire: "\uD83D\uDD25",
  sparkles: "\u2728",
  warning: "\u26A0\uFE0F",
  check: "\u2705",
  x: "\u274C",
};

export function Emoji({ name }: EmojiProps) {
  const emoji = emojiMap[name] ?? `:${name}:`;
  return (
    <span role="img" aria-label={name}>
      {emoji}
    </span>
  );
}
