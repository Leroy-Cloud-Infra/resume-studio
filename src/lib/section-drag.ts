export const SECTION_DRAG_EDGE_ZONE_PX = 56;
export const REORDER_DRAG_MIME = "application/x-resume-studio-reorder";
export const POINTER_REORDER_THRESHOLD_PX = 6;

export type ReorderDragPayload =
  | { kind: "section"; itemId: string }
  | { kind: "experience"; sectionId: string; itemId: string }
  | { kind: "project"; sectionId: string; itemId: string }
  | { kind: "education"; sectionId: string; itemId: string }
  | { kind: "project-bullet"; sectionId: string; entryId: string; itemId: string }
  | { kind: "experience-bullet"; sectionId: string; entryId: string; itemId: string };

/** @deprecated Use REORDER_DRAG_MIME for all reorder payloads. */
export const SECTION_DRAG_MIME = REORDER_DRAG_MIME;

export function serializeReorderDragPayload(payload: ReorderDragPayload) {
  return JSON.stringify(payload);
}

export function hasPointerMovedBeyondThreshold(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  threshold = POINTER_REORDER_THRESHOLD_PX,
) {
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;
  return deltaX * deltaX + deltaY * deltaY >= threshold * threshold;
}

export function parseReorderDragPayload(value: string): ReorderDragPayload | null {
  try {
    const payload = JSON.parse(value) as Record<string, unknown>;
    if (!payload || typeof payload !== "object" || typeof payload.itemId !== "string") return null;
    if (payload.kind === "section") return { kind: "section", itemId: payload.itemId };
    if (
      (payload.kind === "experience" || payload.kind === "project" || payload.kind === "education" || payload.kind === "project-bullet" || payload.kind === "experience-bullet") &&
      typeof payload.sectionId === "string"
    ) {
      if (payload.kind === "experience" || payload.kind === "project" || payload.kind === "education") return { kind: payload.kind, sectionId: payload.sectionId, itemId: payload.itemId };
      if (typeof payload.entryId === "string") {
        return { kind: payload.kind, sectionId: payload.sectionId, entryId: payload.entryId, itemId: payload.itemId };
      }
    }
  } catch {
    // Native drag payloads are untrusted browser data.
  }
  return null;
}

export function resolveReorderInsertionIndex(
  sourceIndex: number,
  insertionPosition: number,
  itemCount: number,
) {
  if (
    sourceIndex < 0 ||
    sourceIndex >= itemCount ||
    insertionPosition < 0 ||
    insertionPosition > itemCount
  ) {
    return null;
  }

  const targetIndex = sourceIndex < insertionPosition
    ? insertionPosition - 1
    : insertionPosition;

  return targetIndex === sourceIndex ? null : targetIndex;
}

export function getReorderInsertionPosition(
  pointerY: number,
  itemBounds: Array<{ top: number; bottom: number }>,
) {
  for (let index = 0; index < itemBounds.length; index += 1) {
    const bounds = itemBounds[index];
    if (pointerY < bounds.top + (bounds.bottom - bounds.top) / 2) return index;
  }
  return itemBounds.length;
}

export function getSectionDragScrollDirection(
  pointerY: number,
  containerTop: number,
  containerBottom: number,
  edgeZone = SECTION_DRAG_EDGE_ZONE_PX,
) {
  if (pointerY < containerTop || pointerY > containerBottom) return 0;
  if (pointerY < containerTop + edgeZone) return -1;
  if (pointerY > containerBottom - edgeZone) return 1;
  return 0;
}
