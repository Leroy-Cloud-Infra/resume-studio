import assert from "node:assert/strict";
import test from "node:test";

import {
  isValidResumeDocument,
  migrateLegacyPayload,
  mergeLegacyResume,
  toLegacyResume,
} from "../src/lib/resume-migrations.ts";
import {
  LEGACY_RESUME_STORAGE_KEY,
  RESUME_LIBRARY_STORAGE_KEY,
  isValidResumeLibrary,
  loadResumeLibrary,
  saveResumeLibrary,
} from "../src/lib/resume-library.ts";

const dateRange = { startMonth: "Jan", startYear: "2020", endMonth: "Dec", endYear: "2022", current: false };

function legacyResume(overrides: Record<string, unknown> = {}) {
  return {
    title: "Test Resume",
    header: { name: "Cesar", email: "cesar@example.com", phone: "555-0100", location: "Oregon", links: ["github.com/cesar"] },
    summary: "A structured summary.",
    technicalSkills: { title: "Technical Skills", categories: [{ id: "category-old", label: "Tools", value: "Git, Docker\nSSH" }] },
    experience: [{ company: "Example Co", title: "Technician", location: "Remote", dateRange, bullets: ["First bullet", "Second bullet"] }],
    projects: [{ name: "Resume Studio", description: "A local resume tool.", bullets: ["Built the editor"] }],
    education: [
      { school: "University", degree: "B.S.", dateRange, coursework: ["Networks", "Systems"] },
      { school: "College", degree: "Certificate", dateRange: { startMonth: "Jan", startYear: "2018", endMonth: "Dec", endYear: "2019", current: false }, coursework: [] },
    ],
    customSections: [{ id: "custom-old", title: "Open Source", lines: ["Maintainer"] }],
    ...overrides,
  };
}

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

class FailingStorage extends MemoryStorage {
  setItem() { throw new Error("quota"); }
}

test("migrates the current v3 shape without losing content", () => {
  const legacy = legacyResume();
  const original = JSON.stringify(legacy);
  const document = migrateLegacyPayload({ version: 3, resume: legacy }, { now: "2026-01-01T00:00:00.000Z" });
  assert.equal(JSON.stringify(legacy), original);
  assert.equal(document.schemaVersion, 4);
  assert.deepEqual(document.header.links, legacy.header.links);
  assert.equal(document.sections.map((section) => section.type).join(","), "summary,experience,projects,education,technicalSkills,certifications,custom");
  assert.equal(document.sections.find((section) => section.type === "projects")?.included, true);
  assert.equal(document.sections.find((section) => section.type === "certifications")?.included, false);
  assert.equal(document.sections.filter((section) => section.type === "custom").length, 1);
  assert.equal(document.sections.find((section) => section.type === "projects")?.content.entries[0].description, "A local resume tool.");
  const ids = document.sections.flatMap((section) => {
    if (section.type === "experience" || section.type === "projects") {
      return [section.id, ...section.content.entries.flatMap((entry) => [entry.id, ...entry.bullets.map((bullet) => bullet.id)])];
    }
    if (section.type === "education" || section.type === "certifications") {
      return [section.id, ...section.content.entries.map((entry) => entry.id)];
    }
    if (section.type === "technicalSkills") {
      return [section.id, ...section.content.categories.flatMap((category) => [category.id, ...category.skills.map((skill) => skill.id)])];
    }
    return [section.id];
  });
  assert.equal(ids.every((id) => typeof id === "string" && id.length > 0), true);
  assert.equal(new Set([document.id, ...ids]).size, ids.length + 1);
  const skills = document.sections.find((section) => section.type === "technicalSkills");
  assert.equal(skills?.type, "technicalSkills");
  if (skills?.type === "technicalSkills") assert.deepEqual(skills.content.categories[0].skills.map((skill) => skill.name), ["Git", "Docker", "SSH"]);
  assert.equal(isValidResumeDocument(document), true);
});

