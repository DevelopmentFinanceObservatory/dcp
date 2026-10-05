import { describe, it, expect } from "vitest";
import {
  promoteFromSpec,
  toIdentitySlotBinding,
  toIdentityWindow,
  whereEntityRole,
  withEntityEdit,
  withFacetEdit,
  withResolvedSlotEdit,
  withSlotBinding,
} from "./promote";
import type { BaseIdentity, Spec } from "./types";

/** Minimal identity builder. */
function identity(over: Partial<BaseIdentity> = {}): BaseIdentity {
  return {
    identity_version: "spec1",
    shape: { kind: "statvar_schema", population_type: "Person" },
    slots: [],
    entities: {},
    requested_window: { kind: "all" },
    ...over,
  };
}

/** Minimal spec builder for promote derivation. */
function spec(over: Partial<Spec> = {}): Spec {
  return {
    spec_id: over.spec_id ?? "s",
    shape: {
      shape_id: "sh",
      label: "",
      population_type: null,
      measured_property: null,
      stat_type: null,
      slot_keys: [],
      member_count: 1,
      ...over.shape,
    },
    slots: over.slots ?? [],
    stat_vars: over.stat_vars ?? [],
    entities: over.entities ?? [],
    coverage: { kind: "bare", has_data: true },
    resolution: {
      resolved_stat_vars: over.resolution?.resolved_stat_vars ?? [],
      resolved_entities: [],
      resolved_sources: [],
      slot_filters: [],
      pipeline_trace: [],
    },
    definition: over.definition,
  } as Spec;
}

describe("promoteFromSpec", () => {
  it("includes resolved_stat_var_dcids when the spec has resolved StatVars", () => {
    const p = promoteFromSpec(
      spec({
        resolution: {
          resolved_stat_vars: [{ dcid: "sv/1", label: "x" }],
        } as Spec["resolution"],
      }),
    );
    expect(p.resolved_stat_var_dcids).toEqual(["sv/1"]);
  });

  it("omits resolved_stat_var_dcids when the spec has none", () => {
    const p = promoteFromSpec(spec());
    expect(p.resolved_stat_var_dcids).toBeUndefined();
  });

  it("attaches base_spec_id/base_identity verbatim when the spec carries a hashed identity", () => {
    const baseIdentity = identity({
      entities: { observationAbout: ["country/KEN"] },
    });
    const p = promoteFromSpec(
      spec({ spec_id: "spec_1", definition: { identity: baseIdentity } }),
    );
    expect(p.base_spec_id).toBe("spec_1");
    expect(p.base_identity).toBe(baseIdentity);
  });

  it("omits base_spec_id/base_identity when the spec carries no identity", () => {
    const p = promoteFromSpec(spec({ spec_id: "spec_1" }));
    expect(p.base_spec_id).toBeUndefined();
    expect(p.base_identity).toBeUndefined();
  });
});

describe("toIdentitySlotBinding", () => {
  it("maps a bound resolved slot to a value binding by dcid", () => {
    expect(
      toIdentitySlotBinding({
        kind: "value",
        value: {
          value_kind: "enum_value",
          ref: { dcid: "Female", label: "female" },
        },
      }),
    ).toEqual({ state: "value", ref: "Female" });
  });

  it("maps unbound to unbound", () => {
    expect(toIdentitySlotBinding({ kind: "unbound" })).toEqual({
      state: "unbound",
    });
  });

  it("maps absent (no identity-core equivalent) to unbound", () => {
    expect(toIdentitySlotBinding({ kind: "absent" })).toEqual({
      state: "unbound",
    });
  });
});

describe("toIdentityWindow", () => {
  it("maps unbound to {kind:'all'}", () => {
    expect(toIdentityWindow({ kind: "unbound" })).toEqual({ kind: "all" });
  });

  it("maps a bound time_window to a range", () => {
    expect(
      toIdentityWindow({
        kind: "value",
        value: {
          value_kind: "time_window",
          time_window: { start_year: 2010, end_year: 2020 },
        },
      }),
    ).toEqual({ kind: "range", start_year: 2010, end_year: 2020 });
  });

  it("maps a literal 'latest' value to {kind:'latest'}", () => {
    expect(
      toIdentityWindow({
        kind: "value",
        value: { value_kind: "literal", literal: "latest" },
      }),
    ).toEqual({ kind: "latest" });
  });
});

