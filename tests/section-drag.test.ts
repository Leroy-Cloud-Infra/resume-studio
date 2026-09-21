import assert from "node:assert/strict";
import test from "node:test";

import {
  getReorderInsertionPosition,
  getSectionDragScrollDirection,
  hasPointerMovedBeyondThreshold,
  POINTER_REORDER_THRESHOLD_PX,
  parseReorderDragPayload,
  REORDER_DRAG_MIME,
  resolveReorderInsertionIndex,
  serializeReorderDragPayload,
} from "../src/lib/section-drag.ts";

test("reorder drag uses a private typed payload rather than transferable text", () => {
  assert.equal(REORDER_DRAG_MIME, "application/x-resume-studio-reorder");
  assert.notEqual(REORDER_DRAG_MIME, "text/plain");
  const payloads = [
    { kind: "section" as const, itemId: "section-1" },
    { kind: "experience" as const, sectionId: "experience", itemId: "experience-1" },
    { kind: "project" as const, sectionId: "projects", itemId: "project-1" },
    { kind: "education" as const, sectionId: "education", itemId: "education-1" },
    { kind: "project-bullet" as const, sectionId: "projects", entryId: "project-1", itemId: "bullet-2" },
    { kind: "experience-bullet" as const, sectionId: "experience", entryId: "experience-1", itemId: "bullet-3" },
  ];
  for (const payload of payloads) {
    assert.deepEqual(parseReorderDragPayload(serializeReorderDragPayload(payload)), payload);
  }
  assert.equal(parseReorderDragPayload('{"kind":"project-bullet","itemId":"bullet-2"}'), null);
  assert.equal(parseReorderDragPayload("not json"), null);
});

test("section drag edge zones select only top or bottom scrolling", () => {
  assert.equal(getSectionDragScrollDirection(50, 100, 700), 0);
  assert.equal(getSectionDragScrollDirection(100, 100, 700), -1);
  assert.equal(getSectionDragScrollDirection(700, 100, 700), 1);
  assert.equal(getSectionDragScrollDirection(400, 100, 700), 0);
  assert.equal(getSectionDragScrollDirection(750, 100, 700), 0);
});

test("explicit insertion positions normalize before, between, and after-last moves", () => {
  assert.equal(resolveReorderInsertionIndex(3, 0, 5), 0, "moves upward before the first item");
  assert.equal(resolveReorderInsertionIndex(0, 3, 5), 2, "moves downward between items");
  assert.equal(resolveReorderInsertionIndex(0, 5, 5), 4, "moves downward after the last item");
  assert.equal(resolveReorderInsertionIndex(4, 2, 5), 2, "moves upward between items");
  assert.equal(resolveReorderInsertionIndex(2, 2, 5), null, "before-self is a no-op");
  assert.equal(resolveReorderInsertionIndex(2, 3, 5), null, "after-self is a no-op");
  assert.equal(resolveReorderInsertionIndex(-1, 1, 5), null, "rejects an invalid source");
  assert.equal(resolveReorderInsertionIndex(1, 6, 5), null, "rejects an invalid insertion position");
});

test("pointer positions resolve to explicit list boundaries", () => {
  const items = [
    { top: 10, bottom: 30 },
    { top: 40, bottom: 60 },
    { top: 70, bottom: 90 },
  ];
  assert.equal(getReorderInsertionPosition(5, items), 0);
  assert.equal(getReorderInsertionPosition(25, items), 1);
  assert.equal(getReorderInsertionPosition(55, items), 2);
  assert.equal(getReorderInsertionPosition(95, items), 3);
});

test("pointer reorder activation waits for a deliberate movement threshold", () => {
  assert.equal(hasPointerMovedBeyondThreshold(10, 10, 10, 10), false);
  assert.equal(hasPointerMovedBeyondThreshold(10, 10, 10 + POINTER_REORDER_THRESHOLD_PX - 1, 10), false);
  assert.equal(hasPointerMovedBeyondThreshold(10, 10, 10 + POINTER_REORDER_THRESHOLD_PX, 10), true);
  assert.equal(hasPointerMovedBeyondThreshold(10, 10, 10, 10 + POINTER_REORDER_THRESHOLD_PX), true);
});
