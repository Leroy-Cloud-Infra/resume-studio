import assert from "node:assert/strict";
import test from "node:test";

import { migrateLegacyPayload } from "../src/lib/resume-migrations.ts";
import {
  readLastOpenSectionId,
  resolveLastOpenSectionId,
  writeLastOpenSectionId,
} from "../src/lib/resume-preferences.ts";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function documentFixture() {
  return migrateLegacyPayload({
    title: "Preferences",
    header: { name: "A", email: "a@example.com", phone: "", location: "", links: [] },
    summary: "",
    technicalSkills: { title: "Technical Skills", categories: [] },
    experience: [],
    projects: [],
    education: [],
    customSections: [],
  });
}

test("disclosure preferences restore header, canonical sections, and explicit collapse", () => {
  const storage = new MemoryStorage();
  const document = documentFixture();
  const education = document.sections.find((section) => section.type === "education")!;

  assert.equal(readLastOpenSectionId(document.id, storage), undefined);
  assert.equal(writeLastOpenSectionId(document.id, "header", storage).ok, true);
  assert.equal(readLastOpenSectionId(document.id, storage), "header");
  assert.equal(resolveLastOpenSectionId(document, "header"), "header");

  assert.equal(writeLastOpenSectionId(document.id, education.id, storage).ok, true);
  assert.equal(resolveLastOpenSectionId(document, readLastOpenSectionId(document.id, storage)), education.id);

  assert.equal(writeLastOpenSectionId(document.id, null, storage).ok, true);
  assert.equal(readLastOpenSectionId(document.id, storage), null);
  assert.equal(resolveLastOpenSectionId(document, null), null);
  assert.equal(resolveLastOpenSectionId(document, "stale-section"), null);
  assert.equal(document.sections.some((section) => section.id === education.id), true);
});
