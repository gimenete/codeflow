import { describe, it, expect } from "vitest";
import { ciStatusColors, reviewStatusColors } from "../status-colors";

describe("ciStatusColors", () => {
  it("has correct color for success", () => {
    expect(ciStatusColors.success).toBe("bg-green-500");
  });

  it("has correct color for failure", () => {
    expect(ciStatusColors.failure).toBe("bg-red-500");
  });

  it("has correct color for pending", () => {
    expect(ciStatusColors.pending).toBe("bg-yellow-500");
  });
});

describe("reviewStatusColors", () => {
  it("has correct color for approved", () => {
    expect(reviewStatusColors.approved).toBe("text-green-500");
  });

  it("has correct color for changesRequested", () => {
    expect(reviewStatusColors.changesRequested).toBe("text-red-500");
  });

  it("has correct color for reviewRequired", () => {
    expect(reviewStatusColors.reviewRequired).toBe("text-yellow-500");
  });
});
