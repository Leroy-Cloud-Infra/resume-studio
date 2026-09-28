import type { Skill } from "../types/resume.ts";
import { createStableId } from "./stable-id.ts";

export type SkillTextDraft = {
  value: string;
  canonicalSignature: string;
};

export function serializeSkillNames(skills: readonly Skill[]): string {
  return skills.map((skill) => skill.name).join(", ");
}

export function getSkillSignature(skills: readonly Skill[]): string {
  return JSON.stringify(skills.map(({ id, name, included }) => [id, name, included]));
}

/**
 * Parse the Skills textarea while tolerating its unfinished final token.
 * Migration parsing intentionally remains separate and unchanged.
 */
export function parseSkillDraft(value: string): string[] {
  if (value.trim().length === 0) return [];

  const parts = value.split(/[\n,]/);
  while (parts.length > 0 && parts[parts.length - 1].trim().length === 0) {
    parts.pop();
  }

  const names = parts.map((part) => part.trim());
  if (names.some((name) => name.length === 0)) return [value.trim()];
  return names;
}

function longestCommonPairs(previous: readonly Skill[], names: readonly string[]): Array<[number, number]> {
  const lengths = Array.from({ length: previous.length + 1 }, () => Array<number>(names.length + 1).fill(0));
  for (let oldIndex = previous.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = names.length - 1; newIndex >= 0; newIndex -= 1) {
      lengths[oldIndex][newIndex] = previous[oldIndex].name === names[newIndex]
        ? lengths[oldIndex + 1][newIndex + 1] + 1
        : Math.max(lengths[oldIndex + 1][newIndex], lengths[oldIndex][newIndex + 1]);
    }
  }

  const pairs: Array<[number, number]> = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < previous.length && newIndex < names.length) {
    if (previous[oldIndex].name === names[newIndex]) {
      pairs.push([oldIndex, newIndex]);
      oldIndex += 1;
      newIndex += 1;
    } else if (lengths[oldIndex + 1][newIndex] >= lengths[oldIndex][newIndex + 1]) {
      oldIndex += 1;
    } else {
      newIndex += 1;
    }
  }
  return pairs;
}

/** Preserve identities for unchanged skills and treat unmatched edits positionally. */
export function reconcileSkills(previous: readonly Skill[], names: readonly string[]): Skill[] {
  if (previous.length === names.length && previous.every((skill, index) => skill.name === names[index])) {
    return previous as Skill[];
  }

  const exactPairs = longestCommonPairs(previous, names);
  const oldForNew = new Map<number, number>();
  let oldStart = 0;
  let newStart = 0;

  for (const [oldMatch, newMatch] of [...exactPairs, [previous.length, names.length] as [number, number]]) {
    const pairedCount = Math.min(oldMatch - oldStart, newMatch - newStart);
    for (let offset = 0; offset < pairedCount; offset += 1) {
      oldForNew.set(newStart + offset, oldStart + offset);
    }
    if (oldMatch < previous.length && newMatch < names.length) oldForNew.set(newMatch, oldMatch);
    oldStart = oldMatch + 1;
    newStart = newMatch + 1;
  }

  return names.map((name, index) => {
    const prior = oldForNew.get(index);
    return prior === undefined
      ? { id: createStableId(), name, included: true }
      : { ...previous[prior], name };
  });
}

export function updateSkillTextDraft(value: string, canonicalSkills: readonly Skill[]) {
  const skills = reconcileSkills(canonicalSkills, parseSkillDraft(value));
  return {
    skills,
    draft: { value, canonicalSignature: getSkillSignature(skills) },
    changed: skills !== canonicalSkills,
  };
}

export function rebaseSkillTextDraft(draft: SkillTextDraft, canonicalSkills: readonly Skill[]): SkillTextDraft {
  const canonicalSignature = getSkillSignature(canonicalSkills);
  return draft.canonicalSignature === canonicalSignature
    ? draft
    : { value: serializeSkillNames(canonicalSkills), canonicalSignature };
}
