import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";

describe("credentials", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    // Reset module cache so getCredentialStore creates a fresh store
    vi.resetModules();
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      // @ts-expect-error: cleaning up test mock
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  });

  describe("LocalStorageStore (web environment)", () => {
    it("uses localStorage when not in Electron", async () => {
      const storage = new Map<string, string>();
      const mockLocalStorage = {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      };

      globalThis.window = {} as unknown as Window & typeof globalThis;
      // localStorage is accessed as a global, not via window
      // @ts-expect-error: mocking localStorage for test
      globalThis.localStorage = mockLocalStorage;

      const { getCredentialStore } = await import("../credentials");
      const store = getCredentialStore();

      // Test set and get
      await store.set("token", "abc123");
      expect(storage.get("codeflow:token")).toBe("abc123");

      const value = await store.get("token");
      expect(value).toBe("abc123");

      // Test delete
      await store.delete("token");
      expect(storage.has("codeflow:token")).toBe(false);

      const deleted = await store.get("token");
      expect(deleted).toBeNull();

      // @ts-expect-error: cleaning up test mock
      delete globalThis.localStorage;
    });
  });

  describe("ElectronSecureStore", () => {
    it("uses credentialAPI when in Electron", async () => {
      const mockCredentialAPI = {
        get: vi.fn().mockResolvedValue("secure-token"),
        set: vi.fn().mockResolvedValue({ success: true }),
        delete: vi.fn().mockResolvedValue({ success: true }),
      };

      globalThis.window = {
        electronAPI: { isElectron: true },
        credentialAPI: mockCredentialAPI,
      } as unknown as Window & typeof globalThis;

      const { getCredentialStore } = await import("../credentials");
      const store = getCredentialStore();

      const value = await store.get("token");
      expect(value).toBe("secure-token");
      expect(mockCredentialAPI.get).toHaveBeenCalledWith("token");

      await store.set("token", "new-value");
      expect(mockCredentialAPI.set).toHaveBeenCalledWith("token", "new-value");

      await store.delete("token");
      expect(mockCredentialAPI.delete).toHaveBeenCalledWith("token");
    });

    it("throws when credentialAPI.set fails", async () => {
      const mockCredentialAPI = {
        get: vi.fn(),
        set: vi
          .fn()
          .mockResolvedValue({ success: false, error: "Access denied" }),
        delete: vi.fn(),
      };

      globalThis.window = {
        electronAPI: { isElectron: true },
        credentialAPI: mockCredentialAPI,
      } as unknown as Window & typeof globalThis;

      const { getCredentialStore } = await import("../credentials");
      const store = getCredentialStore();

      await expect(store.set("token", "value")).rejects.toThrow(
        "Access denied",
      );
    });

    it("throws when credentialAPI.delete fails", async () => {
      const mockCredentialAPI = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi
          .fn()
          .mockResolvedValue({ success: false, error: "Not found" }),
      };

      globalThis.window = {
        electronAPI: { isElectron: true },
        credentialAPI: mockCredentialAPI,
      } as unknown as Window & typeof globalThis;

      const { getCredentialStore } = await import("../credentials");
      const store = getCredentialStore();

      await expect(store.delete("token")).rejects.toThrow("Not found");
    });
  });
});
