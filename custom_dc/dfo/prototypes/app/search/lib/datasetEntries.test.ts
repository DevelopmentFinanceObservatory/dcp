/**
 * Pins `buildDatasetEntries`: one entry per part in order, every part
 * status, the pick override, the editShared rewrite, and a mixed two-part
 * response. Exercised against real, normalized captures (not synthetic
 * shapes) so a wire-shape regression here would also break
 * normalizeResponse's own tests in lib/contract/types.parts.test.ts.
 */
import { describe, it, expect } from "vitest";
import { normalizeResponse } from "@/lib/contract/types";
import type { BaseIdentity, Part } from "@/lib/contract/types";
import { withSlotBinding } from "@/lib/contract/promote";
import { buildDatasetEntries } from "./datasetEntries";
import {
  partsDefiniteKenya,
  partsCandidatesNigeria,
  partsTwoDefiniteKenya,
  partsMixedBrazil,
  partsDatasetResubmitBrazil,
} from "./fixtures/parts";
import { noData } from "./fixtures/no-data";

const kenya = normalizeResponse(partsDefiniteKenya);
const nigeria = normalizeResponse(partsCandidatesNigeria);
const twoDefiniteKenya = normalizeResponse(partsTwoDefiniteKenya);
const mixedBrazil = normalizeResponse(partsMixedBrazil);
const noDataResponse = normalizeResponse(noData);
const datasetResubmitBrazil = normalizeResponse(partsDatasetResubmitBrazil);

/** A synthetic unsupported part — no live capture carries this status,
 *  same precedent as app/search/lib/store/specStore.test.ts. */
const unsupportedPart: Part = {
  status: "unsupported",
  variable_text: "inflation-adjusted vibes",
  warnings: [],
  unsupported: {
    code: "unsupported_ask",
    detail: "This query falls outside the taxonomy.",
  },
};

describe("buildDatasetEntries: one entry per part status", () => {
  it("builds an identity entry from a definite part", () => {
    const [entry] = buildDatasetEntries(kenya.parts);
    expect(entry.entry_kind).toBe("identity");
    if (entry.entry_kind !== "identity") throw new Error("expected identity");
    expect(entry.variable_text).toBe("population");
    expect(entry.identity.identity_version).toBe("spec1");
    expect(entry.base_spec_id).toBe("spec_567bf6828e3cc23c7d70e121cc36f2f9");
    expect(entry.base_identity).toEqual(entry.identity);
  });

  it("builds a candidates entry preserving posted order and CandidateSet fields", () => {
    const [entry] = buildDatasetEntries(nigeria.parts);
    expect(entry.entry_kind).toBe("candidates");
    if (entry.entry_kind !== "candidates")
      throw new Error("expected candidates");
    expect(entry.variable_text).toBe("GDP");
    expect(entry.ordering).toBe("broadest_first");
    expect(entry.truncated).toBe(false);
    // C135: the door's candidates entry is exactly these five keys —
    // no max_candidates, which the engine now rejects with 400 "Extra
    // inputs are not permitted".
    expect(Object.keys(entry).sort()).toEqual(
      [
        "candidates",
        "entry_kind",
        "ordering",
        "truncated",
        "variable_text",
      ].sort(),
    );
    expect(entry.candidates).toHaveLength(2);
    expect(entry.candidates[0].identity.identity_version).toBe("spec1");
    // Posted order matches the wire order of candidates.specs, not sorted.
    const nigeriaPart = nigeria.parts[0];
    if (nigeriaPart.status !== "candidates")
      throw new Error("expected candidates");
    expect(entry.candidates.map((c) => c.identity)).toEqual(
      nigeriaPart.candidates.specs.map((s) => s.definition!.identity),
    );
  });

  it("builds a placeholder entry from a no_data part", () => {
    const [entry] = buildDatasetEntries(noDataResponse.parts);
    expect(entry.entry_kind).toBe("placeholder");
    if (entry.entry_kind !== "placeholder")
      throw new Error("expected placeholder");
    expect(entry.variable_text).toBe("GDP");
    expect(entry.status).toBe("no_data");
    expect(entry.reason).toBe("entity_not_resolved");
    expect(entry.code).toBeUndefined();
  });

  it("builds a placeholder entry from an unsupported part", () => {
    const [entry] = buildDatasetEntries([unsupportedPart]);
    expect(entry.entry_kind).toBe("placeholder");
    if (entry.entry_kind !== "placeholder")
      throw new Error("expected placeholder");
    expect(entry.variable_text).toBe("inflation-adjusted vibes");
    expect(entry.status).toBe("unsupported");
    expect(entry.code).toBe("unsupported_ask");
    expect(entry.reason).toBeUndefined();
  });

  it("falls back to an empty variable_text rather than throwing when a part carries none", () => {
    const staleKenya: Part = { ...kenya.parts[0], variable_text: null };
    const [entry] = buildDatasetEntries([staleKenya]);
    expect(entry.variable_text).toBe("");
  });
});

