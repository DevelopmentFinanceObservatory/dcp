import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { SkillCompareArmResult } from "@/lib/contract/skillCompare";
import { decodeRevealToken } from "@/lib/reviewGate";

// Never let a test reach the model or the network: runSkillCompareArm is
// mocked so this suite exercises only the route's own logic.
vi.mock("@/lib/skillAgent", () => ({
  runSkillCompareArm: vi.fn(),
}));

const PASSPHRASE = "oda-skills-review";
const CONTROL_ANSWER: SkillCompareArmResult = {
  answer: "control answer",
  toolCalls: [],
  error: null,
  truncated: false,
};
const WITH_SKILLS_ANSWER: SkillCompareArmResult = {
  answer: "with-skills answer",
  toolCalls: [
    { tool: "search_skills" },
    { tool: "load_skill", skillName: "oda-measures" },
  ],
  error: null,
  truncated: false,
};

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/skill-compare", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/skill-compare", () => {
  beforeEach(() => {
    // resetAllMocks (not restoreAllMocks): runSkillCompareArm is a vi.fn()
    // from the vi.mock factory, not a vi.spyOn wrapper around a real
    // implementation, so there is no "original" to restore to — reset clears
    // both call history and any mockImplementation from the previous test.
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("returns 401 for a wrong passphrase and calls no arm", async () => {
    const { runSkillCompareArm } = await import("@/lib/skillAgent");
    const { POST } = await import("./route");

    const req = makeRequest({ question: "What is grant equivalent ODA?", passphrase: "wrong" });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(runSkillCompareArm).not.toHaveBeenCalled();
  });

  it("returns 401 for a missing passphrase and calls no arm", async () => {
    const { runSkillCompareArm } = await import("@/lib/skillAgent");
    const { POST } = await import("./route");

    const req = makeRequest({ question: "What is grant equivalent ODA?" });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(runSkillCompareArm).not.toHaveBeenCalled();
  });

  it("returns 400 for an over-long question and calls no arm", async () => {
    const { runSkillCompareArm } = await import("@/lib/skillAgent");
    const { POST } = await import("./route");

    const req = makeRequest({
      question: "a".repeat(2001),
      passphrase: PASSPHRASE,
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(runSkillCompareArm).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty question", async () => {
    const { POST } = await import("./route");
    const req = makeRequest({ question: "   ", passphrase: PASSPHRASE });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns both answers when both arms succeed", async () => {
    const { runSkillCompareArm } = await import("@/lib/skillAgent");
    vi.mocked(runSkillCompareArm).mockImplementation(async ({ arm }) =>
      arm === "with-skills" ? WITH_SKILLS_ANSWER : CONTROL_ANSWER,
    );
    const { POST } = await import("./route");

    const req = makeRequest({
      question: "What is grant equivalent ODA?",
      passphrase: PASSPHRASE,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(runSkillCompareArm).toHaveBeenCalledTimes(2);
    expect([data.a.answer, data.b.answer].sort()).toEqual(
      ["control answer", "with-skills answer"].sort(),
    );
    expect(data.a.error).toBeNull();
    expect(data.b.error).toBeNull();
    // Never indicates which arm had skills other than through revealToken.
    expect(data).not.toHaveProperty("withSkillsArm");
    expect(typeof data.revealToken).toBe("string");

    const revealed = decodeRevealToken(data.revealToken);
    expect(revealed).not.toBeNull();
    expect(["a", "b"]).toContain(revealed!.withSkillsArm);
    expect(revealed!.skillsLoaded).toEqual(["oda-measures"]);
    expect(revealed!.answers).toEqual({ a: data.a.answer, b: data.b.answer });
  });

  it("returns the other arm's answer, with an error set on the failed side, when one arm rejects", async () => {
    const { runSkillCompareArm } = await import("@/lib/skillAgent");
    vi.mocked(runSkillCompareArm).mockImplementation(async ({ arm }) => {
      if (arm === "with-skills") {
        throw new Error("upstream boom");
      }
      return CONTROL_ANSWER;
    });
    const { POST } = await import("./route");

    const req = makeRequest({
      question: "What is grant equivalent ODA?",
      passphrase: PASSPHRASE,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const armWithError = data.a.error ? data.a : data.b;
    const armThatSucceeded = data.a.error ? data.b : data.a;
    expect(armWithError.error).toBe("upstream boom");
    expect(armWithError.answer).toBeNull();
    expect(armThatSucceeded.answer).toBe("control answer");
    expect(armThatSucceeded.error).toBeNull();
  });

  it("logs a single-line JSON object carrying the documented fields", async () => {
    const { runSkillCompareArm } = await import("@/lib/skillAgent");
    vi.mocked(runSkillCompareArm).mockImplementation(async ({ arm }) =>
      arm === "with-skills" ? WITH_SKILLS_ANSWER : CONTROL_ANSWER,
    );
    const { POST } = await import("./route");
    const logSpy = vi.mocked(console.log);

    const req = makeRequest({
      question: "What is grant equivalent ODA?",
      passphrase: PASSPHRASE,
    });
    await POST(req);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const loggedArg = logSpy.mock.calls[0][0] as string;
    expect(typeof loggedArg).toBe("string");
    expect(loggedArg).not.toContain("\n");

    const parsed = JSON.parse(loggedArg);
    expect(parsed.event).toBe("skill_review_compare");
    expect(parsed.question).toBe("What is grant equivalent ODA?");
    expect(typeof parsed.snapshotSha).toBe("string");
    expect(parsed.a).toHaveProperty("toolCalls");
    expect(parsed.a).toHaveProperty("error");
    expect(parsed.a).toHaveProperty("truncated");
    expect(parsed.b).toHaveProperty("toolCalls");
    expect(parsed.b).toHaveProperty("error");
    expect(parsed.b).toHaveProperty("truncated");
  });

  it("carries each arm's truncated flag into both the response and the log line", async () => {
    const { runSkillCompareArm } = await import("@/lib/skillAgent");
    vi.mocked(runSkillCompareArm).mockImplementation(async ({ arm }) =>
      arm === "with-skills"
        ? { ...WITH_SKILLS_ANSWER, truncated: true }
        : CONTROL_ANSWER,
    );
    const { POST } = await import("./route");
    const logSpy = vi.mocked(console.log);

    const req = makeRequest({
      question: "What is grant equivalent ODA?",
      passphrase: PASSPHRASE,
    });
    const res = await POST(req);
    const data = await res.json();

    const truncatedArm = data.a.truncated ? data.a : data.b;
    const otherArm = data.a.truncated ? data.b : data.a;
    expect(truncatedArm.truncated).toBe(true);
    expect(otherArm.truncated).toBe(false);

    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    const loggedTruncatedArm = parsed.a.truncated ? parsed.a : parsed.b;
    const loggedOtherArm = parsed.a.truncated ? parsed.b : parsed.a;
    expect(loggedTruncatedArm.truncated).toBe(true);
    expect(loggedOtherArm.truncated).toBe(false);
  });
});
