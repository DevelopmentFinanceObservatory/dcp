// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingSkeleton } from "./LoadingSkeleton";

describe("<LoadingSkeleton>", () => {
  it("announces a busy status with a generic line when no variables are known yet", () => {
    render(<LoadingSkeleton />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Finding what you asked for…")).toBeInTheDocument();
  });

  it("names a single expected variable", () => {
    render(
      <LoadingSkeleton
        expectedParts={[{ index: 0, variableText: "population" }]}
      />,
    );
    expect(screen.getByText("Finding population…")).toBeInTheDocument();
  });

  it("joins two or more expected variables with 'and'", () => {
    render(
      <LoadingSkeleton
        expectedParts={[
          { index: 0, variableText: "population" },
          { index: 1, variableText: "GDP" },
        ]}
      />,
    );
    expect(screen.getByText("Finding population and GDP…")).toBeInTheDocument();
  });

  it("skips a row whose name hasn't streamed in yet", () => {
    render(
      <LoadingSkeleton
        expectedParts={[
          { index: 0, variableText: "population" },
          { index: 1, variableText: null },
        ]}
      />,
    );
    expect(screen.getByText("Finding population…")).toBeInTheDocument();
  });
});
