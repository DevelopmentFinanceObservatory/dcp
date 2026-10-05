// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataPreview } from "./DataPreview";
import {
  definiteExactSpec,
  definiteBreadthSpec,
  definiteCompareSpec,
} from "../lib/fixtures";
import type { Spec, SpecObservations, StatVar } from "@/lib/contract/types";

function spec(statVars: StatVar[], observations?: SpecObservations): Spec {
  return {
    spec_id: "s1",
    shape: {
      shape_id: "sh",
      label: "people",
      population_type: null,
      measured_property: null,
      stat_type: null,
      slot_keys: [],
      member_count: 1,
    },
    slots: [],
    stat_vars: statVars,
    entities: [],
    coverage: { kind: "exact", has_data: true, observation_count: 205 },
    resolution: {
      resolved_stat_vars: [],
      resolved_entities: [],
      resolved_sources: [],
      slot_filters: [],
      pipeline_trace: [],
    },
    ...(observations ? { observations } : {}),
  } as Spec;
}

const sv = (over: Partial<StatVar> = {}): StatVar => ({
  ref: { dcid: "sv/women", label: "Women" },
  shape_id: "sh",
  slot_values: [],
  ...over,
});

describe("<DataPreview>", () => {
  it("renders nothing when no part carries an observation series", () => {
    const { container } = render(
      <DataPreview parts={[{ spec: spec([sv()]), label: "Women" }]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when observations is present but its series list is empty", () => {
    const { container } = render(
      <DataPreview
        parts={[
          {
            spec: spec([sv()], { series: [], total_obs: 0, complete: true }),
            label: "Women",
          },
        ]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there are no resolved variables", () => {
    const { container } = render(
      <DataPreview parts={[{ spec: spec([]), label: "Women" }]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders RecentValues instead of DataTable for a single-part, single-series, multi-point spec", () => {
    render(
      <DataPreview parts={[{ spec: definiteExactSpec, label: "Women" }]} />,
    );
    expect(screen.getByText("2023")).toBeInTheDocument(); // newest point, shown first
    expect(screen.getByText((28_300_000).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
    expect(screen.queryByText("Variable")).not.toBeInTheDocument(); // DataTable header, not RecentValues'
  });

  it("shows a truncation note when the series ships fewer points than total_obs (definite-breadth: 5 of 270)", () => {
    render(
      <DataPreview parts={[{ spec: definiteBreadthSpec, label: "ODA" }]} />,
    );
    expect(
      screen.getByText("Showing latest 5 of 270 observations"),
    ).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument(); // newest shipped point, shown first
  });

  it("falls back to DataTable, with the Variable column hidden, for a single-part, single-series spec with exactly one point", () => {
    const onePointSpec = spec([sv()], {
      series: [
        {
          stat_var_dcid: "sv/women",
          entity_dcid: "country/KEN",
          entity_label: "Kenya",
          points: [{ date: "2023", value: 100 }],
          source_refs: [],
        },
      ],
      total_obs: 1,
      complete: true,
    });
    render(<DataPreview parts={[{ spec: onePointSpec, label: "Women" }]} />);
    expect(screen.queryByText("Variable")).not.toBeInTheDocument(); // hidden for a single part
    expect(screen.getByText("Kenya")).toBeInTheDocument();
    expect(screen.queryByText(/Showing latest/)).not.toBeInTheDocument();
  });

  it("renders one row per compared entity for a single-part, multi-entity spec — unaffected by RecentValues", () => {
    render(
      <DataPreview parts={[{ spec: definiteCompareSpec, label: "Women" }]} />,
    );
    expect(screen.getByText("Kenya")).toBeInTheDocument();
    expect(screen.getByText("Nigeria")).toBeInTheDocument();
    expect(screen.queryByText("Variable")).not.toBeInTheDocument(); // still one part, column hidden
  });

  it("unions rows across parts with a leading Variable column and a per-variable row-count caption", () => {
    const onePointSpec = (label: string, dcid: string) =>
      spec([sv({ ref: { dcid, label } })], {
        series: [
          {
            stat_var_dcid: dcid,
            entity_dcid: "country/BRA",
            entity_label: "Brazil",
            points: [{ date: "2023", value: 100 }],
            source_refs: [],
          },
        ],
        total_obs: 1,
        complete: true,
      });
    render(
      <DataPreview
        parts={[
          {
            spec: onePointSpec("Total population", "Count_Person"),
            label: "Total population",
          },
          {
            spec: onePointSpec(
              "GDP",
              "Amount_EconomicActivity_GrossDomesticProduction",
            ),
            label: "GDP",
          },
        ]}
      />,
    );
    expect(screen.getByText("Variable")).toBeInTheDocument();
    expect(screen.getByText("Total population")).toBeInTheDocument();
    expect(screen.getByText("GDP")).toBeInTheDocument();
    expect(
      screen.getByText("1 row for Total population, 1 row for GDP"),
    ).toBeInTheDocument();
  });

  it("still renders a part's own rows (em-dash pair) when a sibling part has no observations", () => {
    const withData = spec(
      [sv({ ref: { dcid: "Count_Person", label: "Total population" } })],
      {
        series: [
          {
            stat_var_dcid: "Count_Person",
            entity_dcid: "country/BRA",
            entity_label: "Brazil",
            points: [{ date: "2023", value: 100 }],
            source_refs: [],
          },
        ],
        total_obs: 1,
        complete: true,
      },
    );
    const noData = spec([sv({ ref: { dcid: "gdp", label: "GDP" } })]);
    render(
      <DataPreview
        parts={[
          { spec: withData, label: "Total population" },
          { spec: noData, label: "GDP" },
        ]}
      />,
    );
    expect(screen.getByText("Brazil")).toBeInTheDocument();
  });
});
