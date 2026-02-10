// Window API type for multi-window support
interface WindowAPI {
  newWindow: (urlPath?: string) => Promise<{ success: boolean }>;
  setTitle: (title: string) => Promise<void>;
}

declare global {
  interface Window {
    windowAPI?: WindowAPI;
  }
}

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

// Open a new application window (optionally navigating to a specific URL path)
export function openNewWindow(urlPath?: string): void {
  if (isElectron() && window.windowAPI) {
    void window.windowAPI.newWindow(urlPath);
  }
}

// Set the native window title
export function setWindowTitle(title: string): void {
  if (isElectron() && window.windowAPI) {
    void window.windowAPI.setTitle(title);
  }
}
