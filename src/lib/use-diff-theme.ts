import { useSyncExternalStore } from "react";

type DiffTheme = "light" | "dark";

function subscribe(callback: () => void): () => void {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getSnapshot(): DiffTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getServerSnapshot(): DiffTheme {
  return "light";
}

export function useDiffTheme(): DiffTheme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
