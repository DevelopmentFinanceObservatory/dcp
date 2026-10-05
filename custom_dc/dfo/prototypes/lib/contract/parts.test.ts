/**
 * Pins partAt/partSentence/patchPartSpec/spliceResponseParts/envelopeStatus:
 * the shared definitions of "the part at index i" and "the spec inside it."
 * Exercised against real, normalized captures (not synthetic shapes) so a
 * wire-shape regression here would also break normalizeResponse's own tests
 * in types.parts.test.ts.
 */
import { describe, it, expect } from "vitest";
import { normalizeResponse } from "./types";
import {
  partAt,
  partSentence,
  patchPartSpec,
  envelopeStatus,
} from "./parts";
import {
  partsDefiniteKenya,
  partsCandidatesNigeria,
  partsMixedTwoVariable,
} from "@/app/search/lib/fixtures/parts";

const kenya = normalizeResponse(partsDefiniteKenya);
const nigeria = normalizeResponse(partsCandidatesNigeria);
const mixed = normalizeResponse(partsMixedTwoVariable);

describe("partAt", () => {
  it("returns parts[0] for a single-part definite response", () => {
    const part = partAt(kenya, 0);
    expect(part?.status).toBe("definite");
    if (part?.status !== "definite") throw new Error("expected definite");
    expect(part.spec.spec_id).toBe("spec_567bf6828e3cc23c7d70e121cc36f2f9");
  });

  it("returns parts[0] for a single-part candidates response", () => {
    const part = partAt(nigeria, 0);
    expect(part?.status).toBe("candidates");
  });

  it("indexes a multi-part response by position", () => {
    expect(partAt(mixed, 0)?.status).toBe("definite");
    expect(partAt(mixed, 1)?.status).toBe("candidates");
    expect(partAt(mixed, 2)).toBeUndefined();
  });
});

describe("partSentence", () => {
  it("reads a definite part's sentence from the spec, not the part", () => {
    const part = partAt(kenya, 0)!;
    const { rendered_sentence, sentence_plan } = partSentence(part);

    expect(rendered_sentence).toBe(
      "Total population in Kenya, 1960 to 2024, according to 4 sources.",
    );
    expect(sentence_plan?.length).toBe(4);
  });

  it("reads a candidates part's summary sentence from the part itself", () => {
    const part = partAt(nigeria, 0)!;
    const { rendered_sentence, sentence_plan } = partSentence(part);

    expect(rendered_sentence).toBe(
      "2 possible interpretations. They differ by indicator.",
    );
    expect(sentence_plan?.length).toBe(1);
  });
});

describe("patchPartSpec", () => {
  it("replaces the definite spec inside parts[0] when the spec_id matches", () => {
    const patched = patchPartSpec(
      kenya,
      0,
      "spec_567bf6828e3cc23c7d70e121cc36f2f9",
      (spec) => ({ ...spec, confidence: "low" }),
    );

    const part = partAt(patched, 0)!;
    expect(part.status).toBe("definite");
    if (part.status !== "definite") throw new Error("expected definite");
    expect(part.spec.confidence).toBe("low");
    expect(part.spec.spec_id).toBe("spec_567bf6828e3cc23c7d70e121cc36f2f9");

    // The source response is untouched.
    const originalPart = partAt(kenya, 0)!;
    if (originalPart.status !== "definite")
      throw new Error("expected definite");
    expect(originalPart.spec.confidence).not.toBe("low");
  });

  it("replaces one candidate spec inside parts[0].candidates.specs, leaving the other untouched", () => {
    const patched = patchPartSpec(
      nigeria,
      0,
      "spec_c3d30c25c63e6a26f77d77b908526edd",
      (spec) => ({ ...spec, confidence: "low" }),
    );

    const part = partAt(patched, 0)!;
    if (part.status !== "candidates") throw new Error("expected candidates");
    const [broad, narrow] = part.candidates.specs;
    expect(broad.spec_id).toBe("spec_a35f69fce32d7ed22e538ca57a901d13");
    expect(broad.confidence).not.toBe("low");
    expect(narrow.spec_id).toBe("spec_c3d30c25c63e6a26f77d77b908526edd");
    expect(narrow.confidence).toBe("low");

    // The source response's candidate list is untouched.
    const originalPart = partAt(nigeria, 0)!;
    if (originalPart.status !== "candidates")
      throw new Error("expected candidates");
    expect(
      originalPart.candidates.specs.every((s) => s.confidence !== "low"),
    ).toBe(true);
  });

  it("returns the response unchanged when no spec in the targeted part matches spec_id", () => {
    const patched = patchPartSpec(kenya, 0, "spec_does_not_exist", (spec) => ({
      ...spec,
      confidence: "low",
    }));

    expect(patched).toBe(kenya);
  });

  it("patches a candidate spec inside parts[1] of a multi-part response, leaving parts[0] untouched", () => {
    const patched = patchPartSpec(
      mixed,
      1,
      "spec_a35f69fce32d7ed22e538ca57a901d13",
      (spec) => ({ ...spec, confidence: "low" }),
    );

    const part1 = partAt(patched, 1)!;
    if (part1.status !== "candidates") throw new Error("expected candidates");
    expect(part1.candidates.specs[0].confidence).toBe("low");

    // parts[0] (a different index entirely) is untouched, same object.
    expect(partAt(patched, 0)).toBe(partAt(mixed, 0));
  });

  it("does not patch a part at the wrong index even when its spec_id would match elsewhere", () => {
    // spec_567bf6828e3cc23c7d70e121cc36f2f9 lives at parts[0], not parts[1].
    const patched = patchPartSpec(
      mixed,
      1,
      "spec_567bf6828e3cc23c7d70e121cc36f2f9",
      (spec) => ({ ...spec, confidence: "low" }),
    );
    expect(patched).toBe(mixed);
  });
});

describe("envelopeStatus", () => {
  it("returns the shared status when every part agrees", () => {
    expect(envelopeStatus(kenya.parts)).toBe("definite");
    expect(envelopeStatus(nigeria.parts)).toBe("candidates");
  });

  it('returns "mixed" when parts disagree', () => {
    expect(envelopeStatus(mixed.parts)).toBe("mixed");
  });

  it("returns the single part's status for a one-part list", () => {
    expect(envelopeStatus([kenya.parts[0]])).toBe("definite");
  });
});

