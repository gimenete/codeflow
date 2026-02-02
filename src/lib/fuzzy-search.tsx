import { memo } from "react";

export interface FuzzyMatchResult {
  score: number;
  matchIndices: number[];
}

/**
 * Fuzzy match: checks if pattern chars appear in order in text
 * Returns match indices and a score, or null if no match
 *
 * Scoring:
 * - +3 bonus for match at start or after separator (/-_.)
 * - +2 bonus for consecutive matches
 * - +1 for regular matches
 */
export function fuzzyMatch(
  pattern: string,
  text: string,
): FuzzyMatchResult | null {
  const lowerPattern = pattern.toLowerCase();
  const lowerText = text.toLowerCase();
  const matchIndices: number[] = [];
  let patternIdx = 0;
  let score = 0;
  let lastMatchIdx = -1;

  for (
    let i = 0;
    i < lowerText.length && patternIdx < lowerPattern.length;
    i++
  ) {
    if (lowerText[i] === lowerPattern[patternIdx]) {
      matchIndices.push(i);
      // Score: bonus for start, after separator, or consecutive
      if (i === 0 || "/\\-_.".includes(text[i - 1])) {
        score += 3;
      } else if (lastMatchIdx === i - 1) {
        score += 2;
      } else {
        score += 1;
      }
      lastMatchIdx = i;
      patternIdx++;
    }
  }

  return patternIdx === lowerPattern.length ? { score, matchIndices } : null;
}

/**
 * Simple fuzzy match that returns true/false without scoring
 */
export function fuzzyMatchSimple(text: string, pattern: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerPattern = pattern.toLowerCase();

  let patternIdx = 0;
  for (
    let i = 0;
    i < lowerText.length && patternIdx < lowerPattern.length;
    i++
  ) {
    if (lowerText[i] === lowerPattern[patternIdx]) {
      patternIdx++;
    }
  }
  return patternIdx === lowerPattern.length;
}

export interface FuzzyFilterResult<T> {
  item: T;
  score: number;
  matchIndices: number[];
}

/**
 * Filter and score arrays using fuzzy matching
 * Returns results sorted by score descending
 */
export function fuzzyFilter<T>(
  items: T[],
  pattern: string,
  getText: (item: T) => string,
  limit?: number,
): FuzzyFilterResult<T>[] {
  if (!pattern) {
    return items.slice(0, limit).map((item) => ({
      item,
      score: 0,
      matchIndices: [],
    }));
  }

  const results: FuzzyFilterResult<T>[] = [];

  for (const item of items) {
    const text = getText(item);
    const match = fuzzyMatch(pattern, text);
    if (match) {
      results.push({
        item,
        score: match.score,
        matchIndices: match.matchIndices,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return limit ? results.slice(0, limit) : results;
}

interface HighlightedTextProps {
  text: string;
  matchIndices: number[];
  className?: string;
}

/**
 * Component for rendering text with highlighted fuzzy matches
 * Consecutive matches are unified into single highlight spans
 */
export const HighlightedText = memo(function HighlightedText({
  text,
  matchIndices,
  className,
}: HighlightedTextProps) {
  if (matchIndices.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Build result with consecutive matches unified
  const result: React.ReactNode[] = [];
  let i = 0;
  let matchIdx = 0;

  while (i < text.length) {
    if (matchIdx < matchIndices.length && i === matchIndices[matchIdx]) {
      // Start of a match sequence - find consecutive matches
      let end = i;
      while (
        matchIdx < matchIndices.length - 1 &&
        matchIndices[matchIdx + 1] === end + 1
      ) {
        matchIdx++;
        end++;
      }
      // Add the unified highlight span
      result.push(
        <span key={i} className="bg-yellow-300 dark:bg-yellow-700 rounded-sm">
          {text.slice(i, end + 1)}
        </span>,
      );
      matchIdx++;
      i = end + 1;
    } else {
      // Non-matching character - collect consecutive non-matches
      const start = i;
      while (
        i < text.length &&
        (matchIdx >= matchIndices.length || i !== matchIndices[matchIdx])
      ) {
        i++;
      }
      result.push(text.slice(start, i));
    }
  }

  return <span className={className}>{result}</span>;
});

interface HighlightedTextFromPatternProps {
  text: string;
  pattern: string;
  className?: string;
}

/**
 * Component for rendering text with highlighted fuzzy matches from a pattern
 * This computes match indices automatically from the pattern
 */
export const HighlightedTextFromPattern = memo(
  function HighlightedTextFromPattern({
    text,
    pattern,
    className,
  }: HighlightedTextFromPatternProps) {
    if (!pattern) {
      return <span className={className}>{text}</span>;
    }

    const match = fuzzyMatch(pattern, text);
    const matchIndices = match?.matchIndices ?? [];

    return (
      <HighlightedText
        text={text}
        matchIndices={matchIndices}
        className={className}
      />
    );
  },
);
