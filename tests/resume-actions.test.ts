import assert from "node:assert/strict";
import test from "node:test";

import { applyDocumentAction, getSection } from "../src/lib/resume-actions.ts";
import { emptyHistory, pushHistory, redoHistory, undoHistory, MAX_HISTORY_DEPTH } from "../src/lib/resume-history.ts";
import { createWorkspaceState, workspaceReducer } from "../src/lib/resume-workspace.ts";
import { parseCustomSectionLines } from "../src/lib/resume-text.ts";
import { migrateLegacyPayload } from "../src/lib/resume-migrations.ts";
import { getPreviewStatusLabel } from "../src/lib/resume-preview-status.ts";

function documentFixture() {
  return migrateLegacyPayload({
    title: "Fixture",
    header: { name: "A", email: "a@example.com", phone: "", location: "", links: [] },
    summary: "Summary",
    technicalSkills: { title: "Technical Skills", categories: [{ label: "Tools", value: "Git, Docker" }] },
    experience: [{ company: "Co", title: "Role", location: "Remote", dateRange: { startMonth: "Jan", startYear: "2020", current: true }, bullets: ["One", "Two"] }],
    projects: [],
    education: [{ school: "School", degree: "Degree", dateRange: { startMonth: "Jan", startYear: "2018", endMonth: "Dec", endYear: "2019", current: false } }],
    customSections: [],
  });
}

test("stable-ID actions update nested fields without changing sibling IDs", () => {
  const document = documentFixture();
  const experience = getSection(document, "experience");
  assert.equal(experience?.type, "experience");
  if (experience?.type !== "experience") return;
  const [first, second] = experience.content.entries[0].bullets;
  const next = applyDocumentAction(document, { type: "set-experience-bullet", sectionId: experience.id, entryId: experience.content.entries[0].id, bulletId: first.id, bullet: { ...first, text: "Updated" } });
  const updated = getSection(next, "experience");
  assert.equal(updated?.type, "experience");
  if (updated?.type === "experience") {
    assert.equal(updated.content.entries[0].bullets[0].text, "Updated");
    assert.equal(updated.content.entries[0].bullets[1].id, second.id);
  }
});

test("free-text actions preserve repeated spaces in canonical content", () => {
  const document = documentFixture();
  const experience = getSection(document, "experience");
  assert.equal(experience?.type, "experience");
  if (experience?.type !== "experience") return;
  const entry = experience.content.entries[0];
  const nextEntry = applyDocumentAction(document, { type: "set-experience-entry", sectionId: experience.id, entryId: entry.id, entry: { ...entry, title: "hello  how are", bullets: [{ ...entry.bullets[0], text: "hello     how are" }, entry.bullets[1]] } });
  const updated = getSection(nextEntry, "experience");
  assert.equal(updated?.type, "experience");
  if (updated?.type === "experience") {
    assert.equal(updated.content.entries[0].title, "hello  how are");
    assert.equal(updated.content.entries[0].bullets[0].text, "hello     how are");
  }
});