describe("withSlotBinding", () => {
  it("replaces the matching slot's binding by property dcid, leaving others untouched", () => {
    const base = identity({
      slots: [
        { property: "gender", binding: { state: "unbound" } },
        { property: "age", binding: { state: "unbound" } },
      ],
    });
    const next = withSlotBinding(base, "gender", {
      state: "value",
      ref: "Female",
    });
    expect(next.slots).toEqual([
      { property: "gender", binding: { state: "value", ref: "Female" } },
      { property: "age", binding: { state: "unbound" } },
    ]);
  });

  it("is a no-op when property is null/undefined", () => {
    const base = identity({
      slots: [{ property: "gender", binding: { state: "unbound" } }],
    });
    expect(withSlotBinding(base, null, { state: "value", ref: "Female" })).toBe(
      base,
    );
  });
});

describe("withEntityEdit", () => {
  it("binds a role that was previously absent, with no removed accounting", () => {
    const base = identity();
    const { identity: next, removed } = withEntityEdit(
      base,
      "observationAbout",
      ["country/KEN"],
    );
    expect(next.entities).toEqual({ observationAbout: ["country/KEN"] });
    expect(removed).toBeUndefined();
  });

  it("rebinds an already-bound role, with no removed accounting", () => {
    const base = identity({ entities: { observationAbout: ["country/KEN"] } });
    const { identity: next, removed } = withEntityEdit(
      base,
      "observationAbout",
      ["country/NGA"],
    );
    expect(next.entities).toEqual({ observationAbout: ["country/NGA"] });
    expect(removed).toBeUndefined();
  });

  it("drops a bound role and acknowledges it in removed.entities", () => {
    const base = identity({ entities: { origin: ["country/FRA"] } });
    const { identity: next, removed } = withEntityEdit(base, "origin", null);
    expect(next.entities).toEqual({});
    expect(removed).toEqual({ entities: ["origin"] });
  });
});

describe("withFacetEdit", () => {
  it("binds a facet axis into the sparse map", () => {
    const base = identity();
    const { identity: next, removed } = withFacetEdit(base, "provenance", {
      state: "value",
      ref: "dc/base/OECD_CRS",
    });
    expect(next.facets).toEqual({
      provenance: { state: "value", ref: "dc/base/OECD_CRS" },
    });
    expect(removed).toBeUndefined();
  });

  it("drops a bound facet axis and acknowledges it in removed.facets", () => {
    const base = identity({
      facets: { provenance: { state: "value", ref: "dc/base/OECD_CRS" } },
    });
    const { identity: next, removed } = withFacetEdit(base, "provenance", null);
    expect(next.facets).toBeUndefined();
    expect(removed).toEqual({ facets: ["provenance"] });
  });
});

describe("whereEntityRole", () => {
  it("is observationAbout for a subject-only identity", () => {
    expect(
      whereEntityRole(
        identity({ entities: { observationAbout: ["country/KEN"] } }),
      ),
    ).toBe("observationAbout");
  });

  it("is destination for a directional identity that already carries one", () => {
    expect(
      whereEntityRole(
        identity({
          entities: { origin: ["country/FRA"], destination: ["country/ETH"] },
        }),
      ),
    ).toBe("destination");
  });
});

