import { useEffect, useSyncExternalStore } from "react";
import {
  useAppearanceStore,
  type ResolvedTheme,
  type ThemePreference,
} from "./appearance-store";

const darkMediaQuery =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

function subscribeToSystemTheme(callback: () => void): () => void {
  if (!darkMediaQuery) return () => {};
  darkMediaQuery.addEventListener("change", callback);
  return () => darkMediaQuery.removeEventListener("change", callback);
}

function getSystemTheme(): ResolvedTheme {
  return darkMediaQuery?.matches ? "dark" : "light";
}

function getSystemThemeServer(): ResolvedTheme {
  return "light";
}

function useSystemTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    getSystemThemeServer,
  );
}

function applyTheme(theme: ResolvedTheme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

/**
 * Hook that resolves the effective theme and keeps the document `.dark` class in sync.
 * Must be called once in the root layout.
 */
export function useTheme(): ResolvedTheme {
  const preference = useAppearanceStore((s) => s.theme);
  const systemTheme = useSystemTheme();
  const resolved: ResolvedTheme =
    preference === "auto" ? systemTheme : preference;

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  return resolved;
}

/**
 * Call before React renders to apply the correct theme class immediately,
 * preventing a flash of the wrong theme.
 */
export function initializeTheme() {
  let preference: ThemePreference = "auto";
  try {
    const stored = localStorage.getItem("codeflow:appearance");
    if (stored) {
      const parsed = JSON.parse(stored);
      preference = parsed.state?.theme ?? "auto";
    }
  } catch {
    // ignore parse errors
  }

  const resolved: ResolvedTheme =
    preference === "auto" ? getSystemTheme() : preference;
  applyTheme(resolved);
}
