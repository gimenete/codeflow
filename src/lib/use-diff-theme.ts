import { useSyncExternalStore } from "react";
import { useAppearanceStore } from "./appearance-store";

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
  const preference = useAppearanceStore((s) => s.theme);
  const systemTheme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (preference === "auto") {
    return systemTheme;
  }
  return preference;
}
