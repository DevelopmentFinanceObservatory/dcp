// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PhrasePopover } from "./PhrasePopover";
import { fixtureOptions } from "../lib/taxonomy";
import type { SlotOption } from "../lib/taxonomy";
import { definiteBreadthSpec } from "../lib/fixtures";

const whereSlot = definiteBreadthSpec.slots.find(
  (s) => s.key.axis === "where",
)!;
const options = fixtureOptions.optionsFor(
  definiteBreadthSpec.shape.shape_id,
  whereSlot.key,
);

function setup(extra: Partial<Parameters<typeof PhrasePopover>[0]> = {}) {
  const onApply = vi.fn();
  const onClose = vi.fn();
  render(
    <PhrasePopover
      label="recipient"
      options={options}
      onApply={onApply}
      onClose={onClose}
      {...extra}
    />,
  );
  return { onApply, onClose };
}

describe("<PhrasePopover>", () => {
  it("lists value options as checkboxes with observation counts", () => {
    setup();
    expect(
      screen.getByRole("dialog", { name: "Edit recipient" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /^Kenya/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("205 obs")).toBeInTheDocument();
    // the unbound "all recipients" option is not a checkbox; select-all covers it
    expect(
      screen.queryByRole("checkbox", { name: /all recipients/ }),
    ).toBeNull();
  });

  it("applies a single selection as a value binding", () => {
    const { onApply } = setup();
    fireEvent.click(screen.getByRole("checkbox", { name: /^Kenya/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply.mock.calls[0][0]).toMatchObject({ kind: "value" });
  });

  it("applies two selections (of several) as a set binding", () => {
    const { onApply } = setup();
    fireEvent.click(screen.getByRole("checkbox", { name: /^Ethiopia/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^Kenya/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    const binding = onApply.mock.calls[0][0];
    expect(binding.kind).toBe("set");
    expect(binding.values).toHaveLength(2);
  });

  it("select-all then Apply commits a set of all values so the chip stays", () => {
    const { onApply } = setup();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    const binding = onApply.mock.calls[0][0];
    // A set of every value ensures the phrase remains in the sentence and editable.
    expect(binding.kind).toBe("set");
    const valueCount = options.filter((o) => o.binding.kind === "value").length;
    expect(binding.values).toHaveLength(valueCount);
  });

  it("clicking All [label]s calls onApply with unbound directly", () => {
    const { onApply } = setup();
    fireEvent.click(screen.getByRole("button", { name: "All recipients" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({ kind: "unbound" });
  });

  it("styles All [label]s button as active when opened with currentBinding unbound", () => {
    setup({ currentBinding: { kind: "unbound" } });
    const unboundButton = screen.getByRole("button", {
      name: "All recipients",
    });
    expect(unboundButton.className).toContain("bg-g6");
    expect(unboundButton.className).toContain("text-white");
  });

  it("filters the option list", () => {
    setup();
    fireEvent.change(screen.getByRole("textbox", { name: "Filter options" }), {
      target: { value: "keny" },
    });
    expect(
      screen.getByRole("checkbox", { name: /^Kenya/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /^Ethiopia/ })).toBeNull();
  });

  it("pre-checks options from the current binding", () => {
    setup({
      currentBinding: {
        kind: "value",
        value: {
          value_kind: "entity",
          ref: { dcid: "country/KEN", label: "Kenya" },
        },
      },
    });
    expect(
      (screen.getByRole("checkbox", { name: /^Kenya/ }) as HTMLInputElement)
        .checked,
    ).toBe(true);
  });

  it("disables Apply until something is selected", () => {
    setup();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("closes from the close control", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("<PhrasePopover> free-text refine", () => {
  it("omits the refine field entirely when onRefine is not passed (back-compat)", () => {
    setup();
    expect(
      screen.queryByPlaceholderText(/search for something different/i),
    ).toBeNull();
  });

  it("renders the refine field under the option list, not auto-focused (the filter keeps focus)", () => {
    const onRefine = vi.fn();
    setup({ onRefine });
    const field = screen.getByRole("textbox", {
      name: "Search for something different",
    });
    expect(field).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Filter options" }),
    ).toHaveFocus();
  });

  it("Enter with typed text calls onRefine with the trimmed text", () => {
    const onRefine = vi.fn();
    setup({ onRefine });
    const field = screen.getByRole("textbox", {
      name: "Search for something different",
    });
    fireEvent.change(field, { target: { value: "  droughts  " } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onRefine).toHaveBeenCalledWith("droughts");
  });

  it("Enter with empty/whitespace-only text is a no-op", () => {
    const onRefine = vi.fn();
    setup({ onRefine });
    const field = screen.getByRole("textbox", {
      name: "Search for something different",
    });
    fireEvent.change(field, { target: { value: "   " } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onRefine).not.toHaveBeenCalled();
  });

  it("ArrowDown while typing in the refine field does not steal focus to a checkbox", () => {
    const onRefine = vi.fn();
    setup({ onRefine });
    const field = screen.getByRole("textbox", {
      name: "Search for something different",
    });
    field.focus();
    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(field).toHaveFocus();
  });

  it("Escape from the refine field still closes the popover", () => {
    const onRefine = vi.fn();
    const { onClose } = setup({ onRefine });
    const field = screen.getByRole("textbox", {
      name: "Search for something different",
    });
    fireEvent.keyDown(field, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("no options + onRefine: the field replaces the dead-end text and is auto-focused, with a hint", () => {
    const onRefine = vi.fn();
    render(
      <PhrasePopover
        label="recipient"
        options={[]}
        onApply={vi.fn()}
        onClose={vi.fn()}
        onRefine={onRefine}
      />,
    );
    expect(
      screen.queryByText("No options available for this phrase."),
    ).toBeNull();
    const field = screen.getByRole("textbox", {
      name: "Search for something different",
    });
    expect(field).toHaveFocus();
    expect(
      screen.getByText(/to run a new search keeping the rest of the sentence/i),
    ).toBeInTheDocument();
  });

  it("no options + no onRefine: keeps the plain dead-end text (back-compat)", () => {
    render(
      <PhrasePopover
        label="recipient"
        options={[]}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByText("No options available for this phrase."),
    ).toBeInTheDocument();
  });

  it("Search button is disabled until text is typed, and clicking it calls onRefine with the trimmed text", () => {
    const onRefine = vi.fn();
    setup({ onRefine });
    const field = screen.getByRole("textbox", {
      name: "Search for something different",
    });
    const search = screen.getByRole("button", { name: "Search" });
    expect(search).toBeDisabled();
    fireEvent.change(field, { target: { value: "  droughts  " } });
    expect(search).toBeEnabled();
    fireEvent.click(search);
    expect(onRefine).toHaveBeenCalledWith("droughts");
  });

  it("no options: renders no Apply button (nothing to select), only the refine field's Search", () => {
    const onRefine = vi.fn();
    render(
      <PhrasePopover
        label="recipient"
        options={[]}
        onApply={vi.fn()}
        onClose={vi.fn()}
        onRefine={onRefine}
      />,
    );
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  it("with options: renders both Apply (selection) and Search (refine), and Apply still commits selections", () => {
    const onApply = vi.fn();
    const onRefine = vi.fn();
    setup({ onApply, onRefine });
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /^Kenya/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply.mock.calls[0][0]).toMatchObject({ kind: "value" });
    expect(onRefine).not.toHaveBeenCalled();
  });
});

// The source picker (see optionsFromSpec's resolved_sources fallback and
// SearchClient's source-axis onRefine gate): options with no count/coverage
// at all, representing a closed set the caller never wires onRefine for.
describe("<PhrasePopover> source picker shape (no onRefine, no coverage)", () => {
  const sourceOptions: SlotOption[] = [
    {
      label: "World Development Indicators",
      binding: {
        kind: "value",
        value: {
          value_kind: "source",
          ref: {
            dcid: "dc/base/WorldDevelopmentIndicators",
            label: "WorldDevelopmentIndicators",
          },
        },
      },
    },
    {
      label: "Kenya Census",
      binding: {
        kind: "value",
        value: {
          value_kind: "source",
          ref: { dcid: "dc/base/Kenya_Census", label: "Kenya_Census" },
        },
      },
    },
  ];

  it("renders the checkbox list + Apply, with no free-text field, when the caller omits onRefine", () => {
    render(
      <PhrasePopover
        label="source"
        options={sourceOptions}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: "World Development Indicators" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Kenya Census" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/search for something different/i),
    ).toBeNull();
  });

  it("applies a single source selection as a value binding", () => {
    const onApply = vi.fn();
    render(
      <PhrasePopover
        label="source"
        options={sourceOptions}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Kenya Census" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply.mock.calls[0][0]).toMatchObject({
      kind: "value",
      value: { value_kind: "source", ref: { dcid: "dc/base/Kenya_Census" } },
    });
  });
});

// A breadth/bare probed-zero option carries no flattened `count` at all
// (only `coverage.has_data: false`); it must still be detected as no-data and
// rendered uncheckable, rather than shown as if it were never probed.
describe("<PhrasePopover> no-data options are uncheckable", () => {
  function opt(
    label: string,
    dcid: string,
    coverage?: SlotOption["coverage"],
  ): SlotOption {
    return {
      label,
      binding: {
        kind: "value",
        value: { value_kind: "entity", ref: { dcid, label } },
      },
      coverage,
    };
  }

  it("disables a breadth probed-zero option even though it has no count", () => {
    const options: SlotOption[] = [
      opt("Kenya", "country/KEN", {
        kind: "exact",
        has_data: true,
        observation_count: 205,
      }),
      opt("Somalia", "country/SOM", {
        kind: "breadth",
        has_data: false,
        dimensions: [{ label: "donors", count: 0 }],
      }),
    ];
    render(
      <PhrasePopover
        label="recipient"
        options={options}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox", { name: /^Kenya/ })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: /^Somalia/ })).toBeDisabled();
    // No separate disclosure section any more.
    expect(screen.queryByText(/with no data for this slice/)).toBeNull();
  });

  it("disables a bare probed-zero option even though it has no count", () => {
    const options: SlotOption[] = [
      opt("Kenya", "country/KEN", {
        kind: "exact",
        has_data: true,
        observation_count: 205,
      }),
      opt("Somalia", "country/SOM", { kind: "bare", has_data: false }),
    ];
    render(
      <PhrasePopover
        label="recipient"
        options={options}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox", { name: /^Somalia/ })).toBeDisabled();
  });

  it("ranks data options before no-data ones, and by richness within data", () => {
    const options: SlotOption[] = [
      opt("Somalia", "country/SOM", { kind: "bare", has_data: false }),
      opt("Ethiopia", "country/ETH", {
        kind: "breadth",
        has_data: true,
        dimensions: [{ label: "donors", count: 4 }],
      }),
      opt("Kenya", "country/KEN", {
        kind: "breadth",
        has_data: true,
        dimensions: [{ label: "donors", count: 12 }],
      }),
    ];
    render(
      <PhrasePopover
        label="recipient"
        options={options}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const checkboxes = screen
      .getAllByRole("checkbox")
      .filter((el) => el.getAttribute("aria-label") !== "Select all");
    expect(
      checkboxes.map((el) =>
        el
          .closest("label")
          ?.textContent?.replace(/\s*\(no reported data\)/, ""),
      ),
    ).toEqual(["Kenya", "Ethiopia", "Somalia"]);
  });

  it('always shows a plain "Select all" label (no demoted-count parenthetical)', () => {
    const options: SlotOption[] = [
      opt("Kenya", "country/KEN", {
        kind: "exact",
        has_data: true,
        observation_count: 205,
      }),
      opt("Somalia", "country/SOM", { kind: "bare", has_data: false }),
    ];
    render(
      <PhrasePopover
        label="recipient"
        options={options}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Select all")).toBeInTheDocument();
    expect(screen.queryByText(/incl\. .* with no data/)).toBeNull();
  });

  it('excludes a no-data option from "Select all"', () => {
    const onApply = vi.fn();
    const options: SlotOption[] = [
      opt("Kenya", "country/KEN", {
        kind: "exact",
        has_data: true,
        observation_count: 205,
      }),
      opt("Somalia", "country/SOM", { kind: "bare", has_data: false }),
    ];
    render(
      <PhrasePopover
        label="recipient"
        options={options}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    // Only Kenya (the data-bearing option) gets selected → a single value, never a
    // set/unbound that would smuggle in Somalia.
    expect(onApply.mock.calls[0][0]).toMatchObject({
      kind: "value",
      value: { value_kind: "entity", ref: { dcid: "country/KEN" } },
    });
  });

  // Muted rows otherwise rely on color alone, which does not carry to screen-reader
  // users. Each no-data row gets a visually-hidden reason suffix.
  it("adds a screen-reader-only reason suffix to no-data rows only", () => {
    const options: SlotOption[] = [
      opt("Kenya", "country/KEN", {
        kind: "exact",
        has_data: true,
        observation_count: 205,
      }),
      opt("Somalia", "country/SOM", {
        kind: "breadth",
        has_data: false,
        dimensions: [{ label: "donors", count: 0 }],
      }),
    ];
    render(
      <PhrasePopover
        label="recipient"
        options={options}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const somalia = screen.getByRole("checkbox", { name: /^Somalia/ });
    expect(somalia.closest("li")?.textContent).toContain("no reported data");
    const kenya = screen.getByRole("checkbox", { name: /^Kenya/ });
    expect(kenya.closest("li")?.textContent).not.toContain("no reported data");
  });
});
