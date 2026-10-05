#!/usr/bin/env node
/**
 * Vendors dfo-skills text into `lib/skills/snapshot.json`, committed so the
 * skill-compare prototype's two arms can be built from real skill content
 * without a runtime dependency on the dfo-skills repo.
 *
 * For each directory under dfo-skills' `skills/` (skipping `_template`), reads
 * `SKILL.md`, parses its YAML front matter for `name` and `description`,
 * keeps the body after the front matter, and reads every file under that
 * skill's `references/` directory if one exists. Records dfo-skills'
 * `git rev-parse HEAD` as the snapshot SHA.
 *
 * Usage: npm run snapshot-skills
 * Override the dfo-skills checkout with DFO_SKILLS_PATH=/path/to/dfo-skills.
 *
 * `snapshotSha` is logged on every submission (see
 * `app/api/skill-compare/route.ts`) and is the only link between a
 * reviewer's verdict and the exact skill text they saw, so this refuses to
 * snapshot a dirty dfo-skills tree. A SHA that doesn't describe what was
 * vendored makes every downstream record cite the wrong text. Opt out with
 * DFO_SKILLS_ALLOW_DIRTY=1 for a deliberate local experiment. The recorded
 * sha is then suffixed `-dirty`, so it stays visibly untrustworthy rather
 * than passing silently for a clean, reviewable snapshot.
 *
 * The CLI body below runs only when this file is executed directly (`node
 * scripts/snapshot-skills.mjs`), never when imported. `resolveSnapshotSha`
 * is exported for `scripts/snapshot-skills.test.ts` to import and exercise
 * without touching git, the filesystem, or the real committed snapshot.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");

function fail(message) {
  console.error(`snapshot-skills: ${message}`);
  process.exit(1);
}

/**
 * Decides the sha to record given the dfo-skills tree's dirtiness, exported
 * standalone so the dirty-tree refusal is testable without a real git
 * checkout or `process.exit`. Throws when the tree is dirty and dirtiness
 * isn't explicitly allowed. The caller turns that into `fail(...)`.
 */
export function resolveSnapshotSha({ sha, gitStatusOutput, allowDirtyEnvValue }) {
  const isDirty = gitStatusOutput.trim().length > 0;
  if (!isDirty) return { sha, dirty: false };

  const allowDirty = /^(1|true)$/i.test(allowDirtyEnvValue ?? "");
  if (!allowDirty) {
    throw new Error(
      "dfo-skills has uncommitted changes. The recorded sha would not describe " +
        "the text actually vendored. Commit or stash those changes and retry, " +
        "or set DFO_SKILLS_ALLOW_DIRTY=1 to snapshot it anyway (the sha will be " +
        "suffixed '-dirty').",
    );
  }

  return { sha: `${sha}-dirty`, dirty: true };
}

/**
 * Folded/literal YAML block-scalar reader for `description: >-` (and `|-`)
 * front matter, without a YAML dependency. Handles the one block style this
 * repo's SKILL.md files use. A plain single-line scalar is also accepted.
 */
function parseDescription(frontMatterLines, skillName) {
  const headerIndex = frontMatterLines.findIndex((l) => /^description:/.test(l));
  if (headerIndex === -1) return undefined;
  const inline = frontMatterLines[headerIndex].slice("description:".length).trim();
  const blockStyle = /^([>|])[+-]?\s*$/.exec(inline)?.[1];
  if (!blockStyle) {
    return inline.replace(/^["']|["']$/g, "").trim() || undefined;
  }
  const blockLines = [];
  for (let i = headerIndex + 1; i < frontMatterLines.length; i++) {
    const line = frontMatterLines[i];
    if (line.trim() === "") {
      blockLines.push("");
      continue;
    }
    if (!/^\s/.test(line)) break; // dedented: the block scalar ended
    blockLines.push(line.replace(/^ {2}/, ""));
  }
  while (blockLines.length && blockLines[blockLines.length - 1] === "") blockLines.pop();
  const joined =
    blockStyle === ">" ? blockLines.join(" ").replace(/\s+/g, " ") : blockLines.join("\n");
  const trimmed = joined.trim();
  if (!trimmed) fail(`${skillName}/SKILL.md front matter 'description' block is empty`);
  return trimmed;
}

function parseSkillMd(raw, skillName) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) fail(`${skillName}/SKILL.md has no YAML front matter block`);
  const [, frontMatter, body] = match;
  const frontMatterLines = frontMatter.split(/\r?\n/);
  const name = /^name:\s*(.+)$/m.exec(frontMatter)?.[1]?.trim();
  const description = parseDescription(frontMatterLines, skillName);
  if (!name) fail(`${skillName}/SKILL.md front matter has no 'name'`);
  if (!description) fail(`${skillName}/SKILL.md front matter has no 'description'`);
  return { name, description, body: body.trim() };
}

