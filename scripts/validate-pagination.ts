import { chromium } from "playwright";
import assert from "node:assert/strict";
import { createStableId } from "../src/lib/stable-id.ts";

type JsonRecord = Record<string, unknown>;

const BASE_URL = process.env.RESUME_STUDIO_URL ?? "http://localhost:3000";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function addCustomContent(document: JsonRecord, lines: string[]) {
  const next = clone(document);
  const sections = next.sections as JsonRecord[];

  next.id = createStableId();
  next.sections = [
    ...sections.filter((section) => section.type !== "custom"),
    {
      id: createStableId(),
      type: "custom",
      included: true,
      content: { title: "Pagination Fixture", lines },
    },
  ];

  return next;
}

function makeComfortablyUnderPage(document: JsonRecord) {
  const next = clone(document);
  const sections = next.sections as JsonRecord[];

  next.id = createStableId();
  next.sections = sections.map((section) =>
    section.type === "experience" || section.type === "technicalSkills"
      ? { ...section, included: false }
      : section,
  );

  return next;
}

function placeSectionAfterBoundaryContent(document: JsonRecord, type: string, lineCount: number) {
  const next = addCustomContent(document, Array.from(
    { length: lineCount },
    (_, index) => `Boundary preparation line ${index + 1} with ordinary resume-width text.`,
  ));
  const sections = next.sections as JsonRecord[];
  const target = sections.find((section) => section.type === type);
  if (!target) throw new Error(`Missing ${type} section in boundary fixture.`);
  next.sections = [...sections.filter((section) => section.id !== target.id), target];
  return next;
}

function countPdfPages(bytes: ArrayBuffer) {
  const source = Buffer.from(bytes).toString("latin1");
  return (source.match(/\/Type\s*\/Page\b/g) ?? []).length;
}

async function loadDocument(page: import("playwright").Page, document: JsonRecord) {
  const library = JSON.stringify({ schemaVersion: 4, activeResumeId: document.id, resumes: [document] });
  await page.evaluate((value: string) => localStorage.setItem("resume-studio.library.v4", value), library);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(350);
}

