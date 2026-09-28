import assert from "node:assert/strict";
import test from "node:test";

import { getSection } from "../src/lib/resume-actions.ts";
import { createLibrary, loadResumeLibrary, saveResumeLibrary } from "../src/lib/resume-library.ts";
import { migrateLegacyPayload } from "../src/lib/resume-migrations.ts";
import { parseCustomSectionLines } from "../src/lib/resume-text.ts";
import {
  getSkillSignature,
  parseSkillDraft,
  rebaseSkillTextDraft,
  serializeSkillNames,
  updateSkillTextDraft,
} from "../src/lib/resume-skills.ts";
import { createWorkspaceState, workspaceReducer } from "../src/lib/resume-workspace.ts";
import type { Resume } from "../src/types/resume.ts";

const legacyResume: Resume = {
  title: "Skills test",
  header: { name: "Person", email: "person@example.com", phone: "", location: "", links: [] },
  summary: "Summary",
  technicalSkills: { title: "Technical Skills", categories: [{ id: "tools", label: "Tools", value: "secure remote access" }] },
  experience: [],
  projects: [],
  education: [],
  customSections: [{ id: "custom", title: "Notes", lines: ["Keep  these ", "spaces"] }],
};

function fixture() {
  return migrateLegacyPayload(legacyResume, { now: "2026-01-01T00:00:00.000Z" });
}

function skillsOf(document: ReturnType<typeof fixture>) {
  const section = getSection(document, "technicalSkills");
  assert.equal(section?.type, "technicalSkills");
  if (section?.type !== "technicalSkills") throw new Error("Expected Technical Skills section.");
  return section;
}

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test("Skills drafts preserve trailing and repeated spaces until semantic text changes", () => {
  const section = skillsOf(fixture());
  const category = section.content.categories[0];
  const originalSkills = category.skills;

  const trailing = updateSkillTextDraft("secure remote access ", originalSkills);
  assert.equal(trailing.draft.value, "secure remote access ");
  assert.equal(trailing.changed, false);
  assert.equal(trailing.skills, originalSkills);

  const continued = updateSkillTextDraft("secure remote access V", originalSkills);
  assert.equal(continued.changed, true);
  assert.equal(continued.skills[0].name, "secure remote access V");
  assert.equal(continued.skills[0].id, originalSkills[0].id);

  const repeated = updateSkillTextDraft("secure  remote   access", originalSkills);
  assert.equal(repeated.skills[0].name, "secure  remote   access");
  assert.equal(repeated.draft.value, "secure  remote   access");
});

test("Skills draft parser handles comma/newline separators and unfinished trailing tokens", () => {
  assert.deepEqual(parseSkillDraft("DNS, DHCP, "), ["DNS", "DHCP"]);
  assert.deepEqual(parseSkillDraft("DNS\nDHCP"), ["DNS", "DHCP"]);
  assert.deepEqual(parseSkillDraft("DNS, DHCP, Int"), ["DNS", "DHCP", "Int"]);
  assert.deepEqual(parseSkillDraft(""), []);
});

test("skill reconciliation preserves IDs across edits and neighboring additions/removals", () => {
  const section = skillsOf(fixture());
  const first = section.content.categories[0].skills[0];
  const second = { id: "skill-dhcp", included: true, name: "DHCP" };
  const initial = [first, second];

  const added = updateSkillTextDraft("New, secure remote access, DHCP", initial).skills;
  assert.equal(added[0].name, "New");
  assert.notEqual(added[0].id, first.id);
  assert.equal(added[1].id, first.id);
  assert.equal(added[2].id, second.id);

  const removed = updateSkillTextDraft("DHCP", added).skills;
  assert.deepEqual(removed.map((skill) => skill.id), [second.id]);

  const edited = updateSkillTextDraft("secure remote access V, DHCP", initial).skills;
  assert.deepEqual(edited.map((skill) => skill.id), [first.id, second.id]);
});

test("blur normalization and canonical changes rebase a stale draft", () => {
  const initial = skillsOf(fixture()).content.categories[0].skills;
  const draftUpdate = updateSkillTextDraft("DNS, DHCP, ", initial);
  assert.equal(draftUpdate.changed, true);
  assert.equal(serializeSkillNames(draftUpdate.skills), "DNS, DHCP");
  assert.equal(rebaseSkillTextDraft(draftUpdate.draft, draftUpdate.skills), draftUpdate.draft);

  const undoneSkills = initial;
  const rebased = rebaseSkillTextDraft(draftUpdate.draft, undoneSkills);
  assert.notEqual(rebased, draftUpdate.draft);
  assert.equal(rebased.value, serializeSkillNames(undoneSkills));
  assert.equal(rebased.canonicalSignature, getSkillSignature(undoneSkills));
});

test("semantic Skills changes use grouped Undo/Redo and remain the preview/persistence source", () => {
  const document = fixture();
  const section = skillsOf(document);
  const category = section.content.categories[0];
  const update = updateSkillTextDraft("secure remote access V", category.skills);
  assert.equal(update.changed, true);

  let workspace = createWorkspaceState(createLibrary(document));
  workspace = workspaceReducer(workspace, {
    type: "document-action",
    action: {
      type: "set-skill-category",
      sectionId: section.id,
      categoryId: category.id,
      category: { ...category, skills: update.skills },
    },
    historyMode: "text",
    coalesceKey: `skills:${category.id}`,
  });
  const updatedDocument = workspace.library.resumes[0];
  assert.equal(skillsOf(updatedDocument).content.categories[0].skills[0].name, "secure remote access V");

  workspace = workspaceReducer(workspace, { type: "commit-text-history" });
  workspace = workspaceReducer(workspace, { type: "undo" });
  assert.equal(skillsOf(workspace.library.resumes[0]).content.categories[0].skills[0].name, "secure remote access");
  workspace = workspaceReducer(workspace, { type: "redo" });
  const redoneDocument = workspace.library.resumes[0];
  assert.equal(skillsOf(redoneDocument).content.categories[0].skills[0].name, "secure remote access V");

  const storage = new MemoryStorage();
  assert.equal(saveResumeLibrary(workspace.library, storage).ok, true);
  const loaded = loadResumeLibrary(legacyResume, storage);
  assert.equal(loaded.ok, true);
  assert.equal(skillsOf(loaded.library!.resumes[0]).content.categories[0].skills[0].name, "secure remote access V");
});

test("raw trailing formatting is not part of canonical persistence and Custom Section spaces remain intact", () => {
  const document = fixture();
  const section = skillsOf(document);
  const category = section.content.categories[0];
  const rawOnly = updateSkillTextDraft("secure remote access ", category.skills);
  assert.equal(rawOnly.changed, false);
  assert.equal(serializeSkillNames(rawOnly.skills), "secure remote access");

  const storage = new MemoryStorage();
  assert.equal(saveResumeLibrary(createLibrary(document), storage).ok, true);
  const loaded = loadResumeLibrary(legacyResume, storage);
  assert.equal(loaded.ok, true);
  assert.equal(skillsOf(loaded.library!.resumes[0]).content.categories[0].skills[0].name, "secure remote access");

  assert.deepEqual(parseCustomSectionLines("Keep  these \nspaces "), ["Keep  these ", "spaces "]);
});
