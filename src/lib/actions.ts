import { isElectron } from "./platform";

/**
 * Copy text to clipboard (works in both Electron and web)
 */
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

// Type definition for the shell API exposed by Electron preload
interface ShellAPI {
  openExternal(url: string): Promise<void>;
}

declare global {
  interface Window {
    shellAPI?: ShellAPI;
  }
}

/**
 * Open URL in external browser
 */
export async function openInBrowser(url: string): Promise<void> {
  if (isElectron() && window.shellAPI) {
    await window.shellAPI.openExternal(url);
  } else {
    window.open(url, "_blank");
  }
}
