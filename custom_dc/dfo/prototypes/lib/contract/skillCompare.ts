/**
 * Skill-compare prototype contract: the vendored skill snapshot, and the
 * request/response shapes shared between the `/api/skill-compare` route,
 * `scripts/snapshot-skills.mjs`, and the comparison UI.
 *
 * Single source of truth for all three, so the API, the snapshot script, and
 * the client cannot silently drift apart on these shapes. Import types and
 * constants from here rather than redeclaring them in any consumer.
 */

/** One file under a skill's `references/` directory, path relative to the skill's own directory (e.g. `references/flow-types.md`). */
export interface SkillReferenceFile {
  path: string;
  content: string;
}

/** One skill vendored from dfo-skills: its front matter and body from `SKILL.md`, plus its reference files. */
export interface VendoredSkill {
  name: string;
  description: string;
  /** The `SKILL.md` body, with the YAML front matter block stripped. */
  body: string;
  references: SkillReferenceFile[];
}

/**
 * The committed snapshot of dfo-skills (`lib/skills/snapshot.json`), produced
 * by `scripts/snapshot-skills.mjs`. The dfo-skills commit SHA and the
 * snapshot timestamp live once at the top level, not per skill, since they
 * describe the vendoring operation rather than any one skill.
 */
export interface SkillSnapshot {
  /** `git rev-parse HEAD` in dfo-skills at snapshot time. */
  sha: string;
  /** ISO 8601 timestamp of when the snapshot was generated. */
  generatedAt: string;
  skills: VendoredSkill[];
}

/** Arm identifier for the two-arm comparison, randomised per request. */
export type SkillCompareArmId = "a" | "b";

/** The two Gemini function tools the model may call during either arm's loop. */
export type SkillCompareToolName = "search_skills" | "load_skill";

/** One tool call the model made during an arm's run. */
export interface SkillCompareToolCall {
  tool: SkillCompareToolName;
  /** The skill name loaded. Present for `load_skill` calls; absent for `search_skills`. */
  skillName?: string;
}

/**
 * One arm's outcome. `answer` and `error` are mutually exclusive: a failed
 * arm carries `error` with a null `answer` so the other arm can still return
 * successfully rather than failing the whole request.
 */
export interface SkillCompareArmResult {
  answer: string | null;
  toolCalls: SkillCompareToolCall[];
  error: string | null;
  /**
   * True when `answer` was cut at `MAX_ANSWER_LENGTH` and is missing its
   * ending. The with-skills arm has more source material to draw on, so it
   * truncates more often than the control arm. The flag lets the UI label a
   * cut answer as a length artifact, since a reviewer who saw it stop
   * mid-sentence unlabelled would likely mark it down for looking
   * unfinished, a judgment about truncation rather than skill quality.
   */
  truncated: boolean;
}

export interface SkillCompareRequest {
  question: string;
  passphrase: string;
}

/**
 * Both arms, keyed `a`/`b` in randomised order. Which arm had skill access
 * is encoded only in `revealToken`, which the client round-trips, unread,
 * through the rating request. The server keeps no session state across
 * requests (randomised Cloud Run instances, no shared store), so the reveal
 * on rating depends entirely on this token.
 */
export interface SkillCompareResponse {
  a: SkillCompareArmResult;
  b: SkillCompareArmResult;
  revealToken: string;
}

export type SkillCompareWinner = "a" | "b" | "tie";

export interface SkillCompareRatingRequest {
  question: string;
  passphrase: string;
  winner: SkillCompareWinner;
  why: string;
  revealToken: string;
}

/** Reveals the arm mapping and what the with-skills arm actually loaded, decoded server-side from `revealToken`. */
export interface SkillCompareRatingResponse {
  withSkillsArm: SkillCompareArmId;
  /** Skill names the with-skills arm loaded, in call order. Empty means it chose none. */
  skillsLoaded: string[];
}

/** Upper bound on characters for the reviewer's question. */
export const MAX_QUESTION_LENGTH = 2000;

/** Upper bound on characters for either arm's answer text. */
export const MAX_ANSWER_LENGTH = 8000;

/** Upper bound on tool-call iterations per arm's loop, so a confused model can't loop forever. */
export const MAX_TOOL_CALL_ITERATIONS = 8;
