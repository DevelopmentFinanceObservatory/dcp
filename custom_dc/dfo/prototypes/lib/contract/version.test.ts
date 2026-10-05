import { describe, it, expect } from "vitest";
import { CURRENT_SCHEMA_VERSION, isSupportedVersion } from "./version";

describe("schema version", () => {
  it("accepts the current version", () => {
    expect(isSupportedVersion(CURRENT_SCHEMA_VERSION)).toBe(true);
  });

  it("accepts an additive MINOR bump of the same MAJOR", () => {
    const [major] = String(CURRENT_SCHEMA_VERSION).split(".");
    expect(isSupportedVersion(`${major}.99`)).toBe(true);
  });

  it("rejects a different MAJOR (needs migration)", () => {
    expect(isSupportedVersion("2.0")).toBe(false);
  });

  it("accepts integer version 1", () => {
    expect(isSupportedVersion(1)).toBe(true);
  });

  it("rejects an empty version", () => {
    expect(isSupportedVersion("")).toBe(false);
  });
});
