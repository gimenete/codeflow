import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { fuzzyMatchSimple } from "@/lib/fuzzy-search";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Simple fuzzy match that returns true/false.
 * For scored fuzzy matching with match indices, use fuzzyMatch from @/lib/fuzzy-search.
 */
export function fuzzyMatch(text: string, pattern: string): boolean {
  return fuzzyMatchSimple(text, pattern);
}

/**
 * Simple fuzzy filter that returns matching items.
 * For scored fuzzy filtering with match indices, use fuzzyFilter from @/lib/fuzzy-search.
 */
export function fuzzyFilter<T>(
  items: T[],
  pattern: string,
  getText: (item: T) => string,
): T[] {
  if (!pattern) return items;
  return items.filter((item) => fuzzyMatchSimple(getText(item), pattern));
}