test("add/delete, inclusion, and reorder actions target IDs", () => {
  const document = documentFixture();
  const experience = getSection(document, "experience");
  assert.equal(experience?.type, "experience");
  if (experience?.type !== "experience") return;
  const entry = experience.content.entries[0];
  const excluded = applyDocumentAction(document, { type: "set-entry-included", sectionId: experience.id, entryId: entry.id, included: false });
  assert.equal(getSection(excluded, "experience")?.content.entries[0].included, false);
  const bulletExcluded = applyDocumentAction(document, { type: "set-bullet-included", sectionId: experience.id, entryId: entry.id, bulletId: entry.bullets[0].id, included: false });
  assert.equal(getSection(bulletExcluded, "experience")?.content.entries[0].bullets[0].included, false);
  const withBullet = applyDocumentAction(document, { type: "add-experience-bullet", sectionId: experience.id, entryId: entry.id, bullet: { id: "new-bullet", text: "Three", included: true } });
  assert.equal(getSection(withBullet, "experience")?.content.entries[0].bullets.length, 3);
  const reordered = applyDocumentAction(withBullet, { type: "move-bullet", sectionId: experience.id, entryId: entry.id, bulletId: "new-bullet", toIndex: 0 });
  assert.equal(getSection(reordered, "experience")?.content.entries[0].bullets[0].id, "new-bullet");
  const addedEntry = { ...entry, id: "new-entry", company: "Other Co", bullets: [] };
  const withEntry = applyDocumentAction(document, { type: "add-experience-entry", sectionId: experience.id, entry: addedEntry });
  assert.equal(getSection(withEntry, "experience")?.content.entries.at(-1)?.id, "new-entry");
  const movedEntry = applyDocumentAction(withEntry, { type: "move-entry", sectionId: experience.id, entryId: "new-entry", toIndex: 0 });
  assert.equal(getSection(movedEntry, "experience")?.content.entries[0].id, "new-entry");
  const withoutEntry = applyDocumentAction(withEntry, { type: "delete-experience-entry", sectionId: experience.id, entryId: "new-entry" });
  assert.equal(getSection(withoutEntry, "experience")?.content.entries.some((item) => item.id === "new-entry"), false);
});

test("experience entry reorder handles first-to-last, last-to-first, and no-op moves by stable ID", () => {
  const document = documentFixture();
  const experience = getSection(document, "experience");
  assert.equal(experience?.type, "experience");
  if (experience?.type !== "experience") return;

  const entries = [
    { ...experience.content.entries[0], id: "experience-one" },
    { ...experience.content.entries[0], id: "experience-two" },
    { ...experience.content.entries[0], id: "experience-three" },
  ];
  const withEntries = applyDocumentAction(document, {
    type: "set-experience-entry",
    sectionId: experience.id,
    entryId: experience.content.entries[0].id,
    entry: entries[0],
  });
  const withThreeEntries = {
    ...withEntries,
    sections: withEntries.sections.map((section) => section.type === "experience"
      ? { ...section, content: { entries } }
      : section),
  };

  const firstToLast = applyDocumentAction(withThreeEntries, {
    type: "move-entry",
    sectionId: experience.id,
    entryId: "experience-one",
    toIndex: 2,
  });
  assert.deepEqual(getSection(firstToLast, "experience")?.content.entries.map((entry) => entry.id), [
    "experience-two",
    "experience-three",
    "experience-one",
  ]);

  const lastToFirst = applyDocumentAction(firstToLast, {
    type: "move-entry",
    sectionId: experience.id,
    entryId: "experience-one",
    toIndex: 0,
  });
  assert.deepEqual(getSection(lastToFirst, "experience")?.content.entries.map((entry) => entry.id), [
    "experience-one",
    "experience-two",
    "experience-three",
  ]);

  const noOp = applyDocumentAction(lastToFirst, {
    type: "move-entry",
    sectionId: experience.id,
    entryId: "experience-one",
    toIndex: 0,
  });
  assert.equal(noOp, lastToFirst);
  assert.equal(applyDocumentAction(lastToFirst, {
    type: "move-entry",
    sectionId: experience.id,
    entryId: "missing",
    toIndex: 1,
  }), lastToFirst);
});

