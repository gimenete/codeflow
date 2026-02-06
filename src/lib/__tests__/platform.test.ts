import { describe, it, expect, vi, afterEach } from "vitest";
import { isElectron, isTauri, isWeb } from "../platform";

describe("platform detection", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    // Restore window
    if (originalWindow === undefined) {
      // @ts-expect-error: cleaning up test mock
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  });

  describe("isElectron", () => {
    it("returns false when window is undefined", () => {
      // In Node test environment, window may not exist or not have electronAPI
      // @ts-expect-error: testing without window
      delete globalThis.window;
      expect(isElectron()).toBe(false);
    });

    it("returns false when electronAPI is not on window", () => {
      globalThis.window = {} as Window & typeof globalThis;
      expect(isElectron()).toBe(false);
    });

    it("returns true when electronAPI.isElectron is true", () => {
      globalThis.window = {
        electronAPI: { isElectron: true },
      } as unknown as Window & typeof globalThis;
      expect(isElectron()).toBe(true);
    });

    it("returns false when electronAPI.isElectron is false", () => {
      globalThis.window = {
        electronAPI: { isElectron: false },
      } as unknown as Window & typeof globalThis;
      expect(isElectron()).toBe(false);
    });
  });

  describe("isTauri", () => {
    it("is an alias for isElectron", () => {
      globalThis.window = {} as Window & typeof globalThis;
      expect(isTauri()).toBe(isElectron());
    });
  });

  describe("isWeb", () => {
    it("returns true when not in Electron", () => {
      globalThis.window = {} as Window & typeof globalThis;
      expect(isWeb()).toBe(true);
    });

    it("returns false when in Electron", () => {
      globalThis.window = {
        electronAPI: { isElectron: true },
      } as unknown as Window & typeof globalThis;
      expect(isWeb()).toBe(false);
    });
  });
});
