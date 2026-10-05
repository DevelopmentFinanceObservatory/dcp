// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoDataView } from "./NoDataView";
import { noData, definiteBreadthSpec } from "../../lib/fixtures";
import type { NoData, NoDataPart } from "@/lib/contract/types";

/** noData's own part, with its `no_data` payload replaced. */
function withNoData(no_data: NoData): NoDataPart {
  const part = noData.parts[0];
  if (part.status !== "no_data") throw new Error("expected a no_data part");
  return { ...part, no_data };
}

function noDataPart(): NoDataPart {
  const part = noData.parts[0];
  if (part.status !== "no_data") throw new Error("expected a no_data part");
  return part;
}

describe("<NoDataView>", () => {
  it("states the no-data outcome and the reason", () => {
    render(<NoDataView part={noDataPart()} partIndex={0} />);
    expect(screen.getByText("No data for this query.")).toBeInTheDocument();
    // reason is a closed enum ('entity_not_resolved') rendered as friendly text
    expect(screen.getByText(/couldn't match the place/)).toBeInTheDocument();
  });

  it("offers no alternatives when none are provided", () => {
    render(<NoDataView part={noDataPart()} partIndex={0} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders role_unresolved with its specific text, not the generic fallback", () => {
    const part = withNoData({ reason: "role_unresolved" });
    render(<NoDataView part={part} partIndex={0} />);
    expect(screen.getByText(/donor or recipient/)).toBeInTheDocument();
    expect(screen.queryByText("No data matched this query.")).toBeNull();
  });

  it("renders no_matching_slice distinctly from a measure-not-matched reason", () => {
    const part = withNoData({ reason: "no_matching_slice" });
    render(<NoDataView part={part} partIndex={0} />);
    expect(screen.getByText(/specific combination/)).toBeInTheDocument();
    expect(screen.queryByText(/couldn't match the measure/)).toBeNull();
  });

  it("does not render a flagged-match block when none is offered", () => {
    render(<NoDataView part={noDataPart()} partIndex={0} />);
    expect(screen.queryByText(/We found/)).toBeNull();
  });

  it("reassures with the matched variable when flagged_match is present, distinct from the plain reason", () => {
    const flagged = {
      ...definiteBreadthSpec,
      variable_text: "malaria control ODA grants",
    };
    const part = withNoData({
      reason: "no_observations",
      flagged_match: flagged,
    });
    render(<NoDataView part={part} partIndex={0} />);
    expect(screen.getByText(/Parsed query/)).toBeInTheDocument();
    expect(screen.getByText("malaria control ODA grants")).toBeInTheDocument();
    expect(
      screen.getByText(/This region has no observations./),
    ).toBeInTheDocument();
  });

  it("falls back to the built sentence when flagged_match has no variable_text", () => {
    const part = withNoData({
      reason: "no_observations",
      flagged_match: definiteBreadthSpec,
    });
    render(<NoDataView part={part} partIndex={0} />);
    expect(screen.getByText(/Parsed query/)).toBeInTheDocument();
    expect(screen.getByText(/Ethiopia/)).toBeInTheDocument();
  });

  it("shows flagged_match and nearest_real together as distinct blocks", () => {
    const flagged = {
      ...definiteBreadthSpec,
      variable_text: "malaria control ODA grants",
    };
    const part = withNoData({
      reason: "no_observations",
      flagged_match: flagged,
      nearest_real: [definiteBreadthSpec],
    });
    render(<NoDataView part={part} partIndex={0} />);
    expect(screen.getByText(/Parsed query/)).toBeInTheDocument();
    expect(screen.getByText("Did you mean")).toBeInTheDocument();
  });
});