test("experience entry reorder participates in one-step undo and redo", () => {
  const document = documentFixture();
  const experience = getSection(document, "experience");
  assert.equal(experience?.type, "experience");
  if (experience?.type !== "experience") return;

  const entries = [
    { ...experience.content.entries[0], id: "experience-one" },
    { ...experience.content.entries[0], id: "experience-two" },
  ];
  const withEntries = {
    ...document,
    sections: document.sections.map((section) => section.type === "experience"
      ? { ...section, content: { entries } }
      : section),
  };
  const initial = createWorkspaceState({ schemaVersion: 4, activeResumeId: withEntries.id, resumes: [withEntries] });
  const moved = workspaceReducer(initial, {
    type: "document-action",
    action: { type: "move-entry", sectionId: experience.id, entryId: "experience-two", toIndex: 0 },
  });
  assert.deepEqual(getSection(moved.library.resumes[0], "experience")?.content.entries.map((entry) => entry.id), ["experience-two", "experience-one"]);
  assert.equal(moved.histories[withEntries.id].past.length, 1);

  const undone = workspaceReducer(moved, { type: "undo" });
  assert.deepEqual(getSection(undone.library.resumes[0], "experience")?.content.entries.map((entry) => entry.id), ["experience-one", "experience-two"]);
  const redone = workspaceReducer(undone, { type: "redo" });
  assert.deepEqual(getSection(redone.library.resumes[0], "experience")?.content.entries.map((entry) => entry.id), ["experience-two", "experience-one"]);
});

test("education entry reorder uses stable IDs and one-step undo/redo", () => {
  const document = documentFixture();
  const education = getSection(document, "education");
  assert.equal(education?.type, "education");
  if (education?.type !== "education") return;

  const entries = [
    { ...education.content.entries[0], id: "education-one", school: "First school" },
    { ...education.content.entries[0], id: "education-two", school: "Second school" },
    { ...education.content.entries[0], id: "education-three", school: "Third school" },
  ];
  const withEntries = {
    ...document,
    sections: document.sections.map((section) => section.type === "education"
      ? { ...section, content: { entries } }
      : section),
  };

  const firstToLast = applyDocumentAction(withEntries, {
    type: "move-entry",
    sectionId: education.id,
    entryId: "education-one",
    toIndex: 2,
  });
  assert.deepEqual(getSection(firstToLast, "education")?.content.entries.map((entry) => entry.id), ["education-two", "education-three", "education-one"]);

  const lastToFirst = applyDocumentAction(firstToLast, {
    type: "move-entry",
    sectionId: education.id,
    entryId: "education-one",
    toIndex: 0,
  });
  assert.deepEqual(getSection(lastToFirst, "education")?.content.entries.map((entry) => entry.id), ["education-one", "education-two", "education-three"]);
  assert.equal(applyDocumentAction(lastToFirst, { type: "move-entry", sectionId: education.id, entryId: "education-one", toIndex: 0 }), lastToFirst);
  assert.equal(applyDocumentAction(lastToFirst, { type: "move-entry", sectionId: education.id, entryId: "missing", toIndex: 1 }), lastToFirst);

  const initial = createWorkspaceState({ schemaVersion: 4, activeResumeId: withEntries.id, resumes: [withEntries] });
  const moved = workspaceReducer(initial, {
    type: "document-action",
    action: { type: "move-entry", sectionId: education.id, entryId: "education-three", toIndex: 0 },
  });
  assert.deepEqual(getSection(moved.library.resumes[0], "education")?.content.entries.map((entry) => entry.id), ["education-three", "education-one", "education-two"]);
  assert.equal(moved.histories[withEntries.id].past.length, 1);
  const undone = workspaceReducer(moved, { type: "undo" });
  assert.deepEqual(getSection(undone.library.resumes[0], "education")?.content.entries.map((entry) => entry.id), ["education-one", "education-two", "education-three"]);
  const redone = workspaceReducer(undone, { type: "redo" });
  assert.deepEqual(getSection(redone.library.resumes[0], "education")?.content.entries.map((entry) => entry.id), ["education-three", "education-one", "education-two"]);
});