describe("withResolvedSlotEdit", () => {
  const whatKey = {
    axis: "what" as const,
    property: { dcid: "flowType", label: "flow type" },
    label: "flow",
  };
  const whereKey = {
    axis: "where" as const,
    property: null,
    label: "recipient",
  };
  const whenKey = { axis: "when" as const, property: null, label: "time" };
  const sourceKey = {
    axis: "source" as const,
    property: null,
    label: "source",
  };

  it("routes a what/how slot edit to identity.slots, matched by property dcid", () => {
    const base = spec({
      slots: [{ key: whatKey, binding: { kind: "unbound" } }],
      definition: {
        identity: identity({
          slots: [{ property: "flowType", binding: { state: "unbound" } }],
        }),
      },
    });
    const { identity: next, removed } = withResolvedSlotEdit(base, 0, {
      kind: "value",
      value: {
        value_kind: "enum_value",
        ref: { dcid: "ODAGrants", label: "ODA grants" },
      },
    });
    expect(next.slots).toEqual([
      { property: "flowType", binding: { state: "value", ref: "ODAGrants" } },
    ]);
    expect(removed).toBeUndefined();
  });

  it("routes a where-slot edit to the subject entity role for a subject-only identity", () => {
    const base = spec({
      slots: [{ key: whereKey, binding: { kind: "unbound" } }],
      definition: { identity: identity() },
    });
    const { identity: next } = withResolvedSlotEdit(base, 0, {
      kind: "value",
      value: {
        value_kind: "entity",
        ref: { dcid: "country/KEN", label: "Kenya" },
      },
    });
    expect(next.entities).toEqual({ observationAbout: ["country/KEN"] });
  });

  it("routes a where-slot edit to the destination role for a directional identity, dropping the stale role via removed", () => {
    const base = spec({
      slots: [
        {
          key: whereKey,
          binding: {
            kind: "value",
            value: {
              value_kind: "entity",
              ref: { dcid: "country/ETH", label: "Ethiopia" },
            },
          },
        },
      ],
      definition: {
        identity: identity({
          entities: { origin: ["country/FRA"], destination: ["country/ETH"] },
        }),
      },
    });
    const { identity: next } = withResolvedSlotEdit(base, 0, {
      kind: "value",
      value: {
        value_kind: "entity",
        ref: { dcid: "country/NGA", label: "Nigeria" },
      },
    });
    expect(next.entities).toEqual({
      origin: ["country/FRA"],
      destination: ["country/NGA"],
    });
  });

  it("routes a where-slot unbind to removed.entities, keyed by the real role (never 'recipient')", () => {
    const base = spec({
      slots: [{ key: whereKey, binding: { kind: "unbound" } }],
      definition: {
        identity: identity({
          entities: { origin: ["country/FRA"], destination: ["country/ETH"] },
        }),
      },
    });
    const { identity: next, removed } = withResolvedSlotEdit(base, 0, {
      kind: "unbound",
    });
    expect(next.entities).toEqual({ origin: ["country/FRA"] });
    expect(removed).toEqual({ entities: ["destination"] });
  });

  it("routes a when-slot edit to identity.requested_window", () => {
    const base = spec({
      slots: [{ key: whenKey, binding: { kind: "unbound" } }],
      definition: {
        identity: identity({
          requested_window: { kind: "range", start_year: 2010 },
        }),
      },
    });
    const { identity: next } = withResolvedSlotEdit(base, 0, {
      kind: "value",
      value: {
        value_kind: "time_window",
        time_window: { start_year: 2015, end_year: 2020 },
      },
    });
    expect(next.requested_window).toEqual({
      kind: "range",
      start_year: 2015,
      end_year: 2020,
    });
  });

  it("routes a source-slot edit to facets.provenance", () => {
    const base = spec({
      slots: [{ key: sourceKey, binding: { kind: "unbound" } }],
      definition: { identity: identity() },
    });
    const { identity: next } = withResolvedSlotEdit(base, 0, {
      kind: "value",
      value: {
        value_kind: "source",
        ref: { dcid: "dc/base/OECD_CRS", label: "OECD CRS" },
      },
    });
    expect(next.facets).toEqual({
      provenance: { state: "value", ref: "dc/base/OECD_CRS" },
    });
  });

  it("throws when the spec carries no identity to edit against", () => {
    const base = spec({
      slots: [{ key: whatKey, binding: { kind: "unbound" } }],
    });
    expect(() => withResolvedSlotEdit(base, 0, { kind: "unbound" })).toThrow();
  });
});
