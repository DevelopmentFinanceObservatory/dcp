// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import SimilarityClient from "./SimilarityClient";

const mockSimilarityResponse = {
  query: "female life expectancy in Kenya",
  model: "gemini-embedding-001",
  dimensions: 768,
  taskType: "RETRIEVAL_QUERY",
  latencyMs: 14,
  primaryScore: 0.7842,
  primaryDistance: 0.2158,
  primaryTier: "strong",
  primaryTierLabel: "Strong Match",
  primaryDescription:
    "Score ≥ 0.75: High confidence for definite slot binding.",
  isAmbiguous: false,
  ambiguityMargin: 0.025,
  candidates: [
    {
      text: "Female Life Expectancy",
      score: 0.7842,
      distance: 0.2158,
      tier: "strong",
      tierLabel: "Strong Match",
      description: "Score ≥ 0.75: High confidence for definite slot binding.",
      deltaToNext: 0.125,
      rank: 1,
    },
    {
      text: "Life Expectancy",
      score: 0.6592,
      distance: 0.3408,
      tier: "candidate",
      tierLabel: "Candidate Match",
      description: "Score 0.65–0.749: Above DFO recall floor.",
      deltaToNext: null,
      rank: 2,
    },
  ],
  vectorPreview: {
    queryVectorPreview: [
      0.035, -0.012, 0.044, 0.019, -0.051, 0.022, -0.008, 0.015,
    ],
    targetVectorPreview: [
      0.038, -0.009, 0.041, 0.021, -0.048, 0.019, -0.006, 0.017,
    ],
    queryNorm: 1.0,
    targetNorm: 1.0,
  },
  source: "deterministic_projection",
};

function renderWithMock(
  response: unknown = mockSimilarityResponse,
  ok = true,
  status = 200,
) {
  const mock = vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(response),
    }),
  );
  global.fetch = mock as unknown as typeof fetch;
  globalThis.fetch = mock as unknown as typeof fetch;
  if (typeof window !== "undefined") {
    window.fetch = mock as unknown as typeof fetch;
  }
  const view = render(<SimilarityClient />);
  return { ...view, mock };
}

/** Parses the JSON body of a mocked fetch call so tests can assert on the
 *  actual outgoing request, not just what the UI renders back. */
function requestBodyFromCall(mock: ReturnType<typeof vi.fn>, callIndex = 0) {
  const [, init] = mock.mock.calls[callIndex];
  return JSON.parse(init.body as string);
}

