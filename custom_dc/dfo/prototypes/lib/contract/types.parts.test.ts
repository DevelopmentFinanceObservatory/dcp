/**
 * Pins normalizeResponse/normalizeSpec's handling of the `parts[]` wire
 * envelope: the ONLY shape a ResolveResponse carries. Every spec nested
 * inside every part (a definite part's own spec, a candidates part's
 * candidates.specs) goes through normalizeSpec, which lifts
 * resolved.rendered_sentence/sentence_plan onto the spec itself, like every
 * other resolved field.
 *
 * Fixtures in app/search/lib/fixtures/parts.ts are trimmed from live engine
 * captures, plus one synthetic multi-part body.
 */
import { describe, it, expect } from "vitest";
import { normalizeResponse, normalizeSpec } from "./types";
import {
  partsDefiniteKenya,
  partsCandidatesNigeria,
  partsMixedTwoVariable,
} from "@/app/search/lib/fixtures/parts";

describe("normalizeResponse: parts[] envelope", () => {
  it("normalizes a single definite part", () => {
    const out = normalizeResponse(partsDefiniteKenya);

    expect(out.status).toBe("definite");
    expect(out.parts.length).toBe(1);
    const part = out.parts[0];
    expect(part.status).toBe("definite");
    if (part.status !== "definite") throw new Error("expected definite");

    expect(part.spec.spec_id).toBe("spec_567bf6828e3cc23c7d70e121cc36f2f9");
    // A definite part's own rendered_sentence is always null on the wire;
    // the sentence lives on the spec (lifted from spec.resolved).
    expect(part.rendered_sentence).toBeNull();
    expect(part.spec.rendered_sentence).toBe(
      "Total population in Kenya, 1960 to 2024, according to 4 sources.",
    );
    expect(part.spec.sentence_plan?.length).toBe(4);
  });

  it("normalizes a single candidates part, each candidate spec carrying its own sentence", () => {
    const out = normalizeResponse(partsCandidatesNigeria);

    expect(out.status).toBe("candidates");
    expect(out.parts.length).toBe(1);
    const part = out.parts[0];
    expect(part.status).toBe("candidates");
    if (part.status !== "candidates") throw new Error("expected candidates");

    // The part itself carries a summary sentence (candidates never delegate
    // this to a single spec).
    expect(part.rendered_sentence).toBe(
      "2 possible interpretations. They differ by indicator.",
    );

    expect(part.candidates.specs.length).toBe(2);
    const [broad, narrow] = part.candidates.specs;
    expect(broad.spec_id).toBe("spec_a35f69fce32d7ed22e538ca57a901d13");
    expect(broad.rendered_sentence).toBe(
      "Nominal gross domestic product in Nigeria, 1960 to 2024, according to World Development Indicators.",
    );
    expect(broad.sentence_plan?.length).toBe(4);

    expect(narrow.spec_id).toBe("spec_c3d30c25c63e6a26f77d77b908526edd");
    expect(narrow.rendered_sentence).toBe(
      "Nominal gross domestic product per capita in Nigeria, 1960 to 2024, according to World Development Indicators. This is a loose match for your query.",
    );
    expect(narrow.sentence_plan?.length).toBe(5);
  });

  it("normalizes every part of a genuinely multi-variable body, overriding nothing", () => {
    expect(partsMixedTwoVariable.status).toBe("mixed");
    expect(partsMixedTwoVariable.parts.length).toBe(2);

    const out = normalizeResponse(partsMixedTwoVariable);

    // The envelope status is server-computed; normalizeResponse passes it
    // through rather than re-deriving or overriding it.
    expect(out.status).toBe("mixed");
    expect(out.parts.length).toBe(2);
    expect(out.parts[0].status).toBe("definite");
    expect(out.parts[1].status).toBe("candidates");
  });
});

describe("normalizeSpec: lifts resolved fields onto the Spec", () => {
  it("promotes inapplicable_slots/unresolved_slots/facet_options from spec.resolved to the top level of Spec", () => {
    const spec = normalizeSpec(partsDefiniteKenya.parts[0].spec);

    expect(spec.inapplicable_slots).toEqual(["age"]);
    expect(spec.unresolved_slots).toEqual([]);
    expect(spec.facet_options).toEqual([
      {
        axis: "provenance",
        options: [
          {
            value: {
              ref: {
                dcid: "dc/base/WorldDevelopmentIndicators",
                label: "WorldDevelopmentIndicators",
              },
              value_kind: "source",
            },
          },
        ],
        truncated: false,
        source: "observed",
      },
    ]);
  });

  it("promotes rendered_sentence/sentence_plan the same way, keeping resolved as provenance only", () => {
    const spec = normalizeSpec(partsDefiniteKenya.parts[0].spec);

    expect(spec.rendered_sentence).toBe(
      "Total population in Kenya, 1960 to 2024, according to 4 sources.",
    );
    expect(spec.sentence_plan).toEqual(
      partsDefiniteKenya.parts[0].spec.resolved.sentence_plan,
    );
    // resolved rides through unmodified, but downstream code should read the
    // lifted top-level fields instead.
    expect(spec.resolved?.rendered_sentence).toBe(spec.rendered_sentence);
  });

  it("defaults the three fields to an empty array, and the sentence fields to null, when the source spec omits them", () => {
    const spec = normalizeSpec({ spec_id: "spec_no_extras" });

    expect(spec.inapplicable_slots).toEqual([]);
    expect(spec.unresolved_slots).toEqual([]);
    expect(spec.facet_options).toEqual([]);
    expect(spec.rendered_sentence).toBeNull();
    expect(spec.sentence_plan).toBeNull();
  });
});
