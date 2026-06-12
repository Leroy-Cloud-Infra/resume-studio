import path from "node:path";
import { pathToFileURL } from "node:url";

import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { createElement } from "react";

import { ClassicTemplate } from "@/components/resume/ClassicTemplate";
import type { Resume } from "@/types/resume";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ExportPdfRequest = {
  templateId?: string;
  resume?: Resume;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isResume(value: unknown): value is Resume {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Resume>;

  return (
    typeof candidate.title === "string" &&
    typeof candidate.summary === "string" &&
    typeof candidate.header?.name === "string" &&
    typeof candidate.header.email === "string" &&
    typeof candidate.header.phone === "string" &&
    typeof candidate.header.location === "string" &&
    isStringArray(candidate.header.links) &&
    Array.isArray(candidate.experience) &&
    Array.isArray(candidate.education) &&
    Array.isArray(candidate.projects) &&
    Array.isArray(candidate.customSections) &&
    typeof candidate.technicalSkills?.title === "string" &&
    Array.isArray(candidate.technicalSkills.categories)
  );
}

function sanitizeFilenamePart(value: string) {
  const sanitizedValue = value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return sanitizedValue || "resume";
}

async function createResumePdfHtml(resume: Resume) {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const resumeMarkup = renderToStaticMarkup(createElement(ClassicTemplate, { resume }));
  const regularFontUrl = pathToFileURL(
    path.resolve(process.cwd(), "public/fonts/LiberationSerif-Regular.ttf"),
  ).href;
  const boldFontUrl = pathToFileURL(
    path.resolve(process.cwd(), "public/fonts/LiberationSerif-Bold.ttf"),
  ).href;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @font-face {
        font-family: "Resume Serif";
        src: url("${regularFontUrl}") format("truetype");
        font-weight: 400;
        font-style: normal;
      }

      @font-face {
        font-family: "Resume Serif";
        src: url("${boldFontUrl}") format("truetype");
        font-weight: 700;
        font-style: normal;
      }

      @page {
        size: Letter;
        margin: 0;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        width: 8.5in;
        min-height: 11in;
        background: #ffffff;
        color: #000000;
        font-family: "Resume Serif", "Times New Roman", Times, serif;
      }

      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      .resume-document,
      .resume-document * {
        box-sizing: border-box;
      }

      .resume-document {
        margin: 0 !important;
        overflow: visible;
        font-family: "Resume Serif", "Times New Roman", Times, serif !important;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .mx-auto {
        margin-left: auto;
        margin-right: auto;
      }

      .w-full {
        width: 100%;
      }

      .max-w-\\[8\\.5in\\] {
        max-width: 8.5in;
      }

      .bg-white {
        background: #ffffff;
      }

      .text-black {
        color: #000000;
      }

      .text-center {
        text-align: center;
      }

      .font-semibold {
        font-weight: 600;
      }

      .min-w-0 {
        min-width: 0;
      }

      .uppercase {
        text-transform: uppercase;
      }

      .tracking-\\[0\\.01em\\] {
        letter-spacing: 0.01em;
      }

      .tracking-\\[0\\.04em\\] {
        letter-spacing: 0.04em;
      }

      .border,
      .border-t,
      .border-b {
        border-color: #000000;
      }

      .border-t {
        border-top-style: solid;
      }

      .border-b {
        border-bottom-style: solid;
      }

      .mt-\\[0pt\\] {
        margin-top: 0;
      }

      .mt-\\[1pt\\] {
        margin-top: 1pt;
      }

      .mt-\\[2pt\\] {
        margin-top: 2pt;
      }

      .mt-\\[3pt\\] {
        margin-top: 3pt;
      }

      .mt-\\[4pt\\] {
        margin-top: 4pt;
      }

      .mt-\\[5pt\\] {
        margin-top: 5pt;
      }

      .mt-\\[6pt\\] {
        margin-top: 6pt;
      }

      .mt-\\[7pt\\] {
        margin-top: 7pt;
      }

      .break-inside-avoid {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .whitespace-nowrap {
        white-space: nowrap;
      }

      .list-disc {
        list-style-type: disc;
      }

      .resume-skills-content,
      .resume-skill-line {
        display: block;
        border: 0 !important;
        outline: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
        overflow: visible;
      }

      .resume-row-bullets li::marker {
        color: #1f1f1f;
        font-size: 0.92em;
      }

      h1,
      h2,
      h3,
      h4,
      p,
      ul {
        margin-block-start: 0;
        margin-block-end: 0;
      }
    </style>
  </head>
  <body>
    ${resumeMarkup}
  </body>
</html>`;
}

export async function POST(request: Request) {
  let payload: ExportPdfRequest;

  try {
    payload = (await request.json()) as ExportPdfRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (payload.templateId && payload.templateId !== "classic") {
    return NextResponse.json({ error: "Unsupported resume template." }, { status: 400 });
  }

  if (!isResume(payload.resume)) {
    return NextResponse.json({ error: "Invalid resume payload." }, { status: 400 });
  }

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage"],
    });
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: {
        width: 816,
        height: 1056,
      },
    });

    await page.setContent(await createResumePdfHtml(payload.resume), {
      waitUntil: "load",
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const pdf = await page.pdf({
      format: "Letter",
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
      printBackground: true,
      preferCSSPageSize: true,
      scale: 0.96,
    });
    const filename = `${sanitizeFilenamePart(payload.resume.header.name)}-resume.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF export failed", error);
    return NextResponse.json({ error: "PDF export failed." }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