test("project and project-bullet actions preserve stable IDs and ordering", () => {
  const document = documentFixture();
  const projects = getSection(document, "projects");
  assert.equal(projects?.type, "projects");
  if (projects?.type !== "projects") return;

  const firstProject = {
    id: "project-one",
    included: true,
    name: "First project",
    description: "Description",
    date: "2024",
    technologies: "TypeScript",
    url: "https://example.test",
    bullets: [
      { id: "project-one-bullet-one", text: "One", included: true },
      { id: "project-one-bullet-two", text: "Two", included: true },
    ],
  };
  const secondProject = {
    ...firstProject,
    id: "project-two",
    name: "Second project",
    bullets: [{ id: "project-two-bullet-one", text: "Three", included: true }],
  };

  const withProjects = applyDocumentAction(document, { type: "add-project-entry", sectionId: projects.id, entry: firstProject });
  const withSecondProject = applyDocumentAction(withProjects, { type: "add-project-entry", sectionId: projects.id, entry: secondProject });
  const movedProject = applyDocumentAction(withSecondProject, { type: "move-entry", sectionId: projects.id, entryId: secondProject.id, toIndex: 0 });
  assert.deepEqual(getSection(movedProject, "projects")?.content.entries.map((entry) => entry.id), [secondProject.id, firstProject.id]);

  const updatedProject = applyDocumentAction(movedProject, {
    type: "set-project-entry",
    sectionId: projects.id,
    entryId: firstProject.id,
    entry: { ...firstProject, name: "Updated project" },
  });
  const updatedProjectSection = getSection(updatedProject, "projects");
  assert.equal(updatedProjectSection?.type, "projects");
  if (updatedProjectSection?.type !== "projects") return;
  assert.equal(updatedProjectSection.content.entries[1].name, "Updated project");
  assert.equal(updatedProjectSection.content.entries[1].bullets[0].id, firstProject.bullets[0].id);

  const addedBullet = applyDocumentAction(updatedProject, {
    type: "add-project-bullet",
    sectionId: projects.id,
    entryId: firstProject.id,
    bullet: { id: "project-one-bullet-three", text: "Four", included: true },
  });
  const movedBullet = applyDocumentAction(addedBullet, {
    type: "move-bullet",
    sectionId: projects.id,
    entryId: firstProject.id,
    bulletId: "project-one-bullet-three",
    toIndex: 0,
  });
  const updatedBullet = applyDocumentAction(movedBullet, {
    type: "set-project-bullet",
    sectionId: projects.id,
    entryId: firstProject.id,
    bulletId: "project-one-bullet-three",
    bullet: { id: "project-one-bullet-three", text: "Updated four", included: true },
  });
  const deletedBullet = applyDocumentAction(updatedBullet, {
    type: "delete-project-bullet",
    sectionId: projects.id,
    entryId: firstProject.id,
    bulletId: "project-one-bullet-two",
  });
  const deletedProject = applyDocumentAction(deletedBullet, { type: "delete-project-entry", sectionId: projects.id, entryId: secondProject.id });
  const finalSection = getSection(deletedProject, "projects");
  assert.equal(finalSection?.type, "projects");
  if (finalSection?.type === "projects") {
    assert.deepEqual(finalSection.content.entries.map((entry) => entry.id), [firstProject.id]);
    assert.deepEqual(finalSection.content.entries[0].bullets.map((bullet) => [bullet.id, bullet.text]), [
      ["project-one-bullet-three", "Updated four"],
      ["project-one-bullet-one", "One"],
    ]);
  }
});

test("project mutations participate in the existing resume-scoped history", () => {
  const document = documentFixture();
  const projects = getSection(document, "projects");
  assert.equal(projects?.type, "projects");
  if (projects?.type !== "projects") return;

  const project = {
    id: "history-project",
    included: true,
    name: "History project",
    bullets: [{ id: "history-bullet", text: "Bullet", included: true }],
  };
  const initial = createWorkspaceState({ schemaVersion: 4, activeResumeId: document.id, resumes: [document] });
  const added = workspaceReducer(initial, {
    type: "document-action",
    action: { type: "add-project-entry", sectionId: projects.id, entry: project },
  });
  assert.equal(getSection(added.library.resumes[0], "projects")?.content.entries.length, 1);

  const undone = workspaceReducer(added, { type: "undo" });
  assert.equal(getSection(undone.library.resumes[0], "projects")?.content.entries.length, 0);
  const redone = workspaceReducer(undone, { type: "redo" });
  assert.equal(getSection(redone.library.resumes[0], "projects")?.content.entries[0].id, project.id);
});