async function assertClassicComposition(page: import("playwright").Page) {
  const inspection = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>(".resume-document");
    if (!root) throw new Error("Classic preview document is missing.");
    const header = root.querySelector<HTMLElement>(".resume-document-header");
    const sections = [...root.querySelectorAll<HTMLElement>(".resume-section")];
    const summary = sections.find((section) => section.querySelector("h3")?.textContent?.trim() === "Summary");
    const experienceHeading = sections.find((section) => section.querySelector("h3")?.textContent?.trim() === "Work Experience");
    const experienceRow = experienceHeading?.querySelector<HTMLElement>(".resume-entry-header");
    const identity = experienceRow?.querySelector<HTMLElement>(".resume-entry-identity");
    const date = experienceRow?.querySelector<HTMLElement>(".resume-row-date");

    return {
      headerBorderBottomWidth: header ? getComputedStyle(header).borderBottomWidth : null,
      sectionTitles: sections.map((section) => section.querySelector("h3")?.textContent?.trim() ?? ""),
      sectionRules: sections.map((section) => {
        const heading = section.querySelector<HTMLElement>("h3");
        return heading ? {
          bottomWidth: getComputedStyle(heading).borderBottomWidth,
          bottomStyle: getComputedStyle(heading).borderBottomStyle,
          topWidth: getComputedStyle(heading).borderTopWidth,
        } : null;
      }),
      summaryWidths: summary ? {
        section: summary.getBoundingClientRect().width,
        body: summary.querySelector(".resume-summary-content")?.getBoundingClientRect().width ?? 0,
      } : null,
      experienceChildren: experienceRow ? [...experienceRow.children].map((child) => (child as HTMLElement).className) : null,
      experienceBounds: identity && date && experienceRow ? {
        row: experienceRow.getBoundingClientRect().toJSON(),
        identity: identity.getBoundingClientRect().toJSON(),
        date: date.getBoundingClientRect().toJSON(),
      } : null,
    };
  });

  assert.equal(Number.parseFloat(inspection.headerBorderBottomWidth ?? "0"), 0, "header should not have a decorative bottom rule");
  for (const rule of inspection.sectionRules) {
    assert.ok(rule);
    assert.ok(Number.parseFloat(rule.bottomWidth) > 0, "each section title should own a rule below it");
    assert.equal(rule.bottomStyle, "solid");
    assert.equal(Number.parseFloat(rule.topWidth), 0, "section rules should not remain above titles");
  }
  if (inspection.summaryWidths) {
    assert.ok(Math.abs(inspection.summaryWidths.section - inspection.summaryWidths.body) < 1, "Summary body should use the full section width");
  }
  if (inspection.experienceChildren && inspection.experienceBounds) {
    assert.match(inspection.experienceChildren[0], /resume-entry-identity/);
    assert.match(inspection.experienceChildren[1], /resume-row-date/);
    assert.ok(inspection.experienceBounds.identity.right <= inspection.experienceBounds.date.left + 1, "Experience identity must not collide with its date");
    assert.ok(inspection.experienceBounds.date.right <= inspection.experienceBounds.row.right + 1, "Experience date should remain within the content rail");
  }
  return inspection.sectionTitles;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const storedDocument = await page.evaluate(() => {
      const library = JSON.parse(localStorage.getItem("resume-studio.library.v4") ?? "null") as JsonRecord | null;
      const resumes = (library?.resumes as JsonRecord[] | undefined) ?? [];
      return resumes.find((document) => document.id === library?.activeResumeId) ?? null;
    });

    if (!storedDocument) {
      throw new Error("No active v4 document found in the isolated browser context.");
    }

    const baselineTitles = await assertClassicComposition(page);

    const reordered = clone(storedDocument);
    (reordered.sections as JsonRecord[]).reverse();
    await loadDocument(page, reordered);
    assert.deepEqual(await assertClassicComposition(page), [...baselineTitles].reverse(), "preview should follow canonical section order");

    const summaryExcluded = clone(storedDocument);
    const summarySection = (summaryExcluded.sections as JsonRecord[]).find((section) => section.type === "summary");
    if (summarySection) summarySection.included = false;
    await loadDocument(page, summaryExcluded);
    const withoutSummary = await assertClassicComposition(page);
    assert.ok(!withoutSummary.includes("Summary"), "excluded Summary should not render");

    const longExperience = clone(storedDocument);
    const experienceSection = (longExperience.sections as JsonRecord[]).find((section) => section.type === "experience");
    const experienceContent = experienceSection?.content as JsonRecord | undefined;
    const experienceEntries = experienceContent?.entries as JsonRecord[] | undefined;
    if (experienceEntries?.[0]) {
      experienceEntries[0].title = `Senior ${"Customer Support Specialist ".repeat(8)}`;
      experienceEntries[0].company = `A Long Employer Name ${"Across Multiple Divisions ".repeat(4)}`;
      experienceEntries[0].location = "Portland, Oregon and surrounding service area";
      await loadDocument(page, longExperience);
      await assertClassicComposition(page);
    }

    const sectionContentFixture = clone(storedDocument);
    const fixtureSections = sectionContentFixture.sections as JsonRecord[];
    const projectsSection = fixtureSections.find((section) => section.type === "projects");
    const certificationsSection = fixtureSections.find((section) => section.type === "certifications");
    const customSection = fixtureSections.find((section) => section.type === "custom");
    if (projectsSection && certificationsSection && customSection) {
      projectsSection.included = true;
      projectsSection.content = {
        entries: [{ id: createStableId(), included: true, name: "Pass A Project", date: "2025", technologies: "TypeScript", url: "example.test", description: "Project description", bullets: [] }],
      };
      certificationsSection.included = true;
      certificationsSection.content = {
        entries: [{ id: createStableId(), included: true, name: "Pass A Certification", issuer: "Issuer", date: "2025", expirationDate: "2027", credentialId: "ID-123", credentialUrl: "example.test" }],
      };
      customSection.included = true;
      customSection.content = { title: "Pass A Custom", lines: ["Custom line one", "Custom line two"] };
      await loadDocument(page, sectionContentFixture);
      const sectionTitles = await assertClassicComposition(page);
      assert.ok(sectionTitles.includes("Projects"));
      assert.ok(sectionTitles.includes("Certifications"));
      assert.ok(sectionTitles.includes("Pass A Custom"));
      const projectTitleWeight = await page.locator(".resume-section").evaluateAll((sections) => {
        const projects = sections.find((section) => section.querySelector("h3")?.textContent?.trim() === "Projects");
        const title = projects?.querySelector<HTMLElement>(".resume-entry-identity");
        return title ? getComputedStyle(title).fontWeight : null;
      });
      assert.equal(projectTitleWeight, "700", "Project title should remain bold");
      const renderedText = await page.locator(".resume-document").innerText();
      assert.ok(renderedText.includes("Project description"));
      assert.ok(renderedText.includes("Pass A Certification"));
      assert.ok(renderedText.includes("Custom line one"));
    }

    const fixtures: Array<[string, JsonRecord, number]> = [
      ["comfortably under", makeComfortablyUnderPage(storedDocument), 1],
      ["near one page", clone(storedDocument), 1],
      [
        "just over",
        addCustomContent(storedDocument, [
          "A boundary fixture line added to exceed the physical Letter page by a small amount.",
        ]),
        1,
      ],
      [
        "clearly two pages",
        addCustomContent(
          storedDocument,
          Array.from(
            { length: 40 },
            (_, index) => `Additional pagination fixture line ${index + 1} with enough text to occupy a normal resume line.`,
          ),
        ),
        2,
      ],
      ["three pages", addCustomContent(storedDocument, Array.from(
        { length: 95 },
        (_, index) => `Additional pagination fixture line ${index + 1} with enough text to occupy a normal resume line.`,
      )), 3],
    ];

    for (const [name, resumeDocument, expectedPages] of fixtures) {
      const library = JSON.stringify({ schemaVersion: 4, activeResumeId: resumeDocument.id, resumes: [resumeDocument] });
      await page.evaluate((value: string) => {
        localStorage.setItem("resume-studio.library.v4", value);
      }, library);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(900);

      const browserResult = await page.evaluate(() => ({
        label: document.querySelector(".resume-preview-stage-count")?.textContent?.trim() ?? "",
        status: document.querySelector(".resume-preview-stage-state")?.textContent?.trim() ?? "",
      }));

      const response = await fetch(`${BASE_URL}/api/export/pdf`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId: "classic", document: resumeDocument }),
      });
      if (!response.ok) {
        throw new Error(`PDF export failed for ${name}: ${response.status}`);
      }

      const pdfPages = countPdfPages(await response.arrayBuffer());
      assert.equal(pdfPages, expectedPages, `${name}: PDF page count`);
      assert.equal(browserResult.label, `${expectedPages} ${expectedPages === 1 ? "page" : "pages"}`, `${name}: preview page count`);

      console.log(JSON.stringify({ name, browser: browserResult, pdfPages }));
    }

    // These fixtures exercise fragmentation without tying the validator to a
    // brittle precise line at which Chromium chooses to break each section.
    for (const [name, type, lineCount] of [
      ["Experience entry near boundary", "experience", 8],
      ["long Experience header near boundary", "experience", 4],
      ["Technical Skills after mixed sections", "technicalSkills", 40],
    ] as const) {
      const fixture = placeSectionAfterBoundaryContent(storedDocument, type, lineCount);
      if (name.startsWith("long")) {
        const experience = (fixture.sections as JsonRecord[]).find((section) => section.type === "experience");
        const entries = (experience?.content as JsonRecord)?.entries as JsonRecord[] | undefined;
        if (entries?.[0]) {
          entries[0].title = `Senior ${"Customer Support Specialist ".repeat(8)}`;
          entries[0].company = `A Long Employer Name ${"Across Multiple Divisions ".repeat(4)}`;
        }
      }
      await loadDocument(page, fixture);
      await assertClassicComposition(page);
      const response = await fetch(`${BASE_URL}/api/export/pdf`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId: "classic", document: fixture }),
      });
      assert.equal(response.status, 200, `${name}: export response`);
      const pdfPages = countPdfPages(await response.arrayBuffer());
      const label = await page.locator(".resume-preview-stage-count").innerText();
      assert.equal(label, `${pdfPages} ${pdfPages === 1 ? "page" : "pages"}`, `${name}: preview/PDF parity`);
      console.log(JSON.stringify({ name, preview: label, pdfPages }));
    }
  } finally {
    await browser.close();
  }
}

await main();
