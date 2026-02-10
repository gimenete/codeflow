import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { enableCrossWindowSync } from "./cross-window-sync";

export type ThemePreference = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";

interface AppearanceState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      theme: "auto",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "codeflow:appearance",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Sync across windows
enableCrossWindowSync(useAppearanceStore);