describe("buildDatasetEntries: pick override", () => {
  it("posts the chosen candidate's identity as both identity and base", () => {
    const nigeriaPart = nigeria.parts[0];
    if (nigeriaPart.status !== "candidates")
      throw new Error("expected candidates");
    const chosen = nigeriaPart.candidates.specs[1]; // the narrower candidate

    const [entry] = buildDatasetEntries(nigeria.parts, {
      kind: "edit",
      index: 0,
      identity: chosen.definition!.identity!,
      asBase: { spec_id: chosen.spec_id },
    });

    expect(entry.entry_kind).toBe("identity");
    if (entry.entry_kind !== "identity") throw new Error("expected identity");
    expect(entry.identity).toEqual(chosen.definition!.identity);
    expect(entry.base_identity).toEqual(entry.identity);
    expect(entry.base_spec_id).toBe(chosen.spec_id);
    // No prior identity to preserve, so no `removed`/resolved_stat_var_dcids
    // ride along unless the caller supplies them.
    expect(entry.removed).toBeUndefined();
  });

  it("edits a definite part's identity, carrying its own base forward", () => {
    const kenyaIdentity = kenya.parts[0];
    if (kenyaIdentity.status !== "definite")
      throw new Error("expected definite");
    const edited = withSlotBinding(
      kenyaIdentity.spec.definition!.identity!,
      "gender",
      {
        state: "value",
        ref: "dcid/Female",
      },
    );

    const [entry] = buildDatasetEntries(kenya.parts, {
      kind: "edit",
      index: 0,
      identity: edited,
    });

    if (entry.entry_kind !== "identity") throw new Error("expected identity");
    expect(entry.identity).toEqual(edited);
    // The base still comes from the part's own current spec (promoteFromSpec),
    // unlike the pick case above.
    expect(entry.base_spec_id).toBe("spec_567bf6828e3cc23c7d70e121cc36f2f9");
    expect(entry.base_identity).toEqual(
      kenyaIdentity.spec.definition!.identity,
    );
    expect(entry.base_identity).not.toEqual(entry.identity);
  });

  it("throws when an edit override without asBase targets a non-definite part", () => {
    expect(() =>
      buildDatasetEntries(nigeria.parts, {
        kind: "edit",
        index: 0,
        identity: {} as BaseIdentity,
      }),
    ).toThrow(/non-definite part/);
  });
});

