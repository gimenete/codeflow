import { create } from "zustand";

export interface BatchedSuggestion {
  suggestionId: string;
  commentId: string;
  path: string;
  suggestion: string;
}

interface SuggestionBatchState {
  /** Keyed by `owner/repo/number` so batches are scoped per PR */
  batches: Record<string, BatchedSuggestion[]>;
  addSuggestion: (prKey: string, suggestion: BatchedSuggestion) => void;
  removeSuggestion: (prKey: string, suggestionId: string) => void;
  clearBatch: (prKey: string) => void;
}

export function getPrKey(owner: string, repo: string, number: number): string {
  return `${owner}/${repo}/${number}`;
}

export const useSuggestionBatchStore = create<SuggestionBatchState>()(
  (set) => ({
    batches: {},
    addSuggestion: (prKey, suggestion) =>
      set((state) => {
        const existing = state.batches[prKey] ?? [];
        if (existing.some((s) => s.suggestionId === suggestion.suggestionId)) {
          return state;
        }
        return {
          batches: { ...state.batches, [prKey]: [...existing, suggestion] },
        };
      }),
    removeSuggestion: (prKey, suggestionId) =>
      set((state) => {
        const existing = state.batches[prKey] ?? [];
        return {
          batches: {
            ...state.batches,
            [prKey]: existing.filter((s) => s.suggestionId !== suggestionId),
          },
        };
      }),
    clearBatch: (prKey) =>
      set((state) => {
        const { [prKey]: _, ...rest } = state.batches;
        return { batches: rest };
      }),
  }),
);
