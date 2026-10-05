import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MAX_ANSWER_LENGTH, type VendoredSkill } from "./contract/skillCompare";
import { instructionWithSkills, instructionWithoutSkills } from "./prompts";
import {
  runSkillCompareArm,
  searchSkills,
  loadSkill,
  truncateAnswer,
  isAnswerTruncated,
} from "./skillAgent";

/**
 * Captures the config each `runSkillCompareArm` call passes to `LlmAgent`,
 * so the arm-routing tests below can assert on the instruction and tools it
 * chose without a real Gemini call. `FunctionTool`, `Gemini`, and the
 * runner are all stubbed too: nothing in this file reaches the network.
 */
let capturedAgentConfig: { instruction: string; tools: unknown[] } | null =
  null;

vi.mock("@google/adk", () => ({
  FunctionTool: vi.fn().mockImplementation((config: unknown) => config),
  Gemini: vi.fn().mockImplementation((config: unknown) => config),
  InMemoryRunner: vi.fn().mockImplementation(() => ({
    runEphemeral: () =>
      (async function* () {
        yield { final: true };
      })(),
  })),
  LlmAgent: vi
    .fn()
    .mockImplementation((config: { instruction: string; tools: unknown[] }) => {
      capturedAgentConfig = config;
      return config;
    }),
  isFinalResponse: vi.fn(() => true),
  stringifyContent: vi.fn(() => "stub answer"),
}));

function skill(overrides: Partial<VendoredSkill> = {}): VendoredSkill {
  return {
    name: "oda-channels",
    description: "Covers bilateral vs multilateral ODA.",
    body: "## Overview\n\nUse this skill when...",
    references: [{ path: "references/bilateral-multilateral.md", content: "..." }],
    ...overrides,
  };
}

describe("searchSkills", () => {
  it("returns name and description only, never the body", () => {
    const skills = [skill()];
    const result = searchSkills(skills);
    expect(result).toEqual([
      { name: "oda-channels", description: "Covers bilateral vs multilateral ODA." },
    ]);
    // No key in the result object carries the body or references.
    expect(Object.keys(result[0]).sort()).toEqual(["description", "name"]);
  });

  it("returns every skill in the source list", () => {
    const skills = [
      skill({ name: "oda-channels" }),
      skill({ name: "oda-measures", description: "Covers flow type and price basis." }),
    ];
    expect(searchSkills(skills)).toEqual([
      { name: "oda-channels", description: "Covers bilateral vs multilateral ODA." },
      { name: "oda-measures", description: "Covers flow type and price basis." },
    ]);
  });

  it("returns an empty result for an empty skills list (the control arm)", () => {
    expect(searchSkills([])).toEqual([]);
  });
});

describe("loadSkill", () => {
  it("returns a known skill's body and references", () => {
    const target = skill({
      name: "oda-measures",
      body: "## Flow types\n\nGrant equivalent vs cash flow...",
      references: [{ path: "references/flow-types.md", content: "details" }],
    });
    const result = loadSkill([skill(), target], "oda-measures");
    expect(result).toEqual({
      found: true,
      name: "oda-measures",
      body: "## Flow types\n\nGrant equivalent vs cash flow...",
      references: [{ path: "references/flow-types.md", content: "details" }],
    });
  });

  it("returns a clear not-found result for an unknown name, rather than throwing", () => {
    const result = loadSkill([skill()], "does-not-exist");
    expect(result).toEqual({
      found: false,
      name: "does-not-exist",
      message:
        'No skill named "does-not-exist" is available. Call search_skills to see the available names.',
    });
  });

  it("returns not-found rather than throwing against an empty skills list", () => {
    expect(() => loadSkill([], "anything")).not.toThrow();
    expect(loadSkill([], "anything").found).toBe(false);
  });
});

describe("truncateAnswer", () => {
  it("leaves text at or under the limit unchanged", () => {
    expect(truncateAnswer("short", 10)).toBe("short");
    expect(truncateAnswer("exactlyten", 10)).toBe("exactlyten");
  });

  it("cuts text over the limit down to it", () => {
    expect(truncateAnswer("this is too long", 7)).toBe("this is");
    expect(truncateAnswer("this is too long", 7).length).toBe(7);
  });

  it("defaults to MAX_ANSWER_LENGTH from the contract", () => {
    const long = "a".repeat(MAX_ANSWER_LENGTH + 500);
    const truncated = truncateAnswer(long);
    expect(truncated.length).toBe(MAX_ANSWER_LENGTH);
  });
});

describe("isAnswerTruncated", () => {
  it("is false for text at or under the limit", () => {
    expect(isAnswerTruncated("short", 10)).toBe(false);
    expect(isAnswerTruncated("exactlyten", 10)).toBe(false);
  });

  it("is true for text over the limit", () => {
    expect(isAnswerTruncated("this is too long", 7)).toBe(true);
  });

  it("defaults to MAX_ANSWER_LENGTH from the contract", () => {
    expect(isAnswerTruncated("a".repeat(MAX_ANSWER_LENGTH))).toBe(false);
    expect(isAnswerTruncated("a".repeat(MAX_ANSWER_LENGTH + 1))).toBe(true);
  });
});

describe("runSkillCompareArm", () => {
  const ORIGINAL_GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    capturedAgentConfig = null;
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = ORIGINAL_GEMINI_API_KEY;
  });

  const oneSkill: VendoredSkill[] = [
    {
      name: "oda-measures",
      description: "Covers flow type and price basis.",
      body: "## Flow types",
      references: [],
    },
  ];

  it("builds the with-skills arm with instructionWithSkills and its two tools", async () => {
    const result = await runSkillCompareArm({
      question: "q",
      arm: "with-skills",
      skills: oneSkill,
    });

    expect(capturedAgentConfig?.instruction).toBe(instructionWithSkills);
    expect(capturedAgentConfig?.tools).toHaveLength(2);
    expect(result.error).toBeNull();
    expect(result.toolCalls).toEqual([]);
  });

  it("builds the without-skills arm with instructionWithoutSkills and no tools declared", async () => {
    const result = await runSkillCompareArm({
      question: "q",
      arm: "without-skills",
    });

    expect(capturedAgentConfig?.instruction).toBe(instructionWithoutSkills);
    expect(capturedAgentConfig?.tools).toEqual([]);
    expect(result.error).toBeNull();
    expect(result.toolCalls).toEqual([]);
  });

  it("uses a different instruction per arm", () => {
    expect(instructionWithSkills).not.toBe(instructionWithoutSkills);
  });
});
