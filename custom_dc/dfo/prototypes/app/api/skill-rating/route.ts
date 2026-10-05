/**
 * Skill-compare prototype API: records a reviewer's verdict on a completed
 * `/api/skill-compare` request and reveals the arm mapping. See
 * `lib/contract/skillCompare.ts`, `SkillCompareRatingRequest` /
 * `SkillCompareRatingResponse`.
 *
 * `runtime = "nodejs"` for the same reason as `/api/skill-compare`: this
 * route imports `lib/reviewGate.ts`, which uses Node's `crypto` module.
 *
 * DELIBERATE EXCEPTION: this route makes no model call itself, but it is
 * part of the same review-round-only prototype as `/api/skill-compare`,
 * which does call Gemini directly rather than through dfo-apis. See that
 * route's doc comment for why. Do not treat anything here as precedent for
 * new work either.
 *
 * REMOVAL TRIGGER: same as `/api/skill-compare`. Delete this route
 * alongside the rest of the skill-compare prototype once the ODA skills
 * review round is over and `custom_dc/dfo/scripts/read-skill-submissions.sh`
 * has pulled the verdicts out of Cloud Logging.
 *
 * The passphrase is checked first, before the reveal token is even decoded,
 * matching `/api/skill-compare`'s ordering. `revealToken` is decoded via
 * `lib/reviewGate.ts`'s `decodeRevealToken`; see that module's doc comment
 * for why the token is obfuscation, not a security control, and why it
 * carries both arms' answer text (the rating request itself does not).
 *
 * Logs one single-line JSON object per successful submission via
 * `console.log(JSON.stringify(...))`, matching `/api/skill-compare`'s
 * logging contract (never pretty-printed or multi-line, since Cloud Run
 * parses exactly one JSON object per stdout line into structured
 * `jsonPayload` fields). `event: "skill_review_submission"` is the stable
 * filter value for `gcloud logging read`. The field names below are a
 * contract with `custom_dc/dfo/scripts/read-skill-submissions.sh`, which
 * reads them back, and must not be renamed without updating that script:
 *   - `event`: always `"skill_review_submission"`
 *   - `question`: the reviewer's question, verbatim
 *   - `winner`: `"a"`, `"b"`, or `"tie"`
 *   - `why`: the reviewer's free-text rationale
 *   - `withSkillsArm`: which of `"a"`/`"b"` had skill access
 *   - `skillsLoaded`: the with-skills arm's loaded skill names, in call order
 *   - `snapshotSha`: `lib/skills/snapshot.json`'s `sha`
 *   - `answers`: `{ a, b }`, both arms' answer text (or `null` on a failed arm)
 */
import { NextRequest, NextResponse } from "next/server";
import { checkPassphrase, decodeRevealToken } from "@/lib/reviewGate";
import {
  MAX_QUESTION_LENGTH,
  type SkillCompareRatingResponse,
  type SkillCompareWinner,
  type SkillSnapshot,
} from "@/lib/contract/skillCompare";
import snapshotJson from "@/lib/skills/snapshot.json";

export const runtime = "nodejs";

const snapshot = snapshotJson as SkillSnapshot;

const VALID_WINNERS: readonly SkillCompareWinner[] = ["a", "b", "tie"];

/**
 * Local to this route: bounds the wire size of the request body, checked
 * before parsing. Larger than `/api/skill-compare`'s bound because the
 * `revealToken` here carries both arms' full answer text (each already
 * capped at `MAX_ANSWER_LENGTH` = 8000 characters by `truncateAnswer`) plus
 * base64 overhead, not just a question.
 */
const MAX_REQUEST_BODY_BYTES = 128 * 1024;

/** Local to this route: bounds the reviewer's free-text rationale. Not part of the shared contract, since no other consumer reads this field's length. */
const MAX_WHY_LENGTH = 4000;

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

  // Passphrase first, matching /api/skill-compare's ordering.
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

  const winner = body.winner;
  if (!VALID_WINNERS.includes(winner as SkillCompareWinner)) {
    return NextResponse.json(
      { error: `winner must be one of: ${VALID_WINNERS.join(", ")}` },
      { status: 400 },
    );
  }

  const why = typeof body.why === "string" ? body.why.trim() : "";
  if (why.length > MAX_WHY_LENGTH) {
    return NextResponse.json(
      { error: `why must be at most ${MAX_WHY_LENGTH} characters` },
      { status: 400 },
    );
  }

  const revealed = decodeRevealToken(body.revealToken);
  if (!revealed) {
    return NextResponse.json(
      { error: "Invalid or missing reveal token" },
      { status: 400 },
    );
  }

  // See this route's doc comment for the field-name contract with
  // read-skill-submissions.sh.
  //
  // `question` comes from this request body, not from `revealed` (the
  // reveal token carries only `withSkillsArm`, `skillsLoaded`, and
  // `answers`), so nothing here verifies it's the same question that
  // produced `answers`. Assumed true because the shipped UI always
  // round-trips the same `question` state from compare through rating.
  console.log(
    JSON.stringify({
      event: "skill_review_submission",
      question,
      winner,
      why,
      withSkillsArm: revealed.withSkillsArm,
      skillsLoaded: revealed.skillsLoaded,
      snapshotSha: snapshot.sha,
      answers: revealed.answers,
    }),
  );

  const response: SkillCompareRatingResponse = {
    withSkillsArm: revealed.withSkillsArm,
    skillsLoaded: revealed.skillsLoaded,
  };

  return NextResponse.json(response);
}
