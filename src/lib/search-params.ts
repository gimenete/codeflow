import { z } from "zod";

export const searchFiltersSchema = z.object({
  type: z.enum(["pulls", "issues"]).optional(),
  state: z.enum(["open", "closed", "merged", "draft", "all"]).optional(),
  repo: z.string().optional(), // "owner/repo" or "-owner/repo" to exclude
  author: z.string().optional(), // "user" or "-user" to exclude
  assignee: z.string().optional(), // "user" or "-user" to exclude
  reviewRequested: z.string().optional(),
  mentioned: z.string().optional(),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;

// Schema for detail pages - includes cursor for navigation
export const detailSearchSchema = searchFiltersSchema.extend({
  cursor: z.string().optional(),
});

export type DetailSearchParams = z.infer<typeof detailSearchSchema>;

// Helper to check if filter is negated
export function isNegatedFilter(value: string | undefined): boolean {
  return value?.startsWith("-") ?? false;
}

// Helper to get filter value without negation prefix
export function getFilterValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.startsWith("-") ? value.slice(1) : value;
}

// Helper to create a negated filter value
export function toggleFilterNegation(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;
  return isNegatedFilter(value) ? value.slice(1) : `-${value}`;
}
