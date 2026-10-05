// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlacePopover } from "./PlacePopover";
import type {
  Binding,
  PlaceOptionsResponse,
  PlaceOptionsScope,
} from "@/lib/contract/types";

const kenya: Binding = {
  kind: "value",
  value: { value_kind: "entity", ref: { dcid: "country/KEN", label: "Kenya" } },
};

function peers(
  options: { dcid: string; label: string }[],
  complete = true,
): PlaceOptionsResponse {
  return { options, complete };
}

function children(
  options: { dcid: string; label: string }[],
  complete = true,
): PlaceOptionsResponse {
  return { options, complete };
}

function setup(
  resolve: (scope: PlaceOptionsScope) => Promise<PlaceOptionsResponse>,
  extra: Partial<Parameters<typeof PlacePopover>[0]> = {},
) {
  const onApply = vi.fn();
  const onClose = vi.fn();
  const fetchOptions = vi.fn(resolve);
  render(
    <PlacePopover
      label="place"
      currentBinding={kenya}
      fetchOptions={fetchOptions}
      onApply={onApply}
      onClose={onClose}
      {...extra}
    />,
  );
  return { onApply, onClose, fetchOptions };
}

describe("<PlacePopover>", () => {
  it("defaults to peers scope and shows scope toggle tabs", async () => {
    const { fetchOptions } = setup(() =>
      Promise.resolve(peers([{ dcid: "country/NGA", label: "Nigeria" }])),
    );
    await screen.findByRole("checkbox", { name: /^Nigeria/ });
    expect(fetchOptions).toHaveBeenCalledTimes(1);
    expect(fetchOptions).toHaveBeenCalledWith("peers");
    expect(screen.getByRole("tab", { name: "Peers" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Sub-regions" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("renders peers as a select-all + checkbox multi-select, with the current place pre-checked", async () => {
    setup(() =>
      Promise.resolve(
        peers([
          { dcid: "country/NGA", label: "Nigeria" },
          { dcid: "country/ETH", label: "Ethiopia" },
        ]),
      ),
    );
    await screen.findByRole("checkbox", { name: /^Nigeria/ });
    expect(
      screen.getByRole("checkbox", { name: "Select all" }),
    ).toBeInTheDocument();
    // Anchor (Kenya) is prepended and pre-checked; peers exclude the anchor.
    expect(
      (screen.getByRole("checkbox", { name: /^Kenya/ }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      (screen.getByRole("checkbox", { name: /^Nigeria/ }) as HTMLInputElement)
        .checked,
    ).toBe(false);
  });

  it("switches to children scope and fetches sub-regions", async () => {
    const { fetchOptions, onApply } = setup((scope) => {
      if (scope === "peers") {
        return Promise.resolve(
          peers([{ dcid: "country/NGA", label: "Nigeria" }]),
        );
      }
      return Promise.resolve(
        children([
          { dcid: "geoId/40", label: "Nairobi" },
          { dcid: "geoId/41", label: "Mombasa" },
        ]),
      );
    });

    await screen.findByRole("checkbox", { name: /^Nigeria/ });
    expect(fetchOptions).toHaveBeenCalledWith("peers");

    // Click Sub-regions tab
    fireEvent.click(screen.getByRole("tab", { name: "Sub-regions" }));

    await screen.findByRole("checkbox", { name: /^Nairobi/ });
    expect(fetchOptions).toHaveBeenCalledWith("children");
    expect(screen.getByRole("tab", { name: "Sub-regions" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Select Nairobi and Apply
    fireEvent.click(screen.getByRole("checkbox", { name: /^Nairobi/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const binding = onApply.mock.calls[0][0];
    expect(binding.kind).toBe("value");
    expect(binding.value.ref?.dcid).toBe("geoId/40");
    expect(binding.value.ref?.label).toBe("Nairobi");
  });

  it("applies multiple picks as a set of place entities", async () => {
    const { onApply } = setup(() =>
      Promise.resolve(peers([{ dcid: "country/NGA", label: "Nigeria" }])),
    );
    await screen.findByRole("checkbox", { name: /^Nigeria/ });
    fireEvent.click(screen.getByRole("checkbox", { name: /^Nigeria/ })); // + Nigeria (Kenya already checked)
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    const binding = onApply.mock.calls[0][0];
    expect(binding.kind).toBe("set");
    expect(binding.values).toHaveLength(2);
  });

  it("shows a truncation note when the candidate set was capped", async () => {
    setup(() =>
      Promise.resolve(
        peers([{ dcid: "country/NGA", label: "Nigeria" }], false),
      ),
    );
    expect(await screen.findByText(/more may exist/)).toBeInTheDocument();
  });

  it("shows an honest empty state when the anchor has no peer scope", async () => {
    setup(() => Promise.reject({ code: "unsupported_peers_anchor_type" }));
    expect(
      await screen.findByText("No other places with this data."),
    ).toBeInTheDocument();
  });

  it("shows an honest empty state when switching to children scope with unsupported_children_anchor_type", async () => {
    setup((scope) => {
      if (scope === "peers") {
        return Promise.resolve(
          peers([{ dcid: "country/NGA", label: "Nigeria" }]),
        );
      }
      return Promise.reject({ code: "unsupported_children_anchor_type" });
    });

    await screen.findByRole("checkbox", { name: /^Nigeria/ });
    fireEvent.click(screen.getByRole("tab", { name: "Sub-regions" }));

    expect(
      await screen.findByText("No sub-regions with data found."),
    ).toBeInTheDocument();
  });

  it("surfaces a load error", async () => {
    setup(() => Promise.reject(new Error("network down")));
    expect(await screen.findByText("network down")).toBeInTheDocument();
  });

  it("calls onApply with unbound when clicking All places and then Apply", async () => {
    const { onApply } = setup(() =>
      Promise.resolve(peers([{ dcid: "country/NGA", label: "Nigeria" }])),
    );
    await screen.findByRole("checkbox", { name: /^Nigeria/ });

    fireEvent.click(screen.getByRole("button", { name: "All places" }));
    expect(screen.getByRole("button", { name: "All places" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByText(
        "Query across all places without filtering by a specific location.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({ kind: "unbound" });
  });

  it("defaults to All places mode when currentBinding is unbound", () => {
    setup(
      () => Promise.resolve(peers([{ dcid: "country/NGA", label: "Nigeria" }])),
      { currentBinding: { kind: "unbound" } },
    );

    expect(screen.getByRole("button", { name: "All places" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Specific places" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByText(
        "Query across all places without filtering by a specific location.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    // In all places mode, fetchOptions is still triggered for peers in the background by useEffect
  });

  it("switches from All places to Specific places and selects individual places", async () => {
    const { onApply } = setup(
      () => Promise.resolve(peers([{ dcid: "country/NGA", label: "Nigeria" }])),
      { currentBinding: { kind: "unbound" } },
    );

    fireEvent.click(screen.getByRole("button", { name: "Specific places" }));
    expect(
      screen.getByRole("button", { name: "Specific places" }),
    ).toHaveAttribute("aria-pressed", "true");

    await screen.findByRole("checkbox", { name: /^Nigeria/ });
    fireEvent.click(screen.getByRole("checkbox", { name: /^Nigeria/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const binding = onApply.mock.calls[0][0];
    expect(binding.kind).toBe("value");
    expect(binding.value.ref?.dcid).toBe("country/NGA");
    expect(binding.value.ref?.label).toBe("Nigeria");
  });
});
