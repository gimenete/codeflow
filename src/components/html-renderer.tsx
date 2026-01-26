import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

interface HtmlRendererProps {
  html: string;
  className?: string;
}

export function HtmlRenderer({ html, className }: HtmlRendererProps) {
  const content = useMemo(() => {
    if (!html) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    return processNode(doc.body);
  }, [html]);

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

function processNode(node: Node): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map(processNode);
  const key = getKey();

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

    case "pre": {
      return <pre key={key}>{children}</pre>;
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

      const summaryContent = summaryNode ? processNode(summaryNode) : null;
      const contentChildren = contentNodes.map(processNode);

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
