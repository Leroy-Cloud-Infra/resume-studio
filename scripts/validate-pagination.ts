import { chromium } from "playwright";
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

function countPdfPages(bytes: ArrayBuffer) {
  const source = Buffer.from(bytes).toString("latin1");
  return (source.match(/\/Type\s*\/Page\b/g) ?? []).length;
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

    const fixtures: Array<[string, JsonRecord]> = [
      ["comfortably under", makeComfortablyUnderPage(storedDocument)],
      ["near one page", clone(storedDocument)],
      [
        "just over",
        addCustomContent(storedDocument, [
          "A boundary fixture line added to exceed the physical Letter page by a small amount.",
        ]),
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
      ],
    ];

    for (const [name, resumeDocument] of fixtures) {
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
      const expectedPages = browserResult.label.startsWith("1 ") ? 1 : 2;
      if (pdfPages !== expectedPages) {
        throw new Error(`${name}: browser=${browserResult.label}, PDF=${pdfPages}`);
      }

      console.log(JSON.stringify({ name, browser: browserResult, pdfPages }));
    }
  } finally {
    await browser.close();
  }
}

await main();
