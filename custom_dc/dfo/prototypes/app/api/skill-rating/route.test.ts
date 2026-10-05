import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { encodeRevealToken } from "@/lib/reviewGate";

const PASSPHRASE = "oda-skills-review";

const VALID_TOKEN = encodeRevealToken({
  withSkillsArm: "b",
  skillsLoaded: ["oda-measures", "oda-concepts"],
  answers: { a: "control answer", b: "with-skills answer" },
});

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/skill-rating", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    question: "What is grant equivalent ODA?",
    passphrase: PASSPHRASE,
    winner: "b",
    why: "The with-skills answer cited the 2018 methodology break correctly.",
    revealToken: VALID_TOKEN,
    ...overrides,
  };
}

describe("POST /api/skill-rating", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("returns 401 for a wrong passphrase", async () => {
    const { POST } = await import("./route");
    const req = makeRequest(validBody({ passphrase: "wrong" }));
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 for a missing passphrase", async () => {
    const { POST } = await import("./route");
    const req = makeRequest(validBody({ passphrase: undefined }));
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid winner value", async () => {
    const { POST } = await import("./route");
    const req = makeRequest(validBody({ winner: "c" }));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for an empty question", async () => {
    const { POST } = await import("./route");
    const req = makeRequest(validBody({ question: "   " }));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for a missing or malformed reveal token", async () => {
    const { POST } = await import("./route");
    const req = makeRequest(validBody({ revealToken: "not-a-real-token" }));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("reveals the arm mapping and skills loaded from a valid token", async () => {
    const { POST } = await import("./route");
    const req = makeRequest(validBody());
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.withSkillsArm).toBe("b");
    expect(data.skillsLoaded).toEqual(["oda-measures", "oda-concepts"]);
  });

  it("logs a single-line JSON object carrying the documented fields", async () => {
    const { POST } = await import("./route");
    const logSpy = vi.mocked(console.log);

    const req = makeRequest(validBody());
    await POST(req);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const loggedArg = logSpy.mock.calls[0][0] as string;
    expect(typeof loggedArg).toBe("string");
    expect(loggedArg).not.toContain("\n");

    const parsed = JSON.parse(loggedArg);
    expect(parsed.event).toBe("skill_review_submission");
    expect(parsed.question).toBe("What is grant equivalent ODA?");
    expect(parsed.winner).toBe("b");
    expect(parsed.why).toBe(
      "The with-skills answer cited the 2018 methodology break correctly.",
    );
    expect(parsed.withSkillsArm).toBe("b");
    expect(parsed.skillsLoaded).toEqual(["oda-measures", "oda-concepts"]);
    expect(typeof parsed.snapshotSha).toBe("string");
    expect(parsed.answers).toEqual({ a: "control answer", b: "with-skills answer" });
  });

  it("does not log when the passphrase is wrong", async () => {
    const { POST } = await import("./route");
    const logSpy = vi.mocked(console.log);

    const req = makeRequest(validBody({ passphrase: "wrong" }));
    await POST(req);

    expect(logSpy).not.toHaveBeenCalled();
  });
});
