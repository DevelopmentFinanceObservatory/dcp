import { describe, it, expect } from "vitest";
import { resolveSnapshotSha } from "./snapshot-skills.mjs";

describe("resolveSnapshotSha", () => {
  it("returns the sha unchanged for a clean tree", () => {
    const result = resolveSnapshotSha({
      sha: "abc123",
      gitStatusOutput: "",
      allowDirtyEnvValue: undefined,
    });
    expect(result).toEqual({ sha: "abc123", dirty: false });
  });

  it("treats whitespace-only git status output as clean", () => {
    const result = resolveSnapshotSha({
      sha: "abc123",
      gitStatusOutput: "\n  \n",
      allowDirtyEnvValue: undefined,
    });
    expect(result).toEqual({ sha: "abc123", dirty: false });
  });

  it("refuses a dirty tree when dirtiness isn't allowed", () => {
    expect(() =>
      resolveSnapshotSha({
        sha: "abc123",
        gitStatusOutput: " M skills/oda-measures/SKILL.md\n",
        allowDirtyEnvValue: undefined,
      }),
    ).toThrow(/uncommitted changes/);
  });

  it("refuses a dirty tree for any falsy or unrecognized opt-out value", () => {
    for (const value of [undefined, "", "0", "false", "no"]) {
      expect(() =>
        resolveSnapshotSha({
          sha: "abc123",
          gitStatusOutput: " M skills/oda-measures/SKILL.md\n",
          allowDirtyEnvValue: value,
        }),
      ).toThrow(/uncommitted changes/);
    }
  });

  it("records a -dirty suffixed sha when dirtiness is explicitly allowed", () => {
    const result = resolveSnapshotSha({
      sha: "abc123",
      gitStatusOutput: " M skills/oda-measures/SKILL.md\n",
      allowDirtyEnvValue: "1",
    });
    expect(result).toEqual({ sha: "abc123-dirty", dirty: true });
  });

  it("accepts 'true' (any case) as well as '1' for the opt-out", () => {
    for (const value of ["true", "True", "TRUE"]) {
      const result = resolveSnapshotSha({
        sha: "abc123",
        gitStatusOutput: " M skills/oda-measures/SKILL.md\n",
        allowDirtyEnvValue: value,
      });
      expect(result).toEqual({ sha: "abc123-dirty", dirty: true });
    }
  });
});
