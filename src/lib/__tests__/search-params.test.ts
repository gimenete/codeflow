import { describe, it, expect } from "vitest";
import {
  isNegatedFilter,
  getFilterValue,
  toggleFilterNegation,
} from "../search-params";

describe("isNegatedFilter", () => {
  it("returns true for negated value", () => {
    expect(isNegatedFilter("-owner")).toBe(true);
  });

  it("returns false for non-negated value", () => {
    expect(isNegatedFilter("owner")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isNegatedFilter(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isNegatedFilter("")).toBe(false);
  });

  it("returns true for value that is just a dash", () => {
    expect(isNegatedFilter("-")).toBe(true);
  });
});

describe("getFilterValue", () => {
  it("returns value without negation prefix", () => {
    expect(getFilterValue("-owner")).toBe("owner");
  });

  it("returns value as-is when not negated", () => {
    expect(getFilterValue("owner")).toBe("owner");
  });

  it("returns undefined for undefined input", () => {
    expect(getFilterValue(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string (falsy value)", () => {
    expect(getFilterValue("")).toBeUndefined();
  });

  it("strips only the first dash", () => {
    expect(getFilterValue("-owner-name")).toBe("owner-name");
  });
});

describe("toggleFilterNegation", () => {
  it("negates a non-negated value", () => {
    expect(toggleFilterNegation("owner")).toBe("-owner");
  });

  it("removes negation from a negated value", () => {
    expect(toggleFilterNegation("-owner")).toBe("owner");
  });

  it("returns undefined for undefined input", () => {
    expect(toggleFilterNegation(undefined)).toBeUndefined();
  });

  it("preserves internal dashes when toggling", () => {
    expect(toggleFilterNegation("owner-name")).toBe("-owner-name");
    expect(toggleFilterNegation("-owner-name")).toBe("owner-name");
  });
});
