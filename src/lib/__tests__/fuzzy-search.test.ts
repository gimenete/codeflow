import { describe, it, expect } from "vitest";
import { fuzzyMatch, fuzzyMatchSimple, fuzzyFilter } from "../fuzzy-search";

describe("fuzzyMatchSimple", () => {
  it("matches exact string", () => {
    expect(fuzzyMatchSimple("hello world", "hello world")).toBe(true);
  });

  it("matches substring characters in order", () => {
    expect(fuzzyMatchSimple("hello world", "hlo")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(fuzzyMatchSimple("Hello World", "hw")).toBe(true);
  });

  it("returns false when characters are not in order", () => {
    expect(fuzzyMatchSimple("hello", "olh")).toBe(false);
  });

  it("returns true for empty pattern", () => {
    expect(fuzzyMatchSimple("hello", "")).toBe(true);
  });

  it("returns false when pattern is longer than text", () => {
    expect(fuzzyMatchSimple("hi", "hello")).toBe(false);
  });

  it("matches single character", () => {
    expect(fuzzyMatchSimple("hello", "e")).toBe(true);
  });

  it("returns false for non-matching character", () => {
    expect(fuzzyMatchSimple("hello", "z")).toBe(false);
  });
});

describe("fuzzyMatch", () => {
  it("returns match result with score and indices", () => {
    const result = fuzzyMatch("hw", "hello world");
    expect(result).not.toBeNull();
    expect(result!.matchIndices).toEqual([0, 6]);
    expect(result!.score).toBeGreaterThan(0);
  });

  it("returns null for no match", () => {
    expect(fuzzyMatch("xyz", "hello")).toBeNull();
  });

  it("gives bonus score for match at start", () => {
    const result = fuzzyMatch("h", "hello");
    expect(result).not.toBeNull();
    expect(result!.score).toBe(3); // start bonus
  });

  it("gives bonus score for match after separator", () => {
    const result = fuzzyMatch("w", "hello-world");
    expect(result).not.toBeNull();
    expect(result!.matchIndices).toEqual([6]);
    expect(result!.score).toBe(3); // separator bonus
  });

  it("gives bonus score for consecutive matches", () => {
    const result = fuzzyMatch("he", "hello");
    expect(result).not.toBeNull();
    // h at index 0 = 3 (start bonus), e at index 1 = 2 (consecutive bonus)
    expect(result!.score).toBe(5);
  });

  it("gives regular score for non-consecutive, non-boundary matches", () => {
    const result = fuzzyMatch("hl", "hello");
    expect(result).not.toBeNull();
    // h at index 0 = 3 (start bonus), l at index 2 = 1 (regular)
    expect(result!.score).toBe(4);
  });

  it("is case insensitive", () => {
    const result = fuzzyMatch("HW", "hello world");
    expect(result).not.toBeNull();
    expect(result!.matchIndices).toEqual([0, 6]);
  });

  it("returns null for empty pattern check", () => {
    const result = fuzzyMatch("", "hello");
    // empty pattern: patternIdx (0) === lowerPattern.length (0) → returns match
    expect(result).not.toBeNull();
    expect(result!.matchIndices).toEqual([]);
    expect(result!.score).toBe(0);
  });
});

describe("fuzzyFilter", () => {
  const items = [
    { name: "apple" },
    { name: "banana" },
    { name: "avocado" },
    { name: "apricot" },
  ];
  const getText = (item: { name: string }) => item.name;

  it("returns all items when pattern is empty", () => {
    const results = fuzzyFilter(items, "", getText);
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.score === 0)).toBe(true);
  });

  it("filters items by fuzzy match", () => {
    const results = fuzzyFilter(items, "ap", getText);
    // "apple" and "apricot" start with "ap"
    const names = results.map((r) => r.item.name);
    expect(names).toContain("apple");
    expect(names).toContain("apricot");
    expect(names).not.toContain("banana");
  });

  it("sorts results by score descending", () => {
    const results = fuzzyFilter(items, "a", getText);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("respects limit parameter", () => {
    const results = fuzzyFilter(items, "a", getText, 2);
    expect(results).toHaveLength(2);
  });

  it("returns empty array when no matches", () => {
    const results = fuzzyFilter(items, "xyz", getText);
    expect(results).toHaveLength(0);
  });

  it("respects limit with empty pattern", () => {
    const results = fuzzyFilter(items, "", getText, 2);
    expect(results).toHaveLength(2);
  });
});
