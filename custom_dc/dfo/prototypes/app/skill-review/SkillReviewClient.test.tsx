// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import SkillReviewClient from "./SkillReviewClient";

const PASSPHRASE_STORAGE_KEY = "dfo-skill-review-passphrase";

const compareResponse = {
  a: { answer: "Answer text for pane A.", toolCalls: [], error: null, truncated: false },
  b: { answer: "Answer text for pane B.", toolCalls: [], error: null, truncated: false },
  revealToken: "opaque-token-xyz",
};

/** Routes a mocked fetch by URL so compare and rating calls can return
 *  different canned responses in the same test. */
function mockFetchByRoute(
  routes: Record<string, { ok: boolean; status?: number; body: unknown }>,
) {
  const mock = vi.fn().mockImplementation((url: string) => {
    const match = Object.entries(routes).find(([path]) => url.includes(path));
    if (!match) {
      throw new Error(`Unexpected fetch to ${url}`);
    }
    const [, { ok, status = 200, body }] = match;
    return Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(body),
    });
  });
  global.fetch = mock as unknown as typeof fetch;
  globalThis.fetch = mock as unknown as typeof fetch;
  if (typeof window !== "undefined") {
    window.fetch = mock as unknown as typeof fetch;
  }
  return mock;
}

function requestBody(mock: ReturnType<typeof vi.fn>, path: string) {
  const call = mock.mock.calls.find((args: unknown[]) =>
    (args[0] as string).includes(path),
  );
  if (!call) throw new Error(`No call to ${path}`);
  const [, init] = call;
  return JSON.parse(init.body as string);
}

/**
 * jsdom's real `window.localStorage` isn't usable in this environment (a
 * stub `Storage` with no `setItem`/`getItem`/`clear`, which is exactly the
 * throwing case the component's try/catch wrapping exists for), so tests
 * install their own in-memory stand-in rather than asserting on the broken
 * built-in.
 */
function installMemoryLocalStorage(): Storage {
  let store: Record<string, string> = {};
  const storage: Storage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
  Object.defineProperty(window, "localStorage", {
    value: storage,
    configurable: true,
  });
  return storage;
}

async function passGate() {
  const input = screen.getByLabelText("Passphrase");
  fireEvent.change(input, { target: { value: "letmein" } });
  fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
  await screen.findByLabelText(/Your question/i);
}

async function submitQuestion(question = "What is grant equivalent ODA?") {
  const textarea = screen.getByLabelText(/Your question/i);
  fireEvent.change(textarea, { target: { value: question } });
  fireEvent.click(screen.getByRole("button", { name: /Submit/i }));
}

/**
 * jsdom's `window.sessionStorage` is a similarly broken stub — same reason
 * and same stand-in as {@link installMemoryLocalStorage}.
 */
function installMemorySessionStorage(): Storage {
  let store: Record<string, string> = {};
  const storage: Storage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
  Object.defineProperty(window, "sessionStorage", {
    value: storage,
    configurable: true,
  });
  return storage;
}

let memoryStorage: Storage;
let memorySessionStorage: Storage;

beforeEach(() => {
  memoryStorage = installMemoryLocalStorage();
  memorySessionStorage = installMemorySessionStorage();
});

