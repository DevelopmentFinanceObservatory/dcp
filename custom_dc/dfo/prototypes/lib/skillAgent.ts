/**
 * Skill-compare prototype: the ADK agent module.
 *
 * Runs one question through a Gemini `LlmAgent` and reports the prose answer
 * plus the ordered list of tool calls the model actually made. The two
 * comparison arms are no longer identical except for their skill access: the
 * with-skills arm gets `instructionWithSkills` and the `search_skills`/
 * `load_skill` tools over the vendored skills (`lib/skills/snapshot.json`);
 * the without-skills arm gets `instructionWithoutSkills` and no tools at all
 * (see `lib/prompts.yaml`). This means a difference between the two arms'
 * answers reflects the skills feature as a whole, prompt wording included,
 * rather than the skill content alone.
 */
import { z } from "zod";
import {
  FunctionTool,
  Gemini,
  InMemoryRunner,
  LlmAgent,
  isFinalResponse,
  stringifyContent,
} from "@google/adk";
import {
  MAX_ANSWER_LENGTH,
  MAX_TOOL_CALL_ITERATIONS,
  type SkillCompareArmResult,
  type SkillCompareToolCall,
  type SkillReferenceFile,
  type VendoredSkill,
} from "@/lib/contract/skillCompare";
import {
  instructionWithSkills,
  instructionWithoutSkills,
  loadSkillDescription,
  searchSkillsDescription,
} from "@/lib/prompts";

/**
 * Pinned model id for both arms, read from this one constant rather than
 * scattered literals, so a comparison result attributes to a known model.
 */
export const SKILL_AGENT_MODEL = "gemini-3.8-flash";

/**
 * Low rather than zero: a fixed low temperature still leaves genuine
 * sampling variance, which is the honest state of a single-sample-per-arm
 * comparison.
 */
const SKILL_AGENT_TEMPERATURE = 0.1;

const AGENT_NAME = "skill_compare_agent";

/** What `search_skills` shows the model about one skill. */
export interface SkillSearchResult {
  name: string;
  description: string;
}

/**
 * The `search_skills` tool's logic, exported standalone so it is testable
 * without ADK or the network. Returns each skill's `name` and `description`,
 * not its body, since discovery is judged on the description alone. The
 * query argument exists for the model to explain what it is looking for. It
 * does not filter results. The point under test is whether the model can
 * pick the right skill from its description, not whether a keyword index
 * can. An empty `skills` list (the control arm) yields an empty result.
 */
export function searchSkills(
  skills: readonly VendoredSkill[],
): SkillSearchResult[] {
  return skills.map(({ name, description }) => ({ name, description }));
}

/** A skill successfully loaded by name, or a clear not-found result for an unknown name. */
export type LoadSkillResult =
  | {
      found: true;
      name: string;
      body: string;
      references: SkillReferenceFile[];
    }
  | { found: false; name: string; message: string };

/**
 * The `load_skill` tool's logic, exported standalone for the same reason as
 * {@link searchSkills}. Matches by exact name. An unknown name returns a
 * clear not-found result rather than throwing, so a model that guesses
 * wrong gets something to correct itself with.
 */
export function loadSkill(
  skills: readonly VendoredSkill[],
  name: string,
): LoadSkillResult {
  const skill = skills.find((candidate) => candidate.name === name);
  if (!skill) {
    return {
      found: false,
      name,
      message: `No skill named "${name}" is available. Call search_skills to see the available names.`,
    };
  }
  return {
    found: true,
    name: skill.name,
    body: skill.body,
    references: skill.references,
  };
}

/** Truncates `text` to at most `maxLength` characters, as a pure helper with no ellipsis marker. The contract caps length, and leaves the cut unmarked. */
export function truncateAnswer(
  text: string,
  maxLength: number = MAX_ANSWER_LENGTH,
): string {
  return text.length <= maxLength ? text : text.slice(0, maxLength);
}

/** True if `text` is longer than `maxLength` and {@link truncateAnswer} would cut it. Exported standalone, same reason as {@link truncateAnswer}: testable without ADK or the network. */
export function isAnswerTruncated(
  text: string,
  maxLength: number = MAX_ANSWER_LENGTH,
): boolean {
  return text.length > maxLength;
}