test("section reorder and snapshot undo/redo work", () => {
  const document = documentFixture();
  const projects = getSection(document, "projects");
  assert.ok(projects);
  const moved = applyDocumentAction(document, { type: "move-section", sectionId: projects.id, toIndex: 0 });
  assert.equal(moved.sections[0].id, projects.id);
  const history = pushHistory(emptyHistory(), document, moved);
  const undone = undoHistory(history, moved);
  assert.equal(undone.document.sections[0].type, "summary");
  const redone = redoHistory(undone.history, undone.document);
  assert.equal(redone.document.sections[0].id, projects.id);
});

test("a completed reorder records one resume-scoped undo step", () => {
  const document = documentFixture();
  const projects = getSection(document, "projects");
  assert.ok(projects);
  const initial = createWorkspaceState({ schemaVersion: 4, activeResumeId: document.id, resumes: [document] });
  const moved = workspaceReducer(initial, {
    type: "document-action",
    action: { type: "move-section", sectionId: projects.id, toIndex: 0 },
  });

  assert.equal(moved.histories[document.id].past.length, 1);
  assert.equal(moved.library.resumes[0].sections[0].id, projects.id);

  const undone = workspaceReducer(moved, { type: "undo" });
  assert.equal(undone.library.resumes[0].sections[0].type, "summary");
  assert.equal(undone.histories[document.id].future.length, 1);
});

test("invalid or no-op reorders leave canonical documents unchanged", () => {
  const document = documentFixture();
  const experience = getSection(document, "experience");
  assert.equal(experience?.type, "experience");
  if (experience?.type !== "experience") return;
  const entry = experience.content.entries[0];
  const bullet = entry.bullets[0];

  assert.equal(
    applyDocumentAction(document, { type: "move-section", sectionId: "missing", toIndex: 0 }),
    document,
  );
  assert.equal(
    applyDocumentAction(document, { type: "move-bullet", sectionId: experience.id, entryId: entry.id, bulletId: bullet.id, toIndex: 0 }),
    document,
  );
  assert.equal(
    applyDocumentAction(document, { type: "move-bullet", sectionId: experience.id, entryId: entry.id, bulletId: "missing", toIndex: 1 }),
    document,
  );
});

test("section inclusion and movement preserve canonical IDs and stored content", () => {
  const document = documentFixture();
  const projects = getSection(document, "projects");
  const withCustom = applyDocumentAction(document, {
    type: "add-custom-section",
    section: {
      id: "custom-interleaved",
      type: "custom",
      included: true,
      content: { title: "Open Source", lines: ["Maintainer"] },
    },
  });
  const custom = withCustom.sections.at(-1)!;
  assert.equal(projects?.type, "projects");
  const excluded = applyDocumentAction(withCustom, {
    type: "set-section-included",
    sectionId: projects?.id ?? "",
    included: false,
  });
  const excludedProjects = getSection(excluded, "projects");
  assert.equal(excludedProjects?.included, false);
  assert.equal(excludedProjects?.type, "projects");
  if (excludedProjects?.type === "projects") assert.equal(excludedProjects.content.entries.length, 0);

  const moved = applyDocumentAction(excluded, {
    type: "move-section",
    sectionId: custom.id,
    toIndex: 1,
  });
  assert.equal(moved.sections[1].id, custom.id);
  assert.equal(moved.sections.find((section) => section.id === projects?.id)?.included, false);
  assert.equal(moved.sections.find((section) => section.id === custom.id)?.id, custom.id);
});

test("section inclusion participates in resume-scoped history", () => {
  const document = documentFixture();
  const experience = getSection(document, "experience");
  assert.ok(experience);
  const excluded = applyDocumentAction(document, {
    type: "set-section-included",
    sectionId: experience.id,
    included: false,
  });
  const history = pushHistory(emptyHistory(), document, excluded);
  const undone = undoHistory(history, excluded);
  assert.equal(getSection(undone.document, "experience")?.included, true);
  const redone = redoHistory(undone.history, undone.document);
  assert.equal(getSection(redone.document, "experience")?.included, false);
});

