// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GroundingCard } from "./GroundingCard";

describe("GroundingCard", () => {
  it("renders tags correctly", () => {
    render(
      <GroundingCard variables={["Var1"]} places={["Place1"]} dates="2020" />,
    );
    expect(screen.getByText("Var1")).toBeInTheDocument();
    expect(screen.getByText("Place1")).toBeInTheDocument();
    expect(screen.getByText("2020")).toBeInTheDocument();
  });

  it("renders null when all fields are empty", () => {
    const { container } = render(<GroundingCard variables={[]} places={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
