// Check if running in Electron
export function isElectron(): boolean {
  return (
    typeof window !== "undefined" &&
    "electronAPI" in window &&
    (window as unknown as { electronAPI: { isElectron: boolean } }).electronAPI
      ?.isElectron
  );
}

// Legacy function name for compatibility - now checks for Electron
export function isTauri(): boolean {
  return isElectron();
}

export function isWeb(): boolean {
  return !isElectron();
}
