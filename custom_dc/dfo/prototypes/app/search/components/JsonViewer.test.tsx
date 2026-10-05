// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JsonViewer } from "./JsonViewer";

describe("<JsonViewer>", () => {
  const sampleData = {
    stringKey: "hello world",
    numberKey: 42,
    boolKey: true,
    nullKey: null,
    nested: {
      innerKey: "nested value",
    },
    arrayKey: ["item1", "item2"],
  };

  it("renders JSON keys and values with syntax elements", () => {
    render(<JsonViewer data={sampleData} />);

    expect(screen.getByText(/"stringKey"/)).toBeInTheDocument();
    expect(screen.getByText(/"hello world"/)).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
    expect(screen.getByText(/true/)).toBeInTheDocument();
    expect(screen.getByText("null")).toBeInTheDocument();
  });

  it("toggles between Tree and Raw code views", () => {
    render(<JsonViewer data={sampleData} />);

    const codeButton = screen.getByRole("button", { name: "Raw code" });
    fireEvent.click(codeButton);

    expect(screen.getByText(/hello world/)).toBeInTheDocument();

    const treeButton = screen.getByRole("button", { name: "Tree" });
    fireEvent.click(treeButton);
    expect(screen.getByText(/"stringKey"/)).toBeInTheDocument();
  });

  it("filters keys and values using search input", () => {
    render(<JsonViewer data={sampleData} />);

    const input = screen.getByPlaceholderText("Filter keys or values…");
    fireEvent.change(input, { target: { value: "nested" } });

    expect(screen.getByText(/"nested"/)).toBeInTheDocument();
  });

  it("collapses and expands all nodes", () => {
    render(<JsonViewer data={sampleData} />);

    const collapseButton = screen.getByRole("button", { name: "Collapse all" });
    fireEvent.click(collapseButton);

    expect(
      screen.getByRole("button", { name: "Expand all" }),
    ).toBeInTheDocument();
  });

  it("copies node value on copy button click and handles clipboard errors", () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<JsonViewer data={sampleData} />);

    const copyButtons = screen.getAllByRole("button", { name: "Copy value" });
    expect(copyButtons.length).toBeGreaterThan(0);
    fireEvent.click(copyButtons[0]);

    expect(writeTextMock).toHaveBeenCalled();

    // Rejection handled
    writeTextMock.mockRejectedValueOnce(new Error("denied"));
    fireEvent.click(copyButtons[0]);
  });
});
