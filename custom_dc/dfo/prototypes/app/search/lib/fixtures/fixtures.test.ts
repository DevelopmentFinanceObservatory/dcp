import { describe, it, expect } from "vitest";
import {
  fixtures,
  fixtureNames,
  getSpecFixtures,
  definiteBareSpec,
  definiteExactSpec,
  definiteCompareSpec,
  definiteBreadthSpec,
} from "./index";
import { buildViewModel } from "../viewModel";

describe("fixture set — contract invariants", () => {
  it("stamps a non-empty schema_version on every fixture", () => {
    for (const name of fixtureNames) {
      expect(fixtures[name].schema_version, name).toBeTruthy();
    }
  });

  it("honours the status → payload presence invariants, one part per fixture", () => {
    for (const name of fixtureNames) {
      const r = fixtures[name];
      expect(r.parts.length, name).toBe(1);
      const part = r.parts[0];
      expect(part.status, name).toBe(r.status);
      if (part.status === "definite") {
        expect(part.spec, name).toBeDefined();
      } else if (part.status === "candidates") {
        expect(part.candidates, name).toBeDefined();
        expect(part.candidates.specs.length, name).toBeGreaterThanOrEqual(2);
      } else if (part.status === "no_data") {
        expect(part.no_data, name).toBeDefined();
      }
    }
  });

  it("gives every spec fixture a distinct spec_id", () => {
    const ids = getSpecFixtures().map((s) => s.spec_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers all three coverage treatments across the definite specs", () => {
    const kinds = new Set(getSpecFixtures().map((s) => s.coverage.kind));
    expect(kinds).toEqual(new Set(["exact", "breadth", "bare"]));
  });
});

describe("SpecObservations — single- and multi-entity previews", () => {
  it("joins the single-entity fixture on the resolved entity + stat_var, truncated to a total_obs-consistent preview", () => {
    const obs = definiteExactSpec.observations;
    expect(obs).toBeDefined();
    expect(obs!.series).toHaveLength(1);
    const [series] = obs!.series;
    expect(series.stat_var_dcid).toBe(definiteExactSpec.stat_vars[0].ref.dcid);
    expect(series.entity_dcid).toBe(definiteExactSpec.entities[0].ref.dcid);
    expect(series.points.length).toBeGreaterThan(0);
    expect(series.points.length).toBeLessThan(obs!.total_obs);
    expect(obs!.complete).toBe(false);
    // coverage.observation_count and total_obs describe the same footprint.
    expect(definiteExactSpec.coverage.kind).toBe("exact");
    if (definiteExactSpec.coverage.kind === "exact") {
      expect(obs!.total_obs).toBe(definiteExactSpec.coverage.observation_count);
    }
  });

  it("gives the multi-entity fixture one series per compared entity, sharing the same stat_var", () => {
    const obs = definiteCompareSpec.observations;
    expect(obs).toBeDefined();
    expect(definiteCompareSpec.entities.length).toBeGreaterThanOrEqual(2);
    const entityDcids = definiteCompareSpec.entities.map((e) => e.ref.dcid);
    expect(obs!.series.map((s) => s.entity_dcid).sort()).toEqual(
      [...entityDcids].sort(),
    );
    expect(new Set(obs!.series.map((s) => s.stat_var_dcid)).size).toBe(1);
    const totalPoints = obs!.series.reduce((n, s) => n + s.points.length, 0);
    expect(obs!.total_obs).toBe(totalPoints);
    expect(obs!.complete).toBe(true);
  });

  it("renders latest-value table rows for both compared entities via buildViewModel", () => {
    const vm = buildViewModel(definiteCompareSpec);
    expect(vm.table.rows).toHaveLength(2);
    for (const row of vm.table.rows) {
      expect(row.value).not.toBeNull();
      expect(row.date).not.toBeNull();
    }
  });

  it("gives the dev-finance fixture a donor-keyed series whose entity_dcid is NOT one of Spec.entities, and still renders a labeled row", () => {
    const obs = definiteBreadthSpec.observations;
    expect(obs).toBeDefined();
    const [series] = obs!.series;
    expect(
      definiteBreadthSpec.entities.some(
        (e) => e.ref.dcid === series.entity_dcid,
      ),
    ).toBe(false);
    expect(series.entity_label).toBeTruthy();
    const vm = buildViewModel(definiteBreadthSpec);
    expect(vm.table.rows).toHaveLength(1);
    expect(vm.table.rows[0].entity).toBe(series.entity_label);
    expect(vm.table.rows[0].value).not.toBeNull();
  });
});

describe("definite-bare — donor editing reachable", () => {
  it("carries entity_options for the from-role donor, seeded with plausible DAC donors", () => {
    const eo = definiteBareSpec.entity_options?.find((o) => o.role === "from");
    expect(eo).toBeDefined();
    expect(eo!.entity_ref).toBe("country/FRA");
    expect(eo!.complete).toBe(true);
    expect(eo!.source).toBe("seed");
    expect(eo!.options.length).toBeGreaterThanOrEqual(4);
    expect(eo!.options.length).toBeLessThanOrEqual(6);
    // The currently-bound donor is itself one of the choosable options.
    expect(eo!.options.some((o) => o.value.ref?.dcid === "country/FRA")).toBe(
      true,
    );
  });

  it("keeps the donor entity directional/from, matching entity_options.entity_ref", () => {
    const donor = definiteBareSpec.entities.find(
      (e) => e.role.kind === "directional" && e.role.direction === "from",
    );
    expect(donor?.ref.dcid).toBe("country/FRA");
    expect(definiteBareSpec.entity_options?.[0].entity_ref).toBe(
      donor?.ref.dcid,
    );
  });

  it("renders through buildSentenceTokens with an editable donor phrase", () => {
    // The engine contract: buildViewModel(spec, sentence_plan) yields a
    // sentenceTokens donor phrase whose `editable` is gated on entity_options
    // carrying this role (buildSentenceTokens' hasOptions check).
    const vm = buildViewModel(definiteBareSpec, definiteBareSpec.sentence_plan);
    const donorPart = vm.sentenceTokens?.find(
      (p) => p.kind === "slot" && p.role === "from",
    );
    expect(donorPart).toBeDefined();
    expect(donorPart).toMatchObject({
      text: "France",
      entityRef: "country/FRA",
      editable: true,
    });
  });
});