test("workspace histories are capped, scoped, and clear redo after a new edit", () => {
  const first = documentFixture();
  const second = { ...documentFixture(), id: "second" };
  const library = { schemaVersion: 4 as const, activeResumeId: first.id, resumes: [first, second] };
  let state = createWorkspaceState(library);
  const summary = getSection(first, "summary");
  assert.ok(summary);
  for (let index = 0; index < MAX_HISTORY_DEPTH + 5; index += 1) {
    state = workspaceReducer(state, { type: "document-action", action: { type: "set-summary", sectionId: summary.id, text: String(index) } });
  }
  assert.equal(state.histories[first.id].past.length, MAX_HISTORY_DEPTH);
  state = workspaceReducer(state, { type: "undo" });
  assert.equal(state.histories[first.id].future.length, 1);
  state = workspaceReducer(state, { type: "document-action", action: { type: "set-summary", sectionId: summary.id, text: "new" } });
  assert.equal(state.histories[first.id].future.length, 0);
  state = workspaceReducer({ ...state, library: { ...state.library, activeResumeId: second.id } }, { type: "undo" });
  assert.equal(state.library.activeResumeId, second.id);
  assert.equal(state.histories[second.id].past.length, 0);
});

test("text actions coalesce until committed", () => {
  const document = documentFixture();
  const summary = getSection(document, "summary");
  assert.ok(summary);
  let state = createWorkspaceState({ schemaVersion: 4, activeResumeId: document.id, resumes: [document] });
  state = workspaceReducer(state, { type: "document-action", historyMode: "text", coalesceKey: "summary", action: { type: "set-summary", sectionId: summary.id, text: "A" } });
  state = workspaceReducer(state, { type: "document-action", historyMode: "text", coalesceKey: "summary", action: { type: "set-summary", sectionId: summary.id, text: "AB" } });
  assert.equal(state.histories[document.id].past.length, 0);
  state = workspaceReducer(state, { type: "commit-text-history" });
  assert.equal(state.histories[document.id].past.length, 1);
});

test("custom section text preserves spaces exactly while editing", () => {
  assert.deepEqual(parseCustomSectionLines("Open Source "), ["Open Source "]);
  assert.deepEqual(parseCustomSectionLines("Open Source line 1\nLine 2  "), ["Open Source line 1", "Line 2  "]);
  const document = migrateLegacyPayload({
    title: "Custom",
    header: { name: "A", email: "a@example.com", phone: "", location: "", links: [] },
    summary: "",
    technicalSkills: { title: "Technical Skills", categories: [] },
    experience: [],
    projects: [],
    education: [],
    customSections: [{ title: "Open Source", lines: [] }],
  });
  const section = document.sections.find((candidate) => candidate.type === "custom");
  assert.equal(section?.type, "custom");
  if (section?.type === "custom") {
    const next = applyDocumentAction(document, { type: "set-custom-section", sectionId: section.id, section: { ...section, content: { ...section.content, lines: parseCustomSectionLines("Line with ") } } });
    const updated = next.sections.find((candidate) => candidate.id === section.id);
    assert.equal(updated?.type, "custom");
    if (updated?.type === "custom") assert.deepEqual(updated.content.lines, ["Line with "]);
  }
});