function listFilesRecursive(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else if (entry.isFile()) out.push(full);
  }
  return out.sort();
}

function main() {
  const skillsRepoPath =
    process.env.DFO_SKILLS_PATH ?? path.join(homedir(), "repos", "dfo-skills");
  const skillsDir = path.join(skillsRepoPath, "skills");
  const outputPath = path.join(appRoot, "lib", "skills", "snapshot.json");

  if (!existsSync(skillsDir)) {
    fail(
      `dfo-skills 'skills/' directory not found at ${skillsDir} ` +
        `(set DFO_SKILLS_PATH to the dfo-skills checkout root to override)`,
    );
  }

  let sha;
  try {
    sha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: skillsRepoPath,
      encoding: "utf8",
    }).trim();
  } catch (err) {
    fail(`could not read dfo-skills HEAD SHA in ${skillsRepoPath}: ${err.message}`);
  }

  let gitStatus;
  try {
    gitStatus = execFileSync("git", ["status", "--porcelain"], {
      cwd: skillsRepoPath,
      encoding: "utf8",
    });
  } catch (err) {
    fail(`could not read dfo-skills working tree status in ${skillsRepoPath}: ${err.message}`);
  }

  let resolved;
  try {
    resolved = resolveSnapshotSha({
      sha,
      gitStatusOutput: gitStatus,
      allowDirtyEnvValue: process.env.DFO_SKILLS_ALLOW_DIRTY,
    });
  } catch (err) {
    fail(`${err.message} (dfo-skills path: ${skillsRepoPath})`);
  }

  if (resolved.dirty) {
    console.warn(
      `snapshot-skills: dfo-skills has uncommitted changes; recording sha as ` +
        `${resolved.sha} (DFO_SKILLS_ALLOW_DIRTY=1).`,
    );
  }
  sha = resolved.sha;

  const skillDirNames = readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "_template")
    .map((e) => e.name)
    .sort();

  if (skillDirNames.length === 0) {
    fail(`found zero skill directories under ${skillsDir}`);
  }

  let totalReferenceFiles = 0;
  const skills = skillDirNames.map((skillDirName) => {
    const skillDir = path.join(skillsDir, skillDirName);
    const skillMdPath = path.join(skillDir, "SKILL.md");
    if (!existsSync(skillMdPath)) fail(`${skillDirName} has no SKILL.md`);

    const { name, description, body } = parseSkillMd(
      readFileSync(skillMdPath, "utf8"),
      skillDirName,
    );

    const referencesDir = path.join(skillDir, "references");
    const references = existsSync(referencesDir)
      ? listFilesRecursive(referencesDir).map((filePath) => ({
          path: path.relative(skillDir, filePath).split(path.sep).join("/"),
          content: readFileSync(filePath, "utf8"),
        }))
      : [];
    totalReferenceFiles += references.length;

    return { name, description, body, references };
  });

  const snapshot = {
    sha,
    generatedAt: new Date().toISOString(),
    skills,
  };

  writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);

  console.log(
    `snapshot-skills: wrote ${skills.length} skills and ${totalReferenceFiles} reference files ` +
      `to ${path.relative(appRoot, outputPath)} (dfo-skills@${sha})`,
  );
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  main();
}
