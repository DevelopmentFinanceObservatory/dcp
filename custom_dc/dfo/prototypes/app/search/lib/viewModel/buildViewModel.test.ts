import { describe, it, expect } from "vitest";
import { buildViewModel } from "./buildViewModel";
import {
  definiteExactSpec,
  definiteBreadthSpec,
  definiteBareSpec,
  definiteCompareSpec,
} from "../fixtures";

describe("buildViewModel", () => {
  it("projects the definite state and spec_id", () => {
    const vm = buildViewModel(definiteExactSpec);
    expect(vm.state).toBe("definite");
    expect(vm.specId).toBe(definiteExactSpec.spec_id);
  });

  it("omits absent slots from the sentence (women in Kenya)", () => {
    const vm = buildViewModel(definiteExactSpec);
    // gender (value) + place (value); age is absent and must not appear.
    expect(vm.sentence.map((s) => s.text)).toEqual(["female", "Kenya"]);
    expect(vm.sentence.some((s) => s.bindingKind === "absent")).toBe(false);
  });

  it("renders exact coverage as an observation count", () => {
    const vm = buildViewModel(definiteExactSpec);
    expect(vm.coverage.kind).toBe("exact");
    expect(vm.coverage.summary).toBe("14 observations");
    expect(vm.coverage.hasData).toBe(true);
  });

  it("renders breadth coverage and time/unbound phrases (malaria → Ethiopia)", () => {
    const vm = buildViewModel(definiteBreadthSpec);
    expect(vm.coverage.summary).toBe("36 donors · 9 years · 3 methods");
    const texts = vm.sentence.map((s) => s.text);
    expect(texts).toContain("ODA grants");
    expect(texts).toContain("malaria control");
    expect(texts).toContain("Ethiopia");
    expect(texts).toContain("since 2015"); // open, start-only window -- "in" would claim the data stops in 2015
    expect(texts).toContain("all sources"); // source slot is unbound
  });

  it("marks the source phrase non-editable when the spec carries no source slot_options, unlike every other phrase", () => {
    // Sources are a closed set the engine binds itself -- free-typing one is
    // meaningless (see computeAddableDimensions' identical gate in SearchClient.tsx).
    const vm = buildViewModel(definiteBreadthSpec);
    const source = vm.sentence.find((s) => s.axis === "source")!;
    expect(source.text).toBe("all sources");
    expect(source.editable).toBe(false);
    expect(
      vm.sentence.filter((s) => s.axis !== "source").every((s) => s.editable),
    ).toBe(true);
  });

  it("marks the source phrase editable when the spec has no slot_options but 2+ resolved_sources -- a multi-facet answer with something to switch between", () => {
    // definiteBreadthSpec resolves a single source (OECD CRS); override to a
    // multi-facet answer via spread rather than touching the shared fixture.
    const multiSourceSpec = {
      ...definiteBreadthSpec,
      resolution: {
        ...definiteBreadthSpec.resolution,
        resolved_sources: [
          { dcid: "dc/base/OECD_CRS", label: "OECD CRS" },
          {
            dcid: "dc/base/WorldDevelopmentIndicators",
            label: "WorldDevelopmentIndicators",
          },
        ],
      },
    };
    const vm = buildViewModel(multiSourceSpec);
    const source = vm.sentence.find((s) => s.axis === "source")!;
    expect(source.editable).toBe(true);
  });

  it("stays non-editable when the spec has a matching slot_options entry with an empty options array, even with 2+ resolved_sources", () => {
    // Pins the exact-match-wins contract: optionsFromSpec never falls through
    // to the resolved_sources fallback once a key match exists, even an empty
    // one -- so this gate, which delegates to optionsFromSpec, must not either.
    const sourceSlotKey = definiteBreadthSpec.slots.find(
      (s) => s.key.axis === "source",
    )!.key;
    const emptyOptionsSpec = {
      ...definiteBreadthSpec,
      slot_options: [
        {
          key: sourceSlotKey,
          options: [],
          complete: true,
          source: "seed" as const,
        },
      ],
      resolution: {
        ...definiteBreadthSpec.resolution,
        resolved_sources: [
          { dcid: "dc/base/OECD_CRS", label: "OECD CRS" },
          {
            dcid: "dc/base/WorldDevelopmentIndicators",
            label: "WorldDevelopmentIndicators",
          },
        ],
      },
    };
    const vm = buildViewModel(emptyOptionsSpec);
    const source = vm.sentence.find((s) => s.axis === "source")!;
    expect(source.editable).toBe(false);
  });

  it("humanises a bound source slot value in the sentence, the same way the engine renders it", () => {
    const boundSourceSpec = {
      ...definiteBreadthSpec,
      slots: definiteBreadthSpec.slots.map((s) =>
        s.key.axis === "source"
          ? {
              ...s,
              binding: {
                kind: "value" as const,
                value: {
                  value_kind: "source" as const,
                  ref: { dcid: "dc/base/Kenya_Census", label: "Kenya_Census" },
                },
              },
            }
          : s,
      ),
    };
    const vm = buildViewModel(boundSourceSpec);
    const source = vm.sentence.find((s) => s.axis === "source")!;
    expect(source.text).toBe("Kenya Census");
  });

  it("renders bare coverage and unbound how/when phrases (ODA from France)", () => {
    const vm = buildViewModel(definiteBareSpec);
    expect(vm.coverage.kind).toBe("bare");
    expect(vm.coverage.summary).toBe("not counted");
    expect(vm.coverage.hasData).toBe(false);
    const texts = vm.sentence.map((s) => s.text);
    expect(texts).toContain("all purposes"); // how unbound
    expect(texts).toContain("all years"); // when unbound (axis-aware)
  });

  it("exposes the resolution trace in the inspector projection", () => {
    const vm = buildViewModel(definiteBreadthSpec);
    expect(vm.inspector.statVars.length).toBeGreaterThan(0);
    expect(vm.inspector.sources[0]?.dcid).toBe("dc/base/OECD_CRS");
    expect(vm.inspector.steps.filter((s) => s.ran).length).toBe(6);
  });

  it('renders an ad-hoc multi-select set compactly ("first +N")', () => {
    const setSpec = {
      ...definiteExactSpec,
      slots: definiteExactSpec.slots.map((s) =>
        s.key.axis === "where"
          ? {
              ...s,
              binding: {
                kind: "set" as const,
                values: [
                  {
                    value_kind: "entity" as const,
                    ref: { dcid: "country/KEN", label: "Kenya" },
                  },
                  {
                    value_kind: "entity" as const,
                    ref: { dcid: "country/ETH", label: "Ethiopia" },
                  },
                  {
                    value_kind: "entity" as const,
                    ref: { dcid: "country/NGA", label: "Nigeria" },
                  },
                ],
              },
            }
          : s,
      ),
    };
    const vm = buildViewModel(setSpec);
    expect(vm.sentence.some((p) => p.text === "Kenya +2")).toBe(true);
  });

  it("builds one table row per (stat_var, entity) pair, latest point from Spec.observations", () => {
    const vm = buildViewModel(definiteCompareSpec);
    expect(vm.table.rows).toHaveLength(2); // one stat_var × two compared entities
    const kenyaRow = vm.table.rows.find((r) => r.entity === "Kenya");
    const nigeriaRow = vm.table.rows.find((r) => r.entity === "Nigeria");
    expect(kenyaRow).toMatchObject({
      variable: "Count of female persons",
      date: "2023",
    });
    expect(kenyaRow!.value).toBe((28_300_000).toLocaleString());
    expect(kenyaRow!.obsCount).toBe(4);
    expect(nigeriaRow!.value).toBe((109_600_000).toLocaleString());
  });

  it("renders a null-value, em-dash-ready row when a variable has no matching observation series", () => {
    const specWithoutObservations = {
      ...definiteExactSpec,
      observations: undefined,
    };
    const vm = buildViewModel(specWithoutObservations);
    expect(vm.table.rows).toEqual([
      {
        variable: "Count of female persons",
        entity: "Kenya",
        value: null,
        date: null,
        obsCount: 0,
      },
    ]);
  });

  it("still emits one row per variable when the where-slot is unbound (no entities)", () => {
    const specWithNoEntities = {
      ...definiteExactSpec,
      entities: [],
      observations: undefined,
    };
    const vm = buildViewModel(specWithNoEntities);
    expect(vm.table.rows).toEqual([
      {
        variable: "Count of female persons",
        entity: "",
        value: null,
        date: null,
        obsCount: 0,
      },
    ]);
  });

  it("renders a donor-keyed series (entity_dcid absent from Spec.entities) as a labeled row via entity_label", () => {
    // malaria grants to Ethiopia: the series is keyed by the donor (USA), not
    // the recipient (Ethiopia) that Spec.entities carries.
    const vm = buildViewModel(definiteBreadthSpec);
    expect(vm.table.rows).toHaveLength(1);
    expect(vm.table.rows[0]).toMatchObject({
      entity: "United States",
      date: "2024",
    });
    expect(vm.table.rows[0].value).toBe(
      (24_607_887.18).toLocaleString(undefined, { maximumFractionDigits: 2 }),
    );
    expect(vm.table.rows[0].obsCount).toBe(5);
  });

  it("falls back to the dcid tail when a donor-keyed series carries no entity_label", () => {
    const specWithoutLabel = {
      ...definiteBreadthSpec,
      observations: {
        ...definiteBreadthSpec.observations!,
        series: definiteBreadthSpec.observations!.series.map((s) => ({
          ...s,
          entity_label: undefined,
        })),
      },
    };
    const vm = buildViewModel(specWithoutLabel);
    expect(vm.table.rows[0].entity).toBe("USA");
  });

  it("falls back to em-dash rows for a stat_var with zero matching series when observations exist for another stat_var", () => {
    const extraSv = {
      ...definiteBreadthSpec.stat_vars[0],
      ref: { dcid: "no/series/here", label: "No data variable" },
    };
    const specWithExtraSv = {
      ...definiteBreadthSpec,
      stat_vars: [...definiteBreadthSpec.stat_vars, extraSv],
    };
    const vm = buildViewModel(specWithExtraSv);
    expect(vm.table.rows).toHaveLength(2); // one series row + one em-dash row
    const emptyRow = vm.table.rows.find(
      (r) => r.variable === "No data variable",
    );
    expect(emptyRow).toMatchObject({
      entity: "Ethiopia",
      value: null,
      date: null,
      obsCount: 0,
    });
  });
});