function buildTools(
  skills: readonly VendoredSkill[],
  toolCalls: SkillCompareToolCall[],
): FunctionTool[] {
  const searchTool = new FunctionTool({
    name: "search_skills",
    description: searchSkillsDescription,
    parameters: z.object({
      query: z
        .string()
        .describe("What you are trying to find a relevant skill for."),
    }),
    execute: () => {
      toolCalls.push({ tool: "search_skills" });
      return searchSkills(skills);
    },
  });

  const loadTool = new FunctionTool({
    name: "load_skill",
    description: loadSkillDescription,
    parameters: z.object({
      name: z.string().describe('The skill\'s exact "name" field, from search_skills.'),
    }),
    execute: ({ name }: { name: string }) => {
      toolCalls.push({ tool: "load_skill", skillName: name });
      return loadSkill(skills, name);
    },
  });

  return [searchTool, loadTool];
}

/**
 * Which arm to run. The caller states this explicitly rather than the
 * function inferring it from an empty `skills` list, so the instruction and
 * the tool set are always chosen together and a test can drive either arm
 * directly. `skills` is only meaningful, and only present, for `"with-skills"`.
 */
export type RunSkillCompareArmOptions =
  | {
      question: string;
      arm: "with-skills";
      /** The vendored skills this arm can discover via `search_skills`/`load_skill`. */
      skills: readonly VendoredSkill[];
    }
  | {
      question: string;
      arm: "without-skills";
    };

/**
 * Runs one question through the skill-compare agent and returns its answer
 * plus the ordered tool calls it made. Never throws: a missing API key, a
 * model error, or an upstream failure all come back in `error` with `answer`
 * left `null`, so one arm failing does not take the other down with it.
 *
 * Tool calls are recorded by the `execute` closures in {@link buildTools} as
 * they run, in call order, rather than re-derived from the returned events.
 * That is simpler, and it cannot drift from what actually executed. The same
 * `toolCalls` array doubles as the iteration cap: once it reaches
 * `MAX_TOOL_CALL_ITERATIONS`, the run stops consuming further events and
 * returns whatever answer text has been seen so far, rather than looping
 * forever on a confused model. The without-skills arm declares no tools, so
 * its `toolCalls` is always an empty array.
 */
export async function runSkillCompareArm(
  options: RunSkillCompareArmOptions,
): Promise<SkillCompareArmResult> {
  const { question, arm } = options;
  const toolCalls: SkillCompareToolCall[] = [];

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return {
      answer: null,
      toolCalls,
      error:
        "No Gemini API key configured (set GEMINI_API_KEY or GOOGLE_API_KEY).",
      truncated: false,
    };
  }

  const agent = new LlmAgent({
    name: AGENT_NAME,
    model: new Gemini({ model: SKILL_AGENT_MODEL, apiKey }),
    // Each arm gets its own instruction and tool set (lib/prompts.yaml):
    // the with-skills arm is told about search_skills/load_skill and gets
    // them; the without-skills arm is told neither exists and gets no tools
    // declared at all.
    instruction:
      arm === "with-skills" ? instructionWithSkills : instructionWithoutSkills,
    tools: arm === "with-skills" ? buildTools(options.skills, toolCalls) : [],
    generateContentConfig: { temperature: SKILL_AGENT_TEMPERATURE },
  });

  const runner = new InMemoryRunner({ agent, appName: "skill-compare" });

  let answer: string | null = null;

  try {
    for await (const event of runner.runEphemeral({
      userId: "skill-compare-reviewer",
      newMessage: { role: "user", parts: [{ text: question }] },
    })) {
      if (isFinalResponse(event)) {
        const text = stringifyContent(event);
        if (text) {
          answer = text;
        }
      }
      if (toolCalls.length >= MAX_TOOL_CALL_ITERATIONS) {
        break;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { answer: null, toolCalls, error: message, truncated: false };
  }

  const truncated = answer !== null && isAnswerTruncated(answer);

  return {
    answer: answer !== null ? truncateAnswer(answer) : null,
    toolCalls,
    error: null,
    truncated,
  };
}
