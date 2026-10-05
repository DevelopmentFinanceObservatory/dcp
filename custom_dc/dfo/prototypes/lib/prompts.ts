/**
 * Loads `lib/prompts.yaml` and exports its four prompt values, typed and
 * validated. Read once at module scope, so every caller sees the same
 * parsed values and the cost of reading and parsing is paid once.
 *
 * Fails loudly at import time rather than falling back to a built-in
 * default: a silent fallback would mean editing the YAML file produces no
 * visible change, with nothing telling the editor why. A missing file, a
 * YAML parse error, or a missing or empty required key all throw, naming
 * the file and (for a missing key) the key.
 *
 * `parsePromptsYaml` and `loadPromptsFile` are exported standalone so
 * `lib/prompts.test.ts` can exercise the validation and file-reading
 * failure modes directly, without relying on module-scope side effects.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";

/** The four prompt values `lib/prompts.yaml` must define. */
export interface Prompts {
  instructionWithSkills: string;
  instructionWithoutSkills: string;
  searchSkillsDescription: string;
  loadSkillDescription: string;
}

interface PromptsYamlShape {
  instruction_with_skills?: unknown;
  instruction_without_skills?: unknown;
  search_skills_description?: unknown;
  load_skill_description?: unknown;
}

function requireNonEmptyString(
  value: unknown,
  key: string,
  sourceLabel: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `${sourceLabel}: missing or empty required key "${key}"`,
    );
  }
  return value;
}

/**
 * Parses and validates already-read YAML text into {@link Prompts}.
 * `sourceLabel` identifies the source (normally a file path) in any thrown
 * error, so a failure names where to look.
 */
export function parsePromptsYaml(raw: string, sourceLabel: string): Prompts {
  let parsed: unknown;
  try {
    parsed = loadYaml(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`${sourceLabel}: could not parse YAML: ${message}`);
  }

  const doc = (parsed ?? {}) as PromptsYamlShape;

  return {
    instructionWithSkills: requireNonEmptyString(
      doc.instruction_with_skills,
      "instruction_with_skills",
      sourceLabel,
    ),
    instructionWithoutSkills: requireNonEmptyString(
      doc.instruction_without_skills,
      "instruction_without_skills",
      sourceLabel,
    ),
    searchSkillsDescription: requireNonEmptyString(
      doc.search_skills_description,
      "search_skills_description",
      sourceLabel,
    ),
    loadSkillDescription: requireNonEmptyString(
      doc.load_skill_description,
      "load_skill_description",
      sourceLabel,
    ),
  };
}

/** Reads and parses the YAML file at `filePath` into {@link Prompts}. */
export function loadPromptsFile(filePath: string): Prompts {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`${filePath}: could not read prompts file: ${message}`);
  }
  return parsePromptsYaml(raw, filePath);
}

const PROMPTS_FILE = path.join(process.cwd(), "lib", "prompts.yaml");

const {
  instructionWithSkills,
  instructionWithoutSkills,
  searchSkillsDescription,
  loadSkillDescription,
} = loadPromptsFile(PROMPTS_FILE);

export {
  instructionWithSkills,
  instructionWithoutSkills,
  searchSkillsDescription,
  loadSkillDescription,
};