describe("buildDatasetEntries: editShared rewrite", () => {
  it("rewrites the same axis across every definite entry's identity, leaving other slots untouched", () => {
    const rewrite = (identity: BaseIdentity) =>
      withSlotBinding(identity, "age", {
        state: "value",
        ref: "dcid/Years0To4",
      });

    const entries = buildDatasetEntries(twoDefiniteKenya.parts, {
      kind: "editShared",
      rewrite,
    });

    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      if (entry.entry_kind !== "identity") throw new Error("expected identity");
      const ageSlot = entry.identity.slots.find((s) => s.property === "age");
      expect(ageSlot?.binding).toEqual({
        state: "value",
        ref: "dcid/Years0To4",
      });
    }

    // A slot the rewrite didn't touch stays as the base identity had it.
    const [population, totalPopulation] = entries;
    if (
      population.entry_kind !== "identity" ||
      totalPopulation.entry_kind !== "identity"
    ) {
      throw new Error("expected identity entries");
    }
    const genderSlot = population.identity.slots.find(
      (s) => s.property === "gender",
    );
    expect(genderSlot?.binding).toEqual({ state: "unbound" });
    const nativitySlot = totalPopulation.identity.slots.find(
      (s) => s.property === "nativity",
    );
    expect(nativitySlot?.binding).toEqual({ state: "unbound" });

    // The two parts kept their own distinct base spec_ids.
    expect(population.base_spec_id).toBe(
      "spec_567bf6828e3cc23c7d70e121cc36f2f9",
    );
    expect(totalPopulation.base_spec_id).toBe(
      "spec_ee399fc925ac7192b04df4b09b87c053",
    );
  });

  it("leaves a non-definite entry's identity untouched by the rewrite", () => {
    const mixed = [kenya.parts[0], nigeria.parts[0]];
    const rewrite = (identity: BaseIdentity) =>
      withSlotBinding(identity, "gender", {
        state: "value",
        ref: "dcid/Female",
      });

    const entries = buildDatasetEntries(mixed, { kind: "editShared", rewrite });

    expect(entries[0].entry_kind).toBe("identity");
    expect(entries[1].entry_kind).toBe("candidates");
    if (entries[0].entry_kind !== "identity")
      throw new Error("expected identity");
    const genderSlot = entries[0].identity.slots.find(
      (s) => s.property === "gender",
    );
    expect(genderSlot?.binding).toEqual({ state: "value", ref: "dcid/Female" });
  });
});

describe("buildDatasetEntries: mixed two-part response", () => {
  it("builds one identity entry and one candidates entry, in part order", () => {
    const entries = buildDatasetEntries(mixedBrazil.parts);

    expect(entries).toHaveLength(2);
    expect(entries[0].entry_kind).toBe("identity");
    expect(entries[0].variable_text).toBe("population");
    expect(entries[1].entry_kind).toBe("candidates");
    expect(entries[1].variable_text).toBe("GDP");
    if (entries[1].entry_kind !== "candidates")
      throw new Error("expected candidates");
    expect(entries[1].candidates.length).toBeGreaterThanOrEqual(2);
  });
});

describe("buildDatasetEntries: real dataset_resubmit response fixture", () => {
  it("normalizes a real dataset_resubmit capture and round-trips it back into the same entries", () => {
    expect(datasetResubmitBrazil.status).toBe("mixed");
    expect(datasetResubmitBrazil.query_echo.entry_path).toBe(
      "dataset_resubmit",
    );
    expect(datasetResubmitBrazil.parts.map((p) => p.status)).toEqual([
      "definite",
      "candidates",
    ]);
    // Neither an identity nor a candidates entry has a phrase to restate.
    expect(datasetResubmitBrazil.parts[0].restatement).toBeNull();
    expect(datasetResubmitBrazil.parts[1].restatement).toBeNull();

    const entries = buildDatasetEntries(datasetResubmitBrazil.parts);
    expect(entries).toHaveLength(2);
    expect(entries[0].entry_kind).toBe("identity");
    expect(entries[0].variable_text).toBe("population");
    expect(entries[1].entry_kind).toBe("candidates");
    expect(entries[1].variable_text).toBe("GDP");
    if (entries[1].entry_kind !== "candidates")
      throw new Error("expected candidates");
    expect(entries[1].candidates).toHaveLength(2);
  });
});
