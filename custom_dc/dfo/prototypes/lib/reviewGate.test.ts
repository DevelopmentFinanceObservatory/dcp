import { describe, it, expect } from "vitest";
import {
  checkPassphrase,
  encodeRevealToken,
  decodeRevealToken,
  type RevealPayload,
} from "./reviewGate";

describe("checkPassphrase", () => {
  it("accepts the correct passphrase", () => {
    expect(checkPassphrase("oda-skills-review")).toBe(true);
  });

  it("rejects a wrong passphrase", () => {
    expect(checkPassphrase("wrong")).toBe(false);
  });

  it("rejects a wrong passphrase of a different length without throwing", () => {
    expect(() => checkPassphrase("way way way longer than the real one")).not.toThrow();
    expect(checkPassphrase("way way way longer than the real one")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(checkPassphrase("")).toBe(false);
  });

  it("rejects non-string input rather than throwing", () => {
    expect(checkPassphrase(undefined)).toBe(false);
    expect(checkPassphrase(null)).toBe(false);
    expect(checkPassphrase(42)).toBe(false);
    expect(checkPassphrase(["oda-skills-review"])).toBe(false);
  });
});

describe("encodeRevealToken / decodeRevealToken", () => {
  const payload: RevealPayload = {
    withSkillsArm: "b",
    skillsLoaded: ["oda-measures", "oda-concepts"],
    answers: { a: "control answer", b: "with-skills answer" },
  };

  it("round-trips a payload through encode then decode", () => {
    const token = encodeRevealToken(payload);
    expect(decodeRevealToken(token)).toEqual(payload);
  });

  it("round-trips an empty skillsLoaded list and null answers", () => {
    const empty: RevealPayload = {
      withSkillsArm: "a",
      skillsLoaded: [],
      answers: { a: null, b: null },
    };
    const token = encodeRevealToken(empty);
    expect(decodeRevealToken(token)).toEqual(empty);
  });

  it("produces an opaque base64 string, not readable JSON", () => {
    const token = encodeRevealToken(payload);
    expect(token).not.toContain("withSkillsArm");
    expect(token).not.toContain("oda-measures");
  });

  it("returns null for malformed base64/JSON rather than throwing", () => {
    expect(() => decodeRevealToken("not valid base64 json!!!")).not.toThrow();
    expect(decodeRevealToken("not valid base64 json!!!")).toBeNull();
  });

  it("returns null for well-formed JSON missing required fields", () => {
    const token = Buffer.from(JSON.stringify({ withSkillsArm: "a" }), "utf8").toString(
      "base64",
    );
    expect(decodeRevealToken(token)).toBeNull();
  });

  it("returns null for an invalid withSkillsArm value", () => {
    const token = Buffer.from(
      JSON.stringify({ withSkillsArm: "c", skillsLoaded: [], answers: { a: null, b: null } }),
      "utf8",
    ).toString("base64");
    expect(decodeRevealToken(token)).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(decodeRevealToken(undefined)).toBeNull();
    expect(decodeRevealToken(42)).toBeNull();
    expect(decodeRevealToken("")).toBeNull();
  });
});
