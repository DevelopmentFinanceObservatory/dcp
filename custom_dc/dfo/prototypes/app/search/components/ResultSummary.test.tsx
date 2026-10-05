// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResultSummary } from "./ResultSummary";
import { buildViewModel } from "../lib/viewModel";
import { definiteBreadthSpec } from "../lib/fixtures";

const vm = buildViewModel(definiteBreadthSpec);

describe("<ResultSummary>", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("shows the plain-language interpretation by default, DC dcids in the disclosure", () => {
    render(
      <ResultSummary interpretation={vm.interpretation} trace={vm.inspector} />,
    );
    expect(screen.getByText(/How this was answered/)).toBeInTheDocument();
    expect(screen.getByText("Data shape")).toBeInTheDocument();
    // graph identifier lives inside the "Data Commons details" disclosure
    expect(screen.getByText("Data Commons details")).toBeInTheDocument();
    expect(screen.getByText("dc/base/OECD_CRS")).toBeInTheDocument();
  });

  it('does not render "Start over" inside the disclosure', () => {
    render(
      <ResultSummary interpretation={vm.interpretation} trace={vm.inspector} />,
    );
    expect(screen.queryByRole("button", { name: /start over/i })).toBeNull();
  });

  it("renders warning banner when warnings with warn or degraded severity are provided", () => {
    render(
      <ResultSummary
        interpretation={vm.interpretation}
        trace={vm.inspector}
        warnings={[
          {
            code: "DATE_COVERAGE_PARTIAL",
            severity: "warn",
            message: "Data only available for 2015-2020",
          },
        ]}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Partial coverage")).toBeInTheDocument();
    expect(
      screen.getByText("Data only available for 2015-2020"),
    ).toBeInTheDocument();
  });

  it("renders degraded banner when warnings include degraded severity", () => {
    render(
      <ResultSummary
        interpretation={vm.interpretation}
        trace={vm.inspector}
        warnings={[
          {
            code: "ESTIMATED_VALUES",
            severity: "degraded",
            message: "Values are estimated",
          },
        ]}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Degraded result")).toBeInTheDocument();
    expect(screen.getByText("Values are estimated")).toBeInTheDocument();
  });

  it("renders spec_id with Copy permalink action when specId is provided", async () => {
    render(
      <ResultSummary
        interpretation={vm.interpretation}
        trace={vm.inspector}
        specId="spec_breadth_test_123"
      />,
    );

    expect(screen.getByText("Spec ID")).toBeInTheDocument();
    expect(screen.getByText("spec_breadth_test_123")).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", { name: "Copy spec ID" });
    expect(copyBtn).toHaveTextContent("Copy");

    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("spec_breadth_test_123");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Copy spec ID" }),
      ).toHaveTextContent("Copied!");
    });
  });
});