test("migrates supported legacy date strings and skill groups", () => {
  const document = migrateLegacyPayload({
    title: "Legacy",
    header: { name: "A", email: "a@b.test", phone: "", location: "", links: [] },
    summary: "",
    skills: [{ category: "Platforms", items: ["macOS", "Linux"] }],
    experience: [{ company: "Co", title: "Role", location: "", dates: "Jun 2022 — Present", bullets: ["Worked"] }],
    education: [{ school: "School", degree: "Degree", dates: "Jan 2020 — Dec 2021" }],
  });
  const experience = document.sections.find((section) => section.type === "experience");
  assert.equal(experience?.type, "experience");
  if (experience?.type === "experience") assert.equal(experience.content.entries[0].dateRange.current, true);
  const skills = document.sections.find((section) => section.type === "technicalSkills");
  assert.equal(skills?.type, "technicalSkills");
  if (skills?.type === "technicalSkills") assert.deepEqual(skills.content.categories[0].skills.map((skill) => skill.name), ["macOS", "Linux"]);
});

test("empty projects remain structurally present but excluded", () => {
  const document = migrateLegacyPayload(legacyResume({ projects: [] }));
  const projects = document.sections.find((section) => section.type === "projects");
  assert.equal(projects?.type, "projects");
  assert.equal(projects?.included, false);
  assert.equal(projects?.content.entries.length, 0);
});

test("library migration preserves legacy storage and does not repeat", () => {
  const storage = new MemoryStorage();
  const legacy = legacyResume();
  storage.setItem(LEGACY_RESUME_STORAGE_KEY, JSON.stringify({ version: 3, resume: legacy }));
  const legacyBefore = storage.getItem(LEGACY_RESUME_STORAGE_KEY);
  const first = loadResumeLibrary(legacy as never, storage, { now: "2026-01-01T00:00:00.000Z" });
  assert.equal(first.ok, true);
  assert.equal(first.status, "migrated");
  assert.equal(storage.getItem(LEGACY_RESUME_STORAGE_KEY), legacyBefore);
  assert.equal(isValidResumeLibrary(JSON.parse(storage.getItem(RESUME_LIBRARY_STORAGE_KEY) ?? "null")), true);
  const second = loadResumeLibrary(legacy as never, storage);
  assert.equal(second.status, "loaded");
  assert.equal(second.library?.activeResumeId, first.library?.activeResumeId);
});

test("malformed legacy data fails without creating a v4 library", () => {
  const storage = new MemoryStorage();
  const raw = JSON.stringify({ version: 3, resume: legacyResume({ experience: "invalid" }) });
  storage.setItem(LEGACY_RESUME_STORAGE_KEY, raw);
  const result = loadResumeLibrary(legacyResume() as never, storage);
  assert.equal(result.ok, false);
  assert.equal(storage.getItem(LEGACY_RESUME_STORAGE_KEY), raw);
  assert.equal(storage.getItem(RESUME_LIBRARY_STORAGE_KEY), null);
});

test("storage write failures are reported without claiming persistence", () => {
  const document = migrateLegacyPayload(legacyResume());
  const result = saveResumeLibrary({ schemaVersion: 4, activeResumeId: document.id, resumes: [document] }, new FailingStorage());
  assert.equal(result.ok, false);
});

test("library validation rejects duplicate or missing standard sections", () => {
  const document = migrateLegacyPayload(legacyResume());
  const duplicate = { ...document, sections: [...document.sections, document.sections[0]] };
  const missing = { ...document, sections: document.sections.filter((section) => section.type !== "certifications") };
  assert.equal(isValidResumeDocument(duplicate), false);
  assert.equal(isValidResumeDocument(missing), false);
});

