import assert from "node:assert/strict";
import test from "node:test";

import { migrateLegacyPayload } from "../src/lib/resume-migrations.ts";
import { formatClassicDateRange } from "../src/lib/classic-formatting.ts";
import {
  getIncludedBullets,
  getIncludedSections,
  getIncludedSkillCategories,
  getCertificationMetadataParts,
  getProjectMetadataParts,
  getProjectSupportingMetadataParts,
} from "../src/lib/resume-rendering.ts";

function renderingDocument() {
  return migrateLegacyPayload({
    title: "Rendering",
    header: { name: "A", email: "a@example.com", phone: "", location: "", links: [] },
    summary: "Summary",
    technicalSkills: { title: "Technical Skills", categories: [{ label: "Tools", value: "Git, Docker" }, { label: "Hidden", value: "Secret" }] },
    experience: [{ company: "Visible Co", title: "Role", location: "Remote", dateRange: { startMonth: "Jan", startYear: "2020", current: true }, bullets: ["Visible bullet", "Hidden bullet"] }],
    projects: [{ name: "Project", description: "Description", date: "2024", technologies: "TypeScript", url: "example.test", bullets: ["Project bullet"] }],
    education: [{ school: "School", degree: "Degree", dateRange: { startMonth: "Jan", startYear: "2018", endMonth: "Dec", endYear: "2019", current: false } }],
    customSections: [{ title: "Custom", lines: ["Line"] }],
  });
}

test("included sections follow canonical array order and custom sections participate naturally", () => {
  const document = renderingDocument();
  const custom = document.sections.find((section) => section.type === "custom");
  assert.ok(custom);
  const reordered = { ...document, sections: [
    document.sections.find((section) => section.type === "technicalSkills")!,
    document.sections.find((section) => section.type === "summary")!,
    custom,
    document.sections.find((section) => section.type === "experience")!,
    document.sections.find((section) => section.type === "projects")!,
    document.sections.find((section) => section.type === "education")!,
    document.sections.find((section) => section.type === "certifications")!,
  ] };
  assert.deepEqual(getIncludedSections(reordered).map((section) => section.type), ["technicalSkills", "summary", "custom", "experience", "projects", "education"]);
});

test("included section rendering does not depend on which section is first", () => {
  const document = renderingDocument();
  const byType = (type: (typeof document.sections)[number]["type"]) =>
    document.sections.find((section) => section.type === type)!;

  const summaryFirst = {
    ...document,
    sections: [
      byType("summary"),
      byType("experience"),
      byType("education"),
    ],
  };
  assert.deepEqual(getIncludedSections(summaryFirst).map((section) => section.type), ["summary", "experience", "education"]);

  const experienceFirst = {
    ...document,
    sections: [
      { ...byType("summary"), included: false },
      byType("experience"),
      byType("education"),
    ],
  };
  assert.deepEqual(getIncludedSections(experienceFirst).map((section) => section.type), ["experience", "education"]);

  const educationFirst = {
    ...document,
    sections: [
      { ...byType("summary"), included: false },
      byType("education"),
      byType("experience"),
    ],
  };
  assert.deepEqual(getIncludedSections(educationFirst).map((section) => section.type), ["education", "experience"]);

  const experienceThenSummary = {
    ...document,
    sections: [byType("experience"), byType("summary"), byType("education")],
  };
  assert.deepEqual(getIncludedSections(experienceThenSummary).map((section) => section.type), ["experience", "summary", "education"]);

  const educationThenSummary = {
    ...document,
    sections: [byType("education"), byType("summary"), byType("experience")],
  };
  assert.deepEqual(getIncludedSections(educationThenSummary).map((section) => section.type), ["education", "summary", "experience"]);
});

test("Classic structured dates abbreviate recognized months and preserve unknown values", () => {
  assert.equal(formatClassicDateRange({ startMonth: "September", startYear: "2021", endMonth: "February", endYear: "2025" }), "Sep 2021\u00A0—\u00A0Feb 2025");
  assert.equal(formatClassicDateRange({ startMonth: "Unrecognized month", startYear: "2021", current: true }), "Unrecognized month 2021\u00A0—\u00A0Present");
  assert.equal(formatClassicDateRange({ startMonth: "Aug", startYear: "2021", current: true }), "Aug 2021\u00A0—\u00A0Present");
});

test("excluded sections, bullets, categories, and skills are omitted without deleting stored data", () => {
  const document = renderingDocument();
  const experience = document.sections.find((section) => section.type === "experience");
  const skills = document.sections.find((section) => section.type === "technicalSkills");
  assert.equal(experience?.type, "experience");
  assert.equal(skills?.type, "technicalSkills");
  if (experience?.type === "experience") {
    experience.content.entries[0].bullets[1].included = false;
    experience.content.entries.push({ ...experience.content.entries[0], id: "excluded-entry", included: false });
    assert.deepEqual(getIncludedBullets(experience.content.entries[0].bullets).map((bullet) => bullet.text), ["Visible bullet"]);
    assert.equal(experience.content.entries.length, 2);
  }
  if (skills?.type === "technicalSkills") {
    skills.content.categories[0].skills[1].included = false;
    skills.content.categories[1].included = false;
    const included = getIncludedSkillCategories(skills.content.categories);
    assert.deepEqual(included.map((category) => category.label), ["Tools"]);
    assert.deepEqual(included[0].skills.map((skill) => skill.name), ["Git"]);
    assert.equal(skills.content.categories.length, 2);
  }
});

test("optional project and certification metadata collapses without blank separators", () => {
  const document = renderingDocument();
  const projectSection = document.sections.find((section) => section.type === "projects");
  assert.equal(projectSection?.type, "projects");
  if (projectSection?.type === "projects") {
    assert.deepEqual(getProjectMetadataParts(projectSection.content.entries[0]), ["2024", "TypeScript", "example.test"]);
    assert.deepEqual(getProjectSupportingMetadataParts(projectSection.content.entries[0]), ["TypeScript", "example.test"]);
    assert.deepEqual(getProjectMetadataParts({ ...projectSection.content.entries[0], date: "", technologies: undefined, url: undefined }), []);
    assert.deepEqual(getProjectSupportingMetadataParts({ ...projectSection.content.entries[0], technologies: undefined, url: undefined }), []);
  }
  const certification = { id: "cert", included: true, name: "A+", issuer: "CompTIA", date: "2026" };
  assert.deepEqual(getCertificationMetadataParts(certification), ["CompTIA", "2026"]);
  assert.deepEqual(getCertificationMetadataParts({ id: "cert", included: true, name: "A+" }), []);
});