describe("<SimilarityClient />", () => {
  it("renders page header, model descriptor, and input fields", async () => {
    renderWithMock();

    expect(screen.getByText(/Vector Similarity Tester/i)).toBeInTheDocument();
    expect(
      screen.getByText(/gemini-embedding-001 · 768d/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/String A · Natural Language Query/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/String B · Target StatVar Name/i),
    ).toBeInTheDocument();

    expect(await screen.findByText(/Similarity Result/i)).toBeInTheDocument();
  });

  it("loads and displays similarity score and gauge", async () => {
    renderWithMock();

    expect(await screen.findByText(/Similarity Result/i)).toBeInTheDocument();
    const scores = await screen.findAllByText("0.7842");
    expect(scores.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("(78.4%)")).toBeInTheDocument();
    expect(screen.getAllByText("Strong Match")[0]).toBeInTheDocument();
    // Gauge: threshold labels render, and the cursor sits at the score position.
    expect(screen.getByText("0.50 (Spanner Floor)")).toBeInTheDocument();
    expect(screen.getByText("0.75 (Definite)")).toBeInTheDocument();
  });

  it("swaps input strings", async () => {
    renderWithMock();

    expect(await screen.findByText(/Similarity Result/i)).toBeInTheDocument();

    const inputA = screen.getByLabelText(
      /String A · Natural Language Query/i,
    ) as HTMLTextAreaElement;
    const inputB = screen.getByLabelText(
      /String B · Target StatVar Name/i,
    ) as HTMLTextAreaElement;

    const valA = inputA.value;
    const valB = inputB.value;

    const swapBtn = screen.getByTitle(/Swap input strings/i);
    fireEvent.click(swapBtn);

    expect(inputA.value).toBe(valB);
    expect(inputB.value).toBe(valA);
  });

  it("applies preset pair when clicked", async () => {
    renderWithMock();

    expect(await screen.findByText(/Similarity Result/i)).toBeInTheDocument();

    const presetBtn = screen.getByText("Health ODA");
    fireEvent.click(presetBtn);

    const inputA = screen.getByLabelText(
      /String A · Natural Language Query/i,
    ) as HTMLTextAreaElement;
    const inputB = screen.getByLabelText(
      /String B · Target StatVar Name/i,
    ) as HTMLTextAreaElement;

    expect(inputA.value).toBe("aid for medical research and basic health");
    expect(inputB.value).toBe(
      "Total official development assistance to medical research and basic health sectors, gross disbursement",
    );
  });

  it("switches to batch candidates mode and displays leaderboard", async () => {
    renderWithMock();

    expect(await screen.findByText(/Similarity Result/i)).toBeInTheDocument();

    const batchTab = screen.getByText("Batch Candidates");
    fireEvent.click(batchTab);

    expect(
      screen.getByLabelText(/Candidate StatVar Names \(one per line\)/i),
    ).toBeInTheDocument();

    const computeBtn = screen.getByRole("button", {
      name: /Compute Similarity/i,
    });
    fireEvent.click(computeBtn);

    expect(await screen.findByText(/Ranked Candidates/i)).toBeInTheDocument();
    // Scoped to the leaderboard table: "Life Expectancy" alone also
    // appears as a preset button label elsewhere on the page.
    const table = within(screen.getByRole("table"));
    expect(table.getByText("Female Life Expectancy")).toBeInTheDocument();
    expect(table.getByText("Life Expectancy")).toBeInTheDocument();
  });

  it("toggles the vector inspector drawer", async () => {
    renderWithMock();

    expect(await screen.findByText(/Similarity Result/i)).toBeInTheDocument();

    const inspectBtn = screen.getByText("Inspect Vector");
    fireEvent.click(inspectBtn);

    expect(
      await screen.findByText(/Vector Preview \(768 Dimensions\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Hide Vector")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Hide Vector"));
    expect(
      screen.queryByText(/Vector Preview \(768 Dimensions\)/i),
    ).not.toBeInTheDocument();
  });

  it("renders ambiguity warning if top two candidates have delta < 0.025", async () => {
    renderWithMock({
      ...mockSimilarityResponse,
      isAmbiguous: true,
      primaryScore: 0.7214,
      primaryTier: "candidate",
      primaryTierLabel: "Candidate Match",
      candidates: [
        {
          ...mockSimilarityResponse.candidates[0],
          score: 0.7214,
          tier: "candidate",
          tierLabel: "Candidate Match",
        },
        {
          ...mockSimilarityResponse.candidates[1],
          score: 0.7102,
          tier: "candidate",
          tierLabel: "Candidate Match",
        },
      ],
    });

    expect(
      await screen.findByText(/Near-Neighbor Ambiguity/i),
    ).toBeInTheDocument();
  });

  it("handles fetch failure gracefully and shows error message", async () => {
    renderWithMock({ error: "Model endpoint unavailable" }, false, 500);

    expect(
      await screen.findByText("Model endpoint unavailable"),
    ).toBeInTheDocument();
    expect(screen.getByText("Request failed")).toBeInTheDocument();
  });

  it("shows a distinct message for a 502 upstream embedding failure", async () => {
    renderWithMock({ error: "Gemini embedding call failed" }, false, 502);

    expect(
      await screen.findByText("Gemini embedding call failed"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Embedding service unavailable"),
    ).toBeInTheDocument();
  });

  it("handles a rejected fetch promise (network failure), not just ok: false", async () => {
    const mock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    global.fetch = mock as unknown as typeof fetch;
    globalThis.fetch = mock as unknown as typeof fetch;
    if (typeof window !== "undefined") {
      window.fetch = mock as unknown as typeof fetch;
    }
    render(<SimilarityClient />);

    expect(await screen.findByText("Failed to fetch")).toBeInTheDocument();
    expect(screen.getByText("Request failed")).toBeInTheDocument();
  });

  it("shows the synthetic-data warning when source is deterministic_projection", async () => {
    renderWithMock({
      ...mockSimilarityResponse,
      source: "deterministic_projection",
    });

    expect(
      await screen.findByText(/Synthetic Data — Not a Real Measurement/i),
    ).toBeInTheDocument();
  });

  it("does not show the synthetic-data warning when source is live_genai", async () => {
    renderWithMock({ ...mockSimilarityResponse, source: "live_genai" });

    expect(await screen.findByText(/Similarity Result/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Synthetic Data — Not a Real Measurement/i),
    ).not.toBeInTheDocument();
  });

  it("copies 'Confidence Gap: n/a' (not 0.0000) when the top candidate has no deltaToNext (single-candidate result)", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    renderWithMock({
      ...mockSimilarityResponse,
      candidates: [
        { ...mockSimilarityResponse.candidates[0], deltaToNext: null },
      ],
    });

    expect(await screen.findByText(/Similarity Result/i)).toBeInTheDocument();
    // Single-candidate result: the leaderboard table only renders for >= 2 candidates.
    expect(screen.queryByText(/Ranked Candidates/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Copy Summary"));

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalled(),
    );
    const summary = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as string;
    expect(summary).toContain("Confidence Gap: n/a");
    expect(summary).not.toContain("0.0000");
  });

  describe("outgoing request payload", () => {
    it("sends trimmed query/target, dimensions, and taskType, and never sends model (pair mode)", async () => {
      const { mock } = renderWithMock();

      await screen.findByText(/Similarity Result/i);

      const body = requestBodyFromCall(mock, 0);
      expect(body.query).toBe("female life expectancy at birth in Kenya");
      expect(body.target).toBe("Female Life Expectancy");
      expect(body.candidates).toEqual(["Female Life Expectancy"]);
      expect(body.dimensions).toBe(768);
      expect(body.taskType).toBe("RETRIEVAL_QUERY");
      expect(body.model).toBeUndefined();
    });

    it("sends the full candidate list and no target in batch mode", async () => {
      const { mock } = renderWithMock();
      await screen.findByText(/Similarity Result/i);

      fireEvent.click(screen.getByText("Batch Candidates"));
      fireEvent.click(
        screen.getByRole("button", { name: /Compute Similarity/i }),
      );

      await screen.findByText(/Ranked Candidates/i);

      const body = requestBodyFromCall(mock, mock.mock.calls.length - 1);
      expect(body.candidates).toEqual([
        "Female Life Expectancy",
        "Life Expectancy",
        "Female population",
        "Under-five mortality rate [under 5 years old]",
      ]);
      expect(body.target).toBeUndefined();
      expect(body.model).toBeUndefined();
    });

    it("trims whitespace from query and target before sending", async () => {
      const { mock } = renderWithMock();
      await screen.findByText(/Similarity Result/i);

      const inputA = screen.getByLabelText(
        /String A · Natural Language Query/i,
      ) as HTMLTextAreaElement;
      const inputB = screen.getByLabelText(
        /String B · Target StatVar Name/i,
      ) as HTMLTextAreaElement;

      fireEvent.change(inputA, { target: { value: "  padded query  " } });
      fireEvent.change(inputB, { target: { value: "  Padded Target  " } });
      fireEvent.click(
        screen.getByRole("button", { name: /Compute Similarity/i }),
      );

      await Promise.resolve();

      const body = requestBodyFromCall(mock, mock.mock.calls.length - 1);
      expect(body.query).toBe("padded query");
      expect(body.target).toBe("Padded Target");
      expect(body.candidates).toEqual(["Padded Target"]);
    });
  });
});
