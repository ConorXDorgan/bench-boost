import { describe, expect, it } from "vitest";
import { toggleBucket } from "@/lib/format";

describe("toggleBucket", () => {
  it("removes a selected bucket", () => {
    expect(toggleBucket(["available", "coming", "not_available"], "coming")).toEqual([
      "available",
      "not_available",
    ]);
  });

  it("adds a bucket back in canonical order", () => {
    expect(toggleBucket(["not_available"], "available")).toEqual(["available", "not_available"]);
  });

  it("can empty the selection", () => {
    expect(toggleBucket(["coming"], "coming")).toEqual([]);
  });
});
