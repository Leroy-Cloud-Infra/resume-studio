import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePrintedPageMetrics,
  LETTER_PAGE_HEIGHT_PX,
} from "../src/lib/resume-print-layout.ts";

test("printed geometry keeps the current sample inside one Letter page", () => {
  const metrics = calculatePrintedPageMetrics(1099.171875, LETTER_PAGE_HEIGHT_PX);

  assert.equal(metrics.isOverflowing, false);
  assert.equal(metrics.pageCount, 1);
  assert.ok(metrics.pageFillRatio > 0.99);
  assert.ok(metrics.pageFillRatio < 1);
});

test("printed geometry classifies the one-page boundary fixtures", () => {
  const fixtures = [
    { name: "comfortably under", contentHeight: 900, expectedPages: 1, maxRatio: 0.9 },
    { name: "near limit", contentHeight: 1070, expectedPages: 1, minRatio: 0.97, maxRatio: 0.99 },
    { name: "just over", contentHeight: 1140, expectedPages: 2, minRatio: 1.01, maxRatio: 1.05 },
    { name: "clearly two pages", contentHeight: 1600, expectedPages: 2, minRatio: 1.4 },
  ];

  for (const fixture of fixtures) {
    const metrics = calculatePrintedPageMetrics(fixture.contentHeight, LETTER_PAGE_HEIGHT_PX);

    assert.equal(metrics.pageCount, fixture.expectedPages, fixture.name);
    if (fixture.minRatio !== undefined) {
      assert.ok(metrics.pageFillRatio >= fixture.minRatio, fixture.name);
    }
    if (fixture.maxRatio !== undefined) {
      assert.ok(metrics.pageFillRatio < fixture.maxRatio, fixture.name);
    }
  }
});

test("subpixel print overflow is ignored without hiding a real overflow", () => {
  assert.equal(calculatePrintedPageMetrics(1096, LETTER_PAGE_HEIGHT_PX).pageCount, 1);
  assert.equal(calculatePrintedPageMetrics(1102, LETTER_PAGE_HEIGHT_PX).pageCount, 2);
});

test("later pages account for continuation-header space", () => {
  assert.equal(calculatePrintedPageMetrics(2079.39 / 0.96, LETTER_PAGE_HEIGHT_PX).pageCount, 3);
  assert.equal(calculatePrintedPageMetrics(3092.79 / 0.96, LETTER_PAGE_HEIGHT_PX).pageCount, 4);
});
