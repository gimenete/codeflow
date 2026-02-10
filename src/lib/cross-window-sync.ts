import type { StoreApi } from "zustand";

/**
 * Syncs a Zustand persist store across multiple Electron windows.
 *
 * When another window writes to the same localStorage key, the `storage` event fires.
 * We use this to trigger a rehydration of the Zustand store so it picks up the
 * external changes.
 *
 * Call once per store at module level (not inside a component).
 */
export function enableCrossWindowSync<T>(
  store: StoreApi<T> & {
    persist: {
      getOptions: () => { name?: string };
      rehydrate: () => void | Promise<void>;
    };
  },
): void {
  const storageKey = store.persist.getOptions().name;
  if (!storageKey) return;

  window.addEventListener("storage", (event) => {
    // Only react to changes on our specific key
    if (event.key === storageKey) {
      void store.persist.rehydrate();
    }
  });
}
