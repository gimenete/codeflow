import { describe, it, expect, vi, afterEach } from "vitest";
import { formatRelativeDate } from "../format";

describe("formatRelativeDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setNow(date: Date) {
    vi.useFakeTimers();
    vi.setSystemTime(date);
  }

  const base = new Date("2025-06-15T12:00:00Z");

  it("formats minutes ago", () => {
    setNow(new Date(base.getTime() + 30 * 60000)); // 30 mins later
    expect(formatRelativeDate(base.toISOString())).toBe("30m ago");
  });

  it("formats 0 minutes ago for very recent dates", () => {
    setNow(new Date(base.getTime() + 10000)); // 10 seconds later
    expect(formatRelativeDate(base.toISOString())).toBe("0m ago");
  });

  it("formats hours ago", () => {
    setNow(new Date(base.getTime() + 5 * 3600000)); // 5 hours later
    expect(formatRelativeDate(base.toISOString())).toBe("5h ago");
  });

  it("formats days ago", () => {
    setNow(new Date(base.getTime() + 3 * 86400000)); // 3 days later
    expect(formatRelativeDate(base.toISOString())).toBe("3d ago");
  });

  it("formats weeks ago", () => {
    setNow(new Date(base.getTime() + 14 * 86400000)); // 2 weeks later
    expect(formatRelativeDate(base.toISOString())).toBe("2w ago");
  });

  it("formats months ago", () => {
    setNow(new Date(base.getTime() + 60 * 86400000)); // ~2 months later
    expect(formatRelativeDate(base.toISOString())).toBe("2mo ago");
  });

  it("formats years ago", () => {
    setNow(new Date(base.getTime() + 400 * 86400000)); // ~1 year later
    expect(formatRelativeDate(base.toISOString())).toBe("1y ago");
  });

  it("boundary: 59 minutes shows minutes", () => {
    setNow(new Date(base.getTime() + 59 * 60000));
    expect(formatRelativeDate(base.toISOString())).toBe("59m ago");
  });

  it("boundary: 60 minutes shows hours", () => {
    setNow(new Date(base.getTime() + 60 * 60000));
    expect(formatRelativeDate(base.toISOString())).toBe("1h ago");
  });

  it("boundary: 23 hours shows hours", () => {
    setNow(new Date(base.getTime() + 23 * 3600000));
    expect(formatRelativeDate(base.toISOString())).toBe("23h ago");
  });

  it("boundary: 24 hours shows days", () => {
    setNow(new Date(base.getTime() + 24 * 3600000));
    expect(formatRelativeDate(base.toISOString())).toBe("1d ago");
  });

  it("boundary: 6 days shows days", () => {
    setNow(new Date(base.getTime() + 6 * 86400000));
    expect(formatRelativeDate(base.toISOString())).toBe("6d ago");
  });

  it("boundary: 7 days shows weeks", () => {
    setNow(new Date(base.getTime() + 7 * 86400000));
    expect(formatRelativeDate(base.toISOString())).toBe("1w ago");
  });
});
