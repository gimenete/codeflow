import { isElectron } from "./platform";

export interface CredentialStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

class LocalStorageStore implements CredentialStore {
  private prefix = "codeflow:";

  async get(key: string): Promise<string | null> {
    return localStorage.getItem(this.prefix + key);
  }

  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(this.prefix + key, value);
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }
}

// Type definition for the credential API exposed by Electron preload
interface CredentialAPI {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
  ): Promise<{ success: boolean; error?: string }>;
  delete(key: string): Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    credentialAPI?: CredentialAPI;
  }
}

class ElectronSecureStore implements CredentialStore {
  async get(key: string): Promise<string | null> {
    if (!window.credentialAPI) {
      console.error("Electron credential API not available");
      return null;
    }
    return window.credentialAPI.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    if (!window.credentialAPI) {
      console.error("Electron credential API not available");
      return;
    }
    const result = await window.credentialAPI.set(key, value);
    if (!result.success) {
      throw new Error(result.error || "Failed to set credential");
    }
  }

  async delete(key: string): Promise<void> {
    if (!window.credentialAPI) {
      console.error("Electron credential API not available");
      return;
    }
    const result = await window.credentialAPI.delete(key);
    if (!result.success) {
      throw new Error(result.error || "Failed to delete credential");
    }
  }
}

let store: CredentialStore | null = null;

export function getCredentialStore(): CredentialStore {
  if (!store) {
    store = isElectron() ? new ElectronSecureStore() : new LocalStorageStore();
  }
  return store;
}
