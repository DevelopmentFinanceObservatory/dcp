// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DebugPanel } from "./DebugPanel";
import type { ResolveResponse, Spec } from "@/lib/contract/types";

const response: ResolveResponse = {
  schema_version: "1.0",
  status: "definite",
  parts: [
    {
      status: "definite",
      variable_text: "x",
      warnings: [],
      timing_ms: null,
      rendered_sentence: null,
      sentence_plan: null,
      spec: { spec_id: "spec_abc" } as Spec,
    },
  ],
  query_echo: {
    entry_path: "raw_text",
    variable_text: ["x"],
    extract_skipped: false,
  },
  diagnostics: { engine_build: "test", warnings: [] },
};

describe("<DebugPanel>", () => {
  it("renders the raw response JSON and any extra client state", () => {
    render(
      <DebugPanel
        response={response}
        extra={{
          status: "definite",
          telemetry: { elapsedMs: 120, timedOut: false },
          warnings: [{ code: "W1", severity: "warn", message: "Test warning" }],
        }}
      />,
    );
    expect(screen.getByText(/spec_abc/)).toBeInTheDocument();
    expect(screen.getByText(/"client"/)).toBeInTheDocument();
    expect(screen.getByText(/Test warning/)).toBeInTheDocument();
  });

  it("copies the payload to the clipboard", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<DebugPanel response={response} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy JSON" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("spec_abc"));
  });
});