test("custom multiline updates preserve identity, order, blank lines, and whitespace", () => {
  const document = migrateLegacyPayload({
    ...{
      title: "Custom",
      header: { name: "A", email: "a@example.com", phone: "", location: "", links: [] },
      summary: "Summary",
      technicalSkills: { title: "Technical Skills", categories: [] },
      experience: [],
      projects: [],
      education: [],
      customSections: [{ id: "custom-one", title: "Open Source", lines: ["Existing"] }],
    },
  });
  const custom = document.sections.find((section) => section.id === "custom-one");
  assert.equal(custom?.type, "custom");
  if (custom?.type !== "custom") return;
  const summary = document.sections.find((section) => section.type === "summary");
  assert.ok(summary);

  const next = applyDocumentAction(document, {
    type: "set-custom-section",
    sectionId: custom.id,
    section: {
      ...custom,
      content: { ...custom.content, lines: ["First line", "", "Third  line  "] },
    },
  });

  assert.deepEqual(next.sections.map((section) => section.id), document.sections.map((section) => section.id));
  assert.equal(next.sections.find((section) => section.id === custom.id)?.id, custom.id);
  assert.deepEqual(next.sections.find((section) => section.id === custom.id)?.type === "custom"
    ? (next.sections.find((section) => section.id === custom.id) as Extract<typeof custom, { type: "custom" }>).content.lines
    : [], ["First line", "", "Third  line  "]);
  assert.equal(next.sections.find((section) => section.id === summary.id), summary);
});

test("grouped custom multiline typing supports undo and redo", () => {
  const document = migrateLegacyPayload({
    title: "Custom",
    header: { name: "A", email: "a@example.com", phone: "", location: "", links: [] },
    summary: "Summary",
    technicalSkills: { title: "Technical Skills", categories: [] },
    experience: [],
    projects: [],
    education: [],
    customSections: [{ id: "custom-one", title: "Open Source", lines: ["Existing"] }],
  });
  const custom = document.sections.find((section) => section.id === "custom-one");
  assert.equal(custom?.type, "custom");
  if (custom?.type !== "custom") return;
  let state = createWorkspaceState({ schemaVersion: 4, activeResumeId: document.id, resumes: [document] });
  const action = (lines: string[]) => ({
    type: "set-custom-section" as const,
    sectionId: custom.id,
    section: { ...custom, content: { ...custom.content, lines } },
  });

  state = workspaceReducer(state, { type: "document-action", historyMode: "text", coalesceKey: `custom:${custom.id}:lines`, action: action(["First"]) });
  state = workspaceReducer(state, { type: "document-action", historyMode: "text", coalesceKey: `custom:${custom.id}:lines`, action: action(["First", "", "Third  "]) });
  assert.equal(state.histories[document.id].past.length, 0);
  state = workspaceReducer(state, { type: "commit-text-history" });
  assert.equal(state.histories[document.id].past.length, 1);

  state = workspaceReducer(state, { type: "undo" });
  const undone = state.library.resumes[0].sections.find((section) => section.id === custom.id);
  assert.equal(undone?.type, "custom");
  if (undone?.type === "custom") assert.deepEqual(undone.content.lines, ["Existing"]);

  state = workspaceReducer(state, { type: "redo" });
  const redone = state.library.resumes[0].sections.find((section) => section.id === custom.id);
  assert.equal(redone?.type, "custom");
  if (redone?.type === "custom") assert.deepEqual(redone.content.lines, ["First", "", "Third  "]);
});

test("preview status stays truthful without active-page wording", () => {
  assert.equal(getPreviewStatusLabel({ saveStatus: "saving", isOverflowing: true, isNearLimit: false, pageFillPercent: 100 }), "Saving…");
  assert.equal(getPreviewStatusLabel({ saveStatus: "error", isOverflowing: true, isNearLimit: false, pageFillPercent: 100 }), "Unable to save locally");
  assert.equal(getPreviewStatusLabel({ saveStatus: "saved", isOverflowing: true, isNearLimit: false, pageFillPercent: 108 }), "Saved locally");
  assert.equal(getPreviewStatusLabel({ saveStatus: "saved", isOverflowing: true, isNearLimit: true, pageFillPercent: 95 }), "Saved locally");
  assert.equal(getPreviewStatusLabel({ saveStatus: "saved", isOverflowing: false, isNearLimit: true, pageFillPercent: 95 }), "Saved locally · 95% used");
  assert.equal(getPreviewStatusLabel({ saveStatus: "saved", isOverflowing: false, isNearLimit: false, pageFillPercent: 50 }), "Saved locally");
});
