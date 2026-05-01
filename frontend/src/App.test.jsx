import { describe, expect, it } from "vitest";
import { fallbackSnapshot } from "./lib/api.js";

describe("fallback snapshot", () => {
  it("contains an operator-ready service graph", () => {
    expect(fallbackSnapshot.services.length).toBeGreaterThanOrEqual(8);
    expect(fallbackSnapshot.edges.length).toBeGreaterThan(0);
  });
});

