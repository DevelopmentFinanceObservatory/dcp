import { describe, it, expect } from "vitest";
import { partsInPlan, tokenPartIndex } from "./sentencePlan";
import { normalizeResponse } from "@/lib/contract/types";
import type { SentenceToken } from "@/lib/contract/types";
import { partsComposedBrazil, partsDefiniteKenya } from "./fixtures";

describe("partsInPlan", () => {
  it("collects every distinct part index tagged in the real composed 'population and GDP in Brazil' plan", () => {
    const response = normalizeResponse(partsComposedBrazil);
    const plan = response.sentence_plan;
    if (!plan) throw new Error("expected a composed sentence_plan");

    expect(partsInPlan(plan)).toEqual(new Set([0, 1]));
  });

  it("is empty for a single part's own plan (no part_index anywhere)", () => {
    const response = normalizeResponse(partsDefiniteKenya);
    const part = response.parts[0];
    if (part?.status !== "definite")
      throw new Error("expected a definite part");
    const plan = part.spec.sentence_plan;
    if (!plan) throw new Error("expected a spec sentence_plan");

    expect(plan.every((t) => t.part_index == null)).toBe(true);
    expect(partsInPlan(plan)).toEqual(new Set());
  });

  it("collects {0} for a single-part envelope plan stamped on every token (a lone contributing part still tags every token, connectives included, e.g. live_kenya_composed.json)", () => {
    const singlePartComposedPlan: SentenceToken[] = [
      {
        kind: "slot",
        text: "Total population",
        axis: "what",
        entity_refs: [],
        part_index: 0,
      },
      { kind: "text", text: " in ", entity_refs: [], part_index: 0 },
      {
        kind: "slot",
        text: "Kenya",
        axis: "where",
        binding_ref: "where:",
        entity_refs: [],
        part_index: 0,
      },
      { kind: "text", text: ", ", entity_refs: [], part_index: 0 },
      {
        kind: "slot",
        text: "1960 to 2024",
        axis: "when",
        binding_ref: "when:",
        entity_refs: [],
        part_index: 0,
      },
      { kind: "text", text: ", according to ", entity_refs: [], part_index: 0 },
      {
        kind: "slot",
        text: "4 sources",
        axis: "source",
        entity_refs: [],
        part_index: 0,
      },
      { kind: "text", text: ".", entity_refs: [], part_index: 0 },
    ];

    expect(partsInPlan(singlePartComposedPlan)).toEqual(new Set([0]));
  });
});

describe("tokenPartIndex", () => {
  it("reads a token's own part_index when the plan tags it", () => {
    const planParts = new Set([0, 1]);
    const token: SentenceToken = {
      kind: "slot",
      text: "GDP",
      axis: "what",
      entity_refs: [],
      part_index: 1,
    };
    expect(tokenPartIndex(token, planParts)).toBe(1);
  });

  it("routes an untagged token to the plan's lone contributing part", () => {
    const untagged: SentenceToken = {
      kind: "text",
      text: " in ",
      entity_refs: [],
    };
    expect(tokenPartIndex(untagged, new Set([2]))).toBe(2);
  });

  it("routes an untagged token to part 0 when the plan carries no part_index at all", () => {
    const untagged: SentenceToken = {
      kind: "text",
      text: " in ",
      entity_refs: [],
    };
    expect(tokenPartIndex(untagged, new Set())).toBe(0);
  });

  it("returns null for an untagged token when the plan genuinely spans more than one part", () => {
    const connective: SentenceToken = {
      kind: "text",
      text: " and ",
      entity_refs: [],
    };
    expect(tokenPartIndex(connective, new Set([0, 1]))).toBeNull();
  });

  it("agrees with the real composed Brazil plan: every shared connective/terminal routes to null, every tagged token to its own part", () => {
    const response = normalizeResponse(partsComposedBrazil);
    const plan = response.sentence_plan;
    if (!plan) throw new Error("expected a composed sentence_plan");
    const planParts = partsInPlan(plan);

    const routed = plan.map((t) => tokenPartIndex(t, planParts));
    expect(routed).toEqual(
      plan.map((t) => (t.part_index != null ? t.part_index : null)),
    );
  });
});
