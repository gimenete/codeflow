import { describe, it, expect } from "vitest";
import { getIconById, iconOptions } from "../query-icons";
import { SearchIcon } from "@primer/octicons-react";

describe("getIconById", () => {
  it("returns the correct icon for a known id", () => {
    for (const option of iconOptions) {
      expect(getIconById(option.id)).toBe(option.icon);
    }
  });

  it("returns SearchIcon as default for unknown id", () => {
    expect(getIconById("nonexistent")).toBe(SearchIcon);
  });

  it("returns SearchIcon for empty string", () => {
    expect(getIconById("")).toBe(SearchIcon);
  });
});

describe("iconOptions", () => {
  it("contains expected icon ids", () => {
    const ids = iconOptions.map((o) => o.id);
    expect(ids).toContain("git-pull-request");
    expect(ids).toContain("issue-opened");
    expect(ids).toContain("eye");
    expect(ids).toContain("mention");
    expect(ids).toContain("search");
    expect(ids).toContain("bookmark");
    expect(ids).toContain("star");
    expect(ids).toContain("filter");
  });

  it("has unique ids", () => {
    const ids = iconOptions.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