describe("<SkillReviewClient />", () => {
  it("shows the passphrase gate first, then remembers it in localStorage", async () => {
    mockFetchByRoute({
      "/api/skill-compare": { ok: true, body: compareResponse },
    });
    render(<SkillReviewClient />);

    expect(screen.getByLabelText("Passphrase")).toBeInTheDocument();
    await passGate();

    expect(memoryStorage.getItem(PASSPHRASE_STORAGE_KEY)).toBe("letmein");
  });

  it("shows the remaining character counter as the question is typed", async () => {
    mockFetchByRoute({
      "/api/skill-compare": { ok: true, body: compareResponse },
    });
    render(<SkillReviewClient />);
    await passGate();

    const textarea = screen.getByLabelText(/Your question/i);
    fireEvent.change(textarea, { target: { value: "abc" } });

    expect(screen.getByText(/1997 characters left/)).toBeInTheDocument();
  });

  it("shows elapsed time while waiting, then renders both panes without leaking which had skills", async () => {
    const mock = mockFetchByRoute({
      "/api/skill-compare": { ok: true, body: compareResponse },
    });
    render(<SkillReviewClient />);
    await passGate();
    await submitQuestion();

    expect(
      screen.getByText(/Generating both answers/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Elapsed: 0s/)).toBeInTheDocument();

    expect(await screen.findByText("Answer text for pane A.")).toBeInTheDocument();
    expect(screen.getByText("Answer text for pane B.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Answer A" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Answer B" })).toBeInTheDocument();

    // The reviewer's own question stays visible alongside the two answers.
    expect(
      screen.getByRole("region", { name: "The question you asked" }),
    ).toHaveTextContent("What is grant equivalent ODA?");

    // No hint of which pane had skills, and the reveal token is never rendered.
    expect(screen.queryByText(/opaque-token-xyz/)).not.toBeInTheDocument();
    expect(screen.queryByText(/with.?skills/i)).not.toBeInTheDocument();

    const body = requestBody(mock, "/api/skill-compare");
    expect(body.passphrase).toBe("letmein");
    expect(body.question).toBe("What is grant equivalent ODA?");
  });

  it("shows a per-arm error and still allows submitting a rating", async () => {
    mockFetchByRoute({
      "/api/skill-compare": {
        ok: true,
        body: {
          a: { answer: null, toolCalls: [], error: "Gemini call failed", truncated: false },
          b: { answer: "Answer text for pane B.", toolCalls: [], error: null, truncated: false },
          revealToken: "opaque-token-xyz",
        },
      },
      "/api/skill-rating": {
        ok: true,
        body: { withSkillsArm: "b", skillsLoaded: [] },
      },
    });
    render(<SkillReviewClient />);
    await passGate();
    await submitQuestion();

    expect(
      await screen.findByText("This answer failed to generate."),
    ).toBeInTheDocument();
    expect(screen.getByText("Gemini call failed")).toBeInTheDocument();
    expect(screen.getByText("Answer text for pane B.")).toBeInTheDocument();

    // Rating form is still available despite the failed arm.
    expect(
      screen.getByRole("button", { name: /Submit rating/i }),
    ).toBeInTheDocument();
  });

  it("shows a retry option and hides the rating form when both arms fail", async () => {
    const mock = mockFetchByRoute({
      "/api/skill-compare": {
        ok: true,
        body: {
          a: { answer: null, toolCalls: [], error: "Gemini call failed", truncated: false },
          b: { answer: null, toolCalls: [], error: "Gemini call failed", truncated: false },
          revealToken: "opaque-token-xyz",
        },
      },
    });
    render(<SkillReviewClient />);
    await passGate();
    await submitQuestion();

    expect(
      await screen.findByText("Both answers failed to generate."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Submit rating/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
    await waitFor(() => expect(mock).toHaveBeenCalledTimes(2));
  });

  it("submits winner and why, then reveals the mapping and skills loaded", async () => {
    const mock = mockFetchByRoute({
      "/api/skill-compare": { ok: true, body: compareResponse },
      "/api/skill-rating": {
        ok: true,
        body: { withSkillsArm: "a", skillsLoaded: ["oda-measures"] },
      },
    });
    render(<SkillReviewClient />);
    await passGate();
    await submitQuestion();
    await screen.findByText("Answer text for pane A.");

    fireEvent.click(screen.getByLabelText(/Answer A was better/i));
    fireEvent.change(screen.getByLabelText(/Why\?/i), {
      target: { value: "It cited the right methodology note." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Submit rating/i }));

    const reveal = await screen.findByRole("region", { name: "Reveal" });
    expect(within(reveal).getByText("Answer A").closest("p")).toHaveTextContent(
      "had access to the skills",
    );
    expect(within(reveal).getByText("oda-measures")).toBeInTheDocument();

    // The question is still visible in the rated (reveal) phase.
    expect(
      screen.getByRole("region", { name: "The question you asked" }),
    ).toHaveTextContent("What is grant equivalent ODA?");

    const body = requestBody(mock, "/api/skill-rating");
    expect(body.winner).toBe("a");
    expect(body.why).toBe("It cited the right methodology note.");
    expect(body.revealToken).toBe("opaque-token-xyz");
    expect(body.passphrase).toBe("letmein");
  });

  it("renders 'no skills loaded' when the with-skills arm chose none", async () => {
    mockFetchByRoute({
      "/api/skill-compare": { ok: true, body: compareResponse },
      "/api/skill-rating": {
        ok: true,
        body: { withSkillsArm: "b", skillsLoaded: [] },
      },
    });
    render(<SkillReviewClient />);
    await passGate();
    await submitQuestion();
    await screen.findByText("Answer text for pane A.");

    fireEvent.click(screen.getByLabelText(/About the same/i));
    fireEvent.change(screen.getByLabelText(/Why\?/i), {
      target: { value: "Both were fine." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Submit rating/i }));

    expect(
      await screen.findByText(/didn't load any skills/i),
    ).toBeInTheDocument();
  });

  it("re-prompts for the passphrase on a 401 instead of showing a raw error", async () => {
    mockFetchByRoute({
      "/api/skill-compare": { ok: false, status: 401, body: { error: "nope" } },
    });
    render(<SkillReviewClient />);
    await passGate();
    await submitQuestion();

    expect(
      await screen.findByText(/That passphrase didn't work/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Passphrase")).toBeInTheDocument();
    expect(screen.queryByText("nope")).not.toBeInTheDocument();
  });

  it("renders an answer's Markdown as formatted text", async () => {
    mockFetchByRoute({
      "/api/skill-compare": {
        ok: true,
        body: {
          a: {
            answer: "Here is the plan:\n\n* **Source data:** query CRS\n  * nested step\n* Compare flows",
            toolCalls: [],
            error: null,
            truncated: false,
          },
          b: compareResponse.b,
          revealToken: "opaque-token-xyz",
        },
      },
    });
    render(<SkillReviewClient />);
    await passGate();
    await submitQuestion();

    const paneA = await screen.findByRole("region", { name: "Answer A" });
    expect(within(paneA).getByText("Source data:").tagName).toBe("STRONG");
    expect(within(paneA).getAllByRole("list")).toHaveLength(2);
    expect(within(paneA).getAllByRole("listitem")).toHaveLength(3);
    expect(paneA.textContent).not.toContain("**");
  });

  it("shows a visible note when an answer was cut off at the length limit", async () => {
    mockFetchByRoute({
      "/api/skill-compare": {
        ok: true,
        body: {
          a: {
            answer: "Answer text for pane A.",
            toolCalls: [],
            error: null,
            truncated: true,
          },
          b: compareResponse.b,
          revealToken: "opaque-token-xyz",
        },
      },
    });
    render(<SkillReviewClient />);
    await passGate();
    await submitQuestion();

    const paneA = await screen.findByRole("region", { name: "Answer A" });
    expect(
      within(paneA).getByText("This answer was cut off at the length limit."),
    ).toBeInTheDocument();

    const paneB = screen.getByRole("region", { name: "Answer B" });
    expect(
      within(paneB).queryByText(/cut off at the length limit/i),
    ).not.toBeInTheDocument();
  });

  it("persists the in-progress question, results, and rating draft to sessionStorage, and restores them on remount", async () => {
    mockFetchByRoute({
      "/api/skill-compare": { ok: true, body: compareResponse },
    });
    const { unmount } = render(<SkillReviewClient />);
    await passGate();
    await submitQuestion();
    await screen.findByText("Answer text for pane A.");

    fireEvent.click(screen.getByLabelText(/Answer A was better/i));
    fireEvent.change(screen.getByLabelText(/Why\?/i), {
      target: { value: "Draft rationale, not yet submitted." },
    });

    const stored = JSON.parse(
      memorySessionStorage.getItem("dfo-skill-review-session")!,
    );
    expect(stored.question).toBe("What is grant equivalent ODA?");
    expect(stored.compareResult).toEqual(compareResponse);
    expect(stored.winner).toBe("a");
    expect(stored.why).toBe("Draft rationale, not yet submitted.");

    // Simulate a reload: unmount and render a fresh instance against the
    // same (persisted) storage, with no new fetch call needed since the
    // remount should restore straight into the results phase.
    unmount();
    render(<SkillReviewClient />);

    expect(
      await screen.findByText("Answer text for pane A."),
    ).toBeInTheDocument();
    expect(screen.getByText("Answer text for pane B.")).toBeInTheDocument();
    expect(
      (screen.getByLabelText(/Answer A was better/i) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(screen.getByLabelText(/Why\?/i)).toHaveValue(
      "Draft rationale, not yet submitted.",
    );

    // The restored question is shown too, which matters most right after a
    // refresh: the reviewer has no other reminder of what they asked.
    expect(
      screen.getByRole("region", { name: "The question you asked" }),
    ).toHaveTextContent("What is grant equivalent ODA?");
  });

  it("renders the question as plain text with line breaks preserved, not markdown", async () => {
    mockFetchByRoute({
      "/api/skill-compare": { ok: true, body: compareResponse },
    });
    render(<SkillReviewClient />);
    await passGate();
    await submitQuestion("Line one\n**not bold** line two");
    await screen.findByText("Answer text for pane A.");

    const askedQuestion = screen.getByRole("region", {
      name: "The question you asked",
    });
    // Rendered literally: no markdown parsing, so the asterisks survive and
    // no <strong> element appears.
    expect(askedQuestion).toHaveTextContent("**not bold**");
    expect(askedQuestion.querySelector("strong")).toBeNull();
    // whitespace-pre-wrap preserves the newline rather than collapsing it,
    // which a single normalized text node would otherwise do.
    expect(askedQuestion.querySelector("p")?.textContent).toBe(
      "Line one\n**not bold** line two",
    );
  });

  it("resets state and leaves no persisted session on start over", async () => {
    mockFetchByRoute({
      "/api/skill-compare": { ok: true, body: compareResponse },
      "/api/skill-rating": {
        ok: true,
        body: { withSkillsArm: "a", skillsLoaded: [] },
      },
    });
    render(<SkillReviewClient />);
    await passGate();
    await submitQuestion();
    await screen.findByText("Answer text for pane A.");

    // "Compare another question" only renders in the rated phase, so submit
    // a rating first to reach it.
    fireEvent.click(screen.getByLabelText(/About the same/i));
    fireEvent.change(screen.getByLabelText(/Why\?/i), {
      target: { value: "Both were fine." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Submit rating/i }));
    await screen.findByRole("region", { name: "Reveal" });

    fireEvent.click(
      screen.getByRole("button", { name: /Compare another question/i }),
    );

    // Back at a blank question phase, not the stale results.
    expect(screen.getByLabelText(/Your question/i)).toHaveValue("");
    expect(
      screen.queryByRole("region", { name: "Answer A" }),
    ).not.toBeInTheDocument();

    // No stale question or compare result left behind for a later restore
    // to resurrect (the write-through effect re-persists the reset, empty
    // state, so the key itself may still exist, holding nothing worth
    // restoring).
    const stored = memorySessionStorage.getItem("dfo-skill-review-session");
    const parsed = stored ? JSON.parse(stored) : null;
    expect(parsed?.question ?? "").toBe("");
    expect(parsed?.compareResult ?? null).toBeNull();
  });

  it("clears the persisted session after a successful rating", async () => {
    mockFetchByRoute({
      "/api/skill-compare": { ok: true, body: compareResponse },
      "/api/skill-rating": {
        ok: true,
        body: { withSkillsArm: "a", skillsLoaded: [] },
      },
    });
    render(<SkillReviewClient />);
    await passGate();
    await submitQuestion();
    await screen.findByText("Answer text for pane A.");

    fireEvent.click(screen.getByLabelText(/Answer A was better/i));
    fireEvent.change(screen.getByLabelText(/Why\?/i), {
      target: { value: "It cited the right methodology note." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Submit rating/i }));
    await screen.findByRole("region", { name: "Reveal" });

    expect(
      memorySessionStorage.getItem("dfo-skill-review-session"),
    ).toBeNull();
  });
});
