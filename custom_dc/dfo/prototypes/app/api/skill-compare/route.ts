/**
 * Skill-compare prototype API: runs one reviewer question through two blind
 * arms of {@link runSkillCompareArm}, one with the six vendored dfo-skills
 * (`lib/skills/snapshot.json`) and one with none, and returns both answers
 * with no field indicating which arm is which. See
 * `lib/contract/skillCompare.ts`, `SkillCompareResponse`.
 *
 * `runtime = "nodejs"` is explicit rather than relied on as the App Router
 * default: `@google/adk` pulls in `dockerode`/`ssh2`, which are native and
 * cannot run on the Edge runtime.
 *
 * DELIBERATE EXCEPTION: this app proxies search through dfo-apis instead of
 * calling engines directly from the container (see `app/api/similarity/route.ts`
 * for the same exception made once already). `runSkillCompareArm` calls Gemini
 * directly via `@google/adk`, bypassing that pattern for the same reason:
 * dfo-apis has no agent-with-tools endpoint, and this whole app is a review
 * prototype, not the shipped product. Do not treat the direct model call as
 * precedent for new work.
 *
 * REMOVAL TRIGGER: delete this route, along with the rest of the
 * skill-compare prototype (`app/skill-review/`, `app/api/skill-rating/`,
 * `lib/skillAgent.ts`, `lib/contract/skillCompare.ts`, `lib/skills/snapshot.json`,
 * `scripts/snapshot-skills.mjs`, `custom_dc/dfo/scripts/read-skill-submissions.sh`),
 * once the ODA skills review round is over and `read-skill-submissions.sh` has
 * pulled the verdicts out of Cloud Logging.
 *
 * Ordering is deliberate and is the route's cost control: the passphrase
 * (`checkPassphrase`) is checked before the question is even validated, so
 * no unauthenticated request can trigger a model call. Both arms then run
 * concurrently via `Promise.allSettled`, so one arm throwing does not take
 * the other down with it. A rejected arm comes back as an ordinary
 * `SkillCompareArmResult` with `error` set. Which arm gets the skills is
 * randomised per request (`Math.random`), so a reviewer cannot learn the
 * mapping by position across repeated requests.
 *
 * `revealToken` (`lib/reviewGate.ts`) carries the arm mapping and both
 * answers forward to `/api/skill-rating`, unread by this page. See that
 * module's doc comment for why it is obfuscation, not a security control.
 *
 * Logs one single-line JSON object per successful request via
 * `console.log(JSON.stringify(...))`. Cloud Run parses a single-line JSON
 * stdout object into structured `jsonPayload` fields, so this must never be
 * pretty-printed or span multiple lines. `event: "skill_review_compare"` is
 * a stable filter value for `gcloud logging read`. The field names below are
 * a contract with `custom_dc/dfo/scripts/read-skill-submissions.sh`, which
 * reads them back, and must not be renamed without updating that script:
 *   - `event`: always `"skill_review_compare"`
 *   - `question`: the reviewer's question, verbatim
 *   - `snapshotSha`: `lib/skills/snapshot.json`'s `sha` (the dfo-skills commit vendored)
 *   - `a`, `b`: `{ toolCalls, error, truncated }` for each randomised arm, mirroring `SkillCompareArmResult`
 */
import { NextRequest, NextResponse } from "next/server";
import { runSkillCompareArm } from "@/lib/skillAgent";
import { checkPassphrase, encodeRevealToken } from "@/lib/reviewGate";
import {
  MAX_QUESTION_LENGTH,
  type SkillCompareArmId,
  type SkillCompareArmResult,
  type SkillCompareResponse,
  type SkillSnapshot,
} from "@/lib/contract/skillCompare";
import snapshotJson from "@/lib/skills/snapshot.json";

export const runtime = "nodejs";

const snapshot = snapshotJson as SkillSnapshot;

/**
 * Local to this route rather than the shared contract: the contract's
 * `MAX_QUESTION_LENGTH` bounds the `question` field's meaning across every
 * consumer, while this bounds only the wire size of this route's own request
 * body, checked before the body is parsed at all. `content-length` is
 * client-supplied and can be absent under chunked transfer encoding, so this
 * is defense-in-depth alongside nginx's default `client_max_body_size`
 * (1 MiB), not a replacement for it.
 */
const MAX_REQUEST_BODY_BYTES = 32 * 1024;

/** Turns a `Promise.allSettled` outcome into an ordinary arm result, so a rejection (which `runSkillCompareArm` documents it should never produce) still degrades to `error` rather than failing the whole request. */
function toArmResult(
  settled: PromiseSettledResult<SkillCompareArmResult>,
): SkillCompareArmResult {
  if (settled.status === "fulfilled") return settled.value;
  const message =
    settled.reason instanceof Error
      ? settled.reason.message
      : String(settled.reason);
  return { answer: null, toolCalls: [], error: message, truncated: false };
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > MAX_REQUEST_BODY_BYTES) {
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 },
    );
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  if (
    typeof parsedBody !== "object" ||
    parsedBody === null ||
    Array.isArray(parsedBody)
  ) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 },
    );
  }
  const body = parsedBody as Record<string, unknown>;

  // Passphrase FIRST, before any other validation and before any model call:
  // this is the route's cost control, not just an access check.
  if (!checkPassphrase(body.passphrase)) {
    return NextResponse.json({ error: "Invalid passphrase" }, { status: 401 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json(
      { error: "Question is required" },
      { status: 400 },
    );
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `Question must be at most ${MAX_QUESTION_LENGTH} characters` },
      { status: 400 },
    );
  }

  // Randomised per request: which arm ("a" or "b") gets the vendored skills.
  const withSkillsArm: SkillCompareArmId = Math.random() < 0.5 ? "a" : "b";
  const controlArm: SkillCompareArmId = withSkillsArm === "a" ? "b" : "a";

  const [withSkillsSettled, controlSettled] = await Promise.allSettled([
    runSkillCompareArm({ question, arm: "with-skills", skills: snapshot.skills }),
    runSkillCompareArm({ question, arm: "without-skills" }),
  ]);

  const results: Record<SkillCompareArmId, SkillCompareArmResult> = {
    [withSkillsArm]: toArmResult(withSkillsSettled),
    [controlArm]: toArmResult(controlSettled),
  } as Record<SkillCompareArmId, SkillCompareArmResult>;

  const skillsLoaded = results[withSkillsArm].toolCalls
    .filter((tc) => tc.tool === "load_skill" && tc.skillName)
    .map((tc) => tc.skillName as string);

  const revealToken = encodeRevealToken({
    withSkillsArm,
    skillsLoaded,
    answers: { a: results.a.answer, b: results.b.answer },
  });

  // See this route's doc comment for the field-name contract with
  // read-skill-submissions.sh.
  console.log(
    JSON.stringify({
      event: "skill_review_compare",
      question,
      snapshotSha: snapshot.sha,
      a: {
        toolCalls: results.a.toolCalls,
        error: results.a.error,
        truncated: results.a.truncated,
      },
      b: {
        toolCalls: results.b.toolCalls,
        error: results.b.error,
        truncated: results.b.truncated,
      },
    }),
  );

  const response: SkillCompareResponse = {
    a: results.a,
    b: results.b,
    revealToken,
  };

  return NextResponse.json(response);
}
