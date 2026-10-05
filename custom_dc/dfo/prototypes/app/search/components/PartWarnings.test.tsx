// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PartWarnings } from "./PartWarnings";
import type { Warning } from "@/lib/contract/types";

describe("<PartWarnings>", () => {
  it("renders nothing when there are no binding_folded/observations_omitted warnings", () => {
    const warnings: Warning[] = [
      { code: "variables_clamped", severity: "info", message: "clamped" },
    ];
    const { container } = render(<PartWarnings warnings={warnings} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names the earlier part sharing this part's spec_id when folded", () => {
    const warnings: Warning[] = [
      { code: "binding_folded", severity: "info", message: "folded" },
    ];
    render(
      <PartWarnings warnings={warnings} foldedWithVariableText="population" />,
    );
    expect(screen.getByText(/Same result as/)).toBeInTheDocument();
    expect(screen.getByText(/"?population"?/)).toBeInTheDocument();
  });

  it("falls back to a generic note when the earlier part's variable text is unknown", () => {
    const warnings: Warning[] = [
      { code: "binding_folded", severity: "info", message: "folded" },
    ];
    render(<PartWarnings warnings={warnings} />);
    expect(screen.getByText(/an earlier part/)).toBeInTheDocument();
  });

  it("shows the engine's own observations_omitted message verbatim", () => {
    const warnings: Warning[] = [
      {
        code: "observations_omitted",
        severity: "warn",
        message: "Observations were not fetched for this candidates part.",
      },
    ];
    render(<PartWarnings warnings={warnings} />);
    expect(
      screen.getByText(
        "Observations were not fetched for this candidates part.",
      ),
    ).toBeInTheDocument();
  });

  it("can show both notes together", () => {
    const warnings: Warning[] = [
      { code: "binding_folded", severity: "info", message: "folded" },
      {
        code: "observations_omitted",
        severity: "warn",
        message: "omitted message",
      },
    ];
    render(<PartWarnings warnings={warnings} foldedWithVariableText="GDP" />);
    expect(screen.getByText(/Same result as/)).toBeInTheDocument();
    expect(screen.getByText("omitted message")).toBeInTheDocument();
  });
});
