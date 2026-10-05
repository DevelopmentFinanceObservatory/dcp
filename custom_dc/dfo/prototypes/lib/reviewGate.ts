/**
 * Skill-compare prototype: the passphrase gate and the reveal token.
 *
 * Both `/api/skill-compare` and `/api/skill-rating` call {@link checkPassphrase}
 * first, before any other work. See those routes' doc comments for why
 * ordering matters: it is the cost control against an unauthenticated model
 * call. The reveal token round-trips which arm had skills through the
 * client between the two requests. See {@link encodeRevealToken} for why it
 * is deliberately not a security control.
 */
import { createHash, timingSafeEqual } from "crypto";
import type { SkillCompareArmId } from "@/lib/contract/skillCompare";

/**
 * The reviewer passphrase, checked against every `/api/skill-compare` and
 * `/api/skill-rating` request. This repository is private and route handlers
 * never ship to the browser, so a constant here is not a leaked secret the
 * way it would be in client code. The gate exists to keep crawlers and
 * casual visitors off an unlisted URL, not to guard something sensitive.
 * Moving it to an environment variable would take one line in dfo-infra
 * (`infra/dfo-dev/dcp`) if this prototype outlives the review round. It is
 * not worth doing for a passphrase this low-stakes.
 */
const REVIEW_PASSPHRASE = "oda-skills-review";

/**
 * True if `candidate` matches the reviewer passphrase. Compares fixed-length
 * SHA-256 digests with `timingSafeEqual` rather than `===`, so neither the
 * early-exit behavior of string comparison nor a length mismatch (which
 * `timingSafeEqual` would otherwise throw on for the raw strings) leaks
 * anything through response timing. This is a cheap, off-the-shelf way to
 * avoid a timing leak, not a defense this prototype depends on. See
 * `REVIEW_PASSPHRASE` above for the actual threat model.
 */
export function checkPassphrase(candidate: unknown): boolean {
  if (typeof candidate !== "string") return false;
  const candidateDigest = createHash("sha256").update(candidate).digest();
  const expectedDigest = createHash("sha256").update(REVIEW_PASSPHRASE).digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}

/**
 * The reveal token's decoded shape: which arm had skill access, what it
 * loaded, and both arms' answer text. The answers travel in the token
 * because the rating request (`SkillCompareRatingRequest`) carries only the
 * question, winner, and free-text why, not the answers, and this server
 * keeps no session state across requests (randomized Cloud Run instances, no
 * shared store). The submission log line needs both answers (see
 * `app/api/skill-rating/route.ts`), so the compare route stashes them here
 * rather than the rating route trying to re-derive or re-run anything.
 */
export interface RevealPayload {
  withSkillsArm: SkillCompareArmId;
  skillsLoaded: string[];
  answers: { a: string | null; b: string | null };
}

/**
 * Encodes an arm's answers and which arm had skill access as an opaque token
 * the client round-trips, unread, from the compare response into the rating
 * request.
 *
 * This is obfuscation, not a security control: it is base64-encoded JSON,
 * nothing more. The page never decodes it, but a reviewer with devtools open
 * could trivially base64-decode and read it before rating. That is accepted
 * rather than fixed with HMAC or encryption, because a reviewer who wants to
 * peek can usually tell the arms apart by reading the answers anyway. A
 * with-skills answer tends to cite dfo-skills terminology a base model
 * would not use. Do not add a signature or a new environment variable here.
 * It would not change that tradeoff.
 */
export function encodeRevealToken(payload: RevealPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

/**
 * Decodes a reveal token produced by {@link encodeRevealToken}. Returns
 * `null` for anything malformed (invalid base64, invalid JSON, or JSON that
 * doesn't match {@link RevealPayload}) rather than throwing, so the rating
 * route can turn a bad token into a 400 instead of a 500.
 */
export function decodeRevealToken(token: unknown): RevealPayload | null {
  if (typeof token !== "string" || token.length === 0) return null;

  let parsed: unknown;
  try {
    const json = Buffer.from(token, "base64").toString("utf8");
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as Record<string, unknown>;

  const withSkillsArm = candidate.withSkillsArm;
  if (withSkillsArm !== "a" && withSkillsArm !== "b") return null;

  if (
    !Array.isArray(candidate.skillsLoaded) ||
    !candidate.skillsLoaded.every((s) => typeof s === "string")
  ) {
    return null;
  }

  const answers = candidate.answers;
  if (
    typeof answers !== "object" ||
    answers === null ||
    !isNullableString((answers as Record<string, unknown>).a) ||
    !isNullableString((answers as Record<string, unknown>).b)
  ) {
    return null;
  }

  return {
    withSkillsArm,
    skillsLoaded: candidate.skillsLoaded as string[],
    answers: answers as { a: string | null; b: string | null },
  };
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}
