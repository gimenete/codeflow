import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fuzzyMatch(text: string, pattern: string): boolean {
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

export function fuzzyFilter<T>(
  items: T[],
  pattern: string,
  getText: (item: T) => string,
): T[] {
  if (!pattern) return items;
  return items.filter((item) => fuzzyMatch(getText(item), pattern));
}
