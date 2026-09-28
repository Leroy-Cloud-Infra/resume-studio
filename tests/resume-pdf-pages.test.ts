import assert from "node:assert/strict";
import test from "node:test";

import { createContinuationPageCss } from "../src/lib/resume-pdf-pages.ts";
import {
  CONTINUATION_CONTENT_SHIFT_PT,
  CONTINUATION_BASE_TOP_MARGIN_PT,
  CONTINUATION_PAGE_TOP_MARGIN_PT,
} from "../src/lib/resume-print-layout.ts";

test("PDF page CSS reserves exactly 15pt more at the top of continuation pages", () => {
  const css = createContinuationPageCss("Candidate Name");
  assert.equal(CONTINUATION_CONTENT_SHIFT_PT, 15);
  assert.equal(CONTINUATION_PAGE_TOP_MARGIN_PT - CONTINUATION_BASE_TOP_MARGIN_PT, 15);
  assert.match(css, /@page:first\s*\{[\s\S]*?@top-left \{ content: none; \}/);
  assert.match(css, /counter\(page\)/);
  assert.match(css, /font: 400 9\.3pt\/11pt/);
});

test("candidate name is encoded as CSS content, never as a stylesheet rule", () => {
  const css = createContinuationPageCss('Ada " } @page { margin: 0 } \\ Lovelace');
  assert.equal((css.match(/@page\s*\{/g) ?? []).length, 1);
  assert.equal((css.match(/@page:first\s*\{/g) ?? []).length, 1);
  assert.ok(!css.includes('content: "Ada'));
  assert.ok(!css.includes('margin: 0 } \\ Lovelace'));
  assert.match(css, /\\41 \\64 \\61 /);
});
