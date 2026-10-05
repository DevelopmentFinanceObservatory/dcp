import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  instructionWithSkills,
  instructionWithoutSkills,
  loadSkillDescription,
  loadPromptsFile,
  parsePromptsYaml,
  searchSkillsDescription,
} from "./prompts";

const VALID_YAML = `
instruction_with_skills: |-
  Answer the question. You have tools.
instruction_without_skills: |-
  Answer the question.
search_skills_description: |-
  Search for skills.
load_skill_description: |-
  Load a skill by name.
`;

describe("module-scope exports", () => {
  it("loads the four prompt values from lib/prompts.yaml", () => {
    expect(instructionWithSkills.length).toBeGreaterThan(0);
    expect(instructionWithoutSkills.length).toBeGreaterThan(0);
    expect(searchSkillsDescription.length).toBeGreaterThan(0);
    expect(loadSkillDescription.length).toBeGreaterThan(0);
  });

  it("gives the two arms different instructions", () => {
    expect(instructionWithSkills).not.toBe(instructionWithoutSkills);
  });
});

describe("parsePromptsYaml", () => {
  it("returns the four values from valid YAML", () => {
    expect(parsePromptsYaml(VALID_YAML, "test.yaml")).toEqual({
      instructionWithSkills: "Answer the question. You have tools.",
      instructionWithoutSkills: "Answer the question.",
      searchSkillsDescription: "Search for skills.",
      loadSkillDescription: "Load a skill by name.",
    });
  });

  it("throws naming the file and key when instruction_with_skills is absent", () => {
    const yaml = `
instruction_without_skills: |-
  Answer the question.
search_skills_description: |-
  Search for skills.
load_skill_description: |-
  Load a skill by name.
`;
    expect(() => parsePromptsYaml(yaml, "test.yaml")).toThrow(
      'test.yaml: missing or empty required key "instruction_with_skills"',
    );
  });

  it("throws naming the file and key when instruction_without_skills is absent", () => {
    const yaml = `
instruction_with_skills: |-
  Answer the question. You have tools.
search_skills_description: |-
  Search for skills.
load_skill_description: |-
  Load a skill by name.
`;
    expect(() => parsePromptsYaml(yaml, "test.yaml")).toThrow(
      'test.yaml: missing or empty required key "instruction_without_skills"',
    );
  });

  it("throws naming the file and key when a key is an empty string", () => {
    const yaml = `
instruction_with_skills: ""
instruction_without_skills: |-
  Answer the question.
search_skills_description: |-
  Search for skills.
load_skill_description: |-
  Load a skill by name.
`;
    expect(() => parsePromptsYaml(yaml, "test.yaml")).toThrow(
      'test.yaml: missing or empty required key "instruction_with_skills"',
    );
  });

  it("throws naming the file and key when a key is blank (whitespace only)", () => {
    const yaml = `
instruction_with_skills: "   "
instruction_without_skills: |-
  Answer the question.
search_skills_description: |-
  Search for skills.
load_skill_description: |-
  Load a skill by name.
`;
    expect(() => parsePromptsYaml(yaml, "test.yaml")).toThrow(
      'test.yaml: missing or empty required key "instruction_with_skills"',
    );
  });

  it("throws naming the file when the YAML is unparseable", () => {
    expect(() => parsePromptsYaml("instruction_with_skills: [unterminated", "test.yaml")).toThrow(
      /test\.yaml: could not parse YAML/,
    );
  });
});

describe("loadPromptsFile", () => {
  it("throws naming the file when it does not exist", () => {
    const missingPath = path.join(tmpdir(), "does-not-exist-prompts.yaml");
    expect(() => loadPromptsFile(missingPath)).toThrow(
      new RegExp(`${missingPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: could not read prompts file`),
    );
  });

  it("reads and parses a real file on disk", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "prompts-test-"));
    const filePath = path.join(dir, "prompts.yaml");
    try {
      writeFileSync(filePath, VALID_YAML, "utf-8");
      expect(loadPromptsFile(filePath)).toEqual({
        instructionWithSkills: "Answer the question. You have tools.",
        instructionWithoutSkills: "Answer the question.",
        searchSkillsDescription: "Search for skills.",
        loadSkillDescription: "Load a skill by name.",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