test("custom sections remain repeatable and an invalid active ID is rejected", () => {
  const document = migrateLegacyPayload(legacyResume({
    customSections: [
      { title: "Awards", lines: ["Award one"] },
      { title: "Languages", lines: ["English"] },
    ],
  }));
  assert.equal(document.sections.filter((section) => section.type === "custom").length, 2);
  const invalidLibrary = { schemaVersion: 4, activeResumeId: "missing", resumes: [document] };
  assert.equal(isValidResumeLibrary(invalidLibrary), false);
});

test("excluded content remains stored but is absent from the render projection", () => {
  const document = migrateLegacyPayload(legacyResume());
  const experience = document.sections.find((section) => section.type === "experience");
  assert.equal(experience?.type, "experience");
  if (experience?.type === "experience") experience.included = false;
  const projection = toLegacyResume(document, true);
  assert.equal(projection.experience.length, 0);
  assert.equal(document.sections.find((section) => section.type === "experience")?.content.entries.length, 1);
});

test("compatibility merge preserves repeated free-text spaces", () => {
  const document = migrateLegacyPayload(legacyResume());
  const projection = toLegacyResume(document);
  projection.experience[0].title = "hello  how are";
  projection.experience[0].bullets[0] = "hello     how are";
  const merged = mergeLegacyResume(document, projection);
  const roundTrip = toLegacyResume(merged);
  assert.equal(roundTrip.experience[0].title, "hello  how are");
  assert.equal(roundTrip.experience[0].bullets[0], "hello     how are");
});

test("compatibility merge preserves interleaved custom section order", () => {
  const document = migrateLegacyPayload(legacyResume({
    customSections: [
      { id: "custom-one", title: "Open Source", lines: ["Maintainer"] },
      { id: "custom-two", title: "Languages", lines: ["English"] },
    ],
  }));
  const standard = (type: string) => document.sections.find((section) => section.type === type)!;
  const customOne = document.sections.find((section) => section.id === "custom-one")!;
  const customTwo = document.sections.find((section) => section.id === "custom-two")!;
  const reordered = {
    ...document,
    sections: [
      standard("summary"),
      standard("experience"),
      customOne,
      standard("technicalSkills"),
      customTwo,
      standard("education"),
      standard("projects"),
      standard("certifications"),
    ],
  };
  const legacy = toLegacyResume(reordered);
  legacy.experience[0].title = "Updated role";
  const merged = mergeLegacyResume(reordered, legacy);
  assert.deepEqual(
    merged.sections.map((section) => section.id),
    reordered.sections.map((section) => section.id),
  );
  assert.equal(merged.sections.find((section) => section.id === "custom-one")?.type, "custom");
  assert.equal(merged.sections.find((section) => section.id === "custom-two")?.type, "custom");
});

test("library save and load preserves canonical order and section inclusion", () => {
  const storage = new MemoryStorage();
  const document = migrateLegacyPayload(legacyResume({ projects: [] }));
  const projects = document.sections.find((section) => section.type === "projects")!;
  const custom = document.sections.find((section) => section.type === "custom")!;
  const reordered = {
    ...document,
    sections: [
      document.sections.find((section) => section.type === "summary")!,
      document.sections.find((section) => section.type === "experience")!,
      custom,
      document.sections.find((section) => section.type === "technicalSkills")!,
      projects,
      document.sections.find((section) => section.type === "education")!,
      document.sections.find((section) => section.type === "certifications")!,
    ],
  };
  projects.included = true;
  const library = { schemaVersion: 4 as const, activeResumeId: reordered.id, resumes: [reordered] };
  assert.equal(saveResumeLibrary(library, storage).ok, true);
  const loaded = loadResumeLibrary(legacyResume() as never, storage);
  assert.equal(loaded.ok, true);
  assert.deepEqual(loaded.library?.resumes[0].sections.map((section) => section.id), reordered.sections.map((section) => section.id));
  assert.equal(loaded.library?.resumes[0].sections.find((section) => section.type === "projects")?.included, true);
});
