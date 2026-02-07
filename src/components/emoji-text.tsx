import { githubEmojis } from "@/lib/github-emojis";

/**
 * Renders text with GitHub :emoji: shortcodes and `inline code` blocks.
 * Emojis are rendered as <img> tags using GitHub's emoji CDN.
 * Inline code is rendered as <code> elements.
 */
export function EmojiText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = parseEmojiAndCode(text);

  if (parts.length === 1 && parts[0].type === "text") {
    // Fast path: no emoji or code found, render plain text
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === "emoji") {
          return (
            <img
              key={i}
              src={part.url}
              alt={`:${part.name}:`}
              title={`:${part.name}:`}
              className="inline-block h-[1.2em] w-[1.2em] align-text-bottom"
            />
          );
        }
        if (part.type === "code") {
          return (
            <code
              key={i}
              className="rounded bg-muted px-1 py-0.5 text-[0.9em] font-mono"
            >
              {part.content}
            </code>
          );
        }
        return <span key={i}>{part.content}</span>;
      })}
    </span>
  );
}

type TextPart =
  | { type: "text"; content: string }
  | { type: "emoji"; name: string; url: string }
  | { type: "code"; content: string };

// Matches :emoji_name: or `inline code`
const EMOJI_CODE_REGEX = /:([a-z0-9_+-]+):|`([^`]+)`/g;

function parseEmojiAndCode(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(EMOJI_CODE_REGEX)) {
    const matchIndex = match.index;

    // Add text before the match
    if (matchIndex > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, matchIndex) });
    }

    if (match[1] !== undefined) {
      // Emoji match: :name:
      const emojiName = match[1];
      const emojiUrl = githubEmojis[emojiName];
      if (emojiUrl) {
        parts.push({ type: "emoji", name: emojiName, url: emojiUrl });
      } else {
        // Not a valid GitHub emoji, render as plain text
        parts.push({ type: "text", content: match[0] });
      }
    } else if (match[2] !== undefined) {
      // Inline code match: `code`
      parts.push({ type: "code", content: match[2] });
    }

    lastIndex = matchIndex + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  // If nothing was parsed, return the original text
  if (parts.length === 0) {
    parts.push({ type: "text", content: text });
  }

  return parts;
}
