"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from "react";
import { AppearanceControl } from "./AppearanceControl";

import { getResumeTemplate, type ResumeTemplateId } from "@/templates/resume-templates";
import {
  mergeLegacyResume,
  migrateLegacyResume,
  toLegacyResume,
} from "@/lib/resume-migrations";
import { createStableId } from "@/lib/stable-id";
import {
  loadResumeLibrary,
  saveResumeLibrary,
} from "@/lib/resume-library";
import { getSection, type DocumentAction } from "@/lib/resume-actions";
import { createWorkspaceState, workspaceReducer } from "@/lib/resume-workspace";
import { parseCourseworkLines, parseCustomSectionLines } from "@/lib/resume-text";
import {
  getSkillSignature,
  rebaseSkillTextDraft,
  serializeSkillNames,
  updateSkillTextDraft,
  type SkillTextDraft,
} from "@/lib/resume-skills";
import { getPreviewStatusLabel } from "@/lib/resume-preview-status";
import {
  calculatePrintedPageMetrics,
  LETTER_PAGE_ASPECT_RATIO,
} from "@/lib/resume-print-layout";
import { calculateTextareaHeight, measureTextareaContentHeight } from "@/lib/textarea-autosize";
import {
  getReorderInsertionPosition,
  getSectionDragScrollDirection,
  hasPointerMovedBeyondThreshold,
  POINTER_REORDER_THRESHOLD_PX,
  resolveReorderInsertionIndex,
  type ReorderDragPayload,
} from "@/lib/section-drag";
import { readLastOpenSectionId, resolveLastOpenSectionId, writeLastOpenSectionId } from "@/lib/resume-preferences";
import type {
  ProjectEntry,
  Resume,
  ResumeDateRange,
  ResumeSkillCategory,
  ResumeSection,
} from "@/types/resume";

type ResumeEditorProps = {
  initialResume: Resume;
  templateId: ResumeTemplateId;
};

const MONTH_OPTIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1979 + 4 }, (_, index) =>
  String(CURRENT_YEAR + 3 - index),
);

const BUTTON_BASE_CLASSES = "rs-button";
const BUTTON_SECONDARY_CLASSES = `${BUTTON_BASE_CLASSES} rs-button--secondary`;
const BUTTON_DANGER_CLASSES = `${BUTTON_BASE_CLASSES} rs-button--danger`;
const UI_NOTE_CLASSES = "rs-ui-note";
const ITEM_SURFACE_CLASSES = "rs-section-item";
const ITEM_INDEX_CLASSES = "rs-item-index";
const ITEM_SUMMARY_CLASSES = "rs-item-summary";
const PAGE_LIMIT_WARNING_RATIO = 0.93;
const PREVIEW_SCALE_MIN = 0.62;
const PREVIEW_SCALE_FIT_BUFFER_PX = 2;
const LONG_BULLET_LENGTH = 120;
const VERY_LONG_BULLET_LENGTH = 180;

type PageAwarenessState = {
  pageCount: number;
  isOverflowing: boolean;
  hasSecondPage: boolean;
  isNearLimit: boolean;
  overflowHeight: number;
  firstPageHeight: number;
  contentHeight: number;
  markerTop: number;
  markerLeft: number;
  markerWidth: number;
};

type ReorderContainer = {
  key: string;
  kind: ReorderDragPayload["kind"];
  sectionId?: string;
  entryId?: string;
};

type ReorderDropTarget = {
  containerKey: string;
  position: number;
  top: number;
  left: number;
  width: number;
};

type PointerReorderSession = {
  payload: ReorderDragPayload;
  pointerId: number;
  startX: number;
  startY: number;
  clientX: number;
  clientY: number;
  active: boolean;
  container: ReorderContainer | null;
  position: number | null;
};

type BulletGuidanceStatus = "light" | "ideal" | "caution" | "warning";
type BulletDensityStatus = "balanced" | "dense" | "veryDense";
type BulletLengthStatus = "normal" | "long" | "veryLong";

type BulletMetric = {
  length: number;
  status: BulletLengthStatus;
};

type BulletDensityGuidance = {
  status: BulletDensityStatus;
  label: string;
  message: string;
  className: string;
  averageLength: number;
  longBulletCount: number;
  veryLongBulletCount: number;
  likelyWrapPressure: boolean;
};

type BulletGuidance = {
  bulletCount: number;
  status: BulletGuidanceStatus;
  label: string;
  message: string;
  className: string;
  density: BulletDensityGuidance;
  bulletMetrics: BulletMetric[];
};

type EditorTextareaAutosizeConfig = {
  minHeight: number;
  maxHeight: number;
};

function createId(prefix: string) {
  return `${prefix}-${createStableId()}`;
}

function readPixelValue(value: string) {
  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getHorizontalBoxChrome(element: HTMLElement) {
  const styles = window.getComputedStyle(element);

  return (
    readPixelValue(styles.borderLeftWidth) +
    readPixelValue(styles.borderRightWidth) +
    readPixelValue(styles.paddingLeft) +
    readPixelValue(styles.paddingRight)
  );
}

function getVerticalBoxChrome(element: HTMLElement) {
  const styles = window.getComputedStyle(element);

  return (
    readPixelValue(styles.borderTopWidth) +
    readPixelValue(styles.borderBottomWidth) +
    readPixelValue(styles.paddingTop) +
    readPixelValue(styles.paddingBottom)
  );
}

function formatDateRange(dateRange: ResumeDateRange) {
  const start = `${dateRange.startMonth} ${dateRange.startYear}`.trim();
  const end = dateRange.current
    ? "Present"
    : `${dateRange.endMonth ?? ""} ${dateRange.endYear ?? ""}`.trim();

  return `${start} — ${end}`;
}

function createEmptyExperience(): Resume["experience"][number] {
  return {
    id: createId("experience"),
    company: "",
    title: "",
    location: "",
    dateRange: {
      startMonth: "Jan",
      startYear: String(CURRENT_YEAR),
      current: true,
    },
    bullets: [""],
  };
}

function createEmptyEducation(): Resume["education"][number] {
  return {
    id: createId("education"),
    school: "",
    degree: "",
    dateRange: {
      startMonth: "Jan",
      startYear: String(CURRENT_YEAR),
      endMonth: "Dec",
      endYear: String(CURRENT_YEAR),
      current: false,
    },
    location: "",
    coursework: [],
  };
}

function createEmptyProject(): ProjectEntry {
  return {
    id: createId("project"),
    included: true,
    name: "",
    description: "",
    date: "",
    technologies: "",
    url: "",
    bullets: [{ id: createId("bullet"), text: "", included: true }],
  };
}

function removeEmptyBullets(bullets: string[]) {
  return bullets.filter((bullet) => bullet.trim().length > 0);
}

function getBulletLengthStatus(length: number): BulletLengthStatus {
  if (length > VERY_LONG_BULLET_LENGTH) {
    return "veryLong";
  }

  if (length >= LONG_BULLET_LENGTH) {
    return "long";
  }

  return "normal";
}

function analyzeExperienceBullets(bullets: string[]): BulletGuidance {
  const renderableBullets = removeEmptyBullets(bullets);
  const bulletMetrics = renderableBullets.map((bullet) => {
    const length = bullet.length;

    return {
      length,
      status: getBulletLengthStatus(length),
    };
  });
  const bulletCount = renderableBullets.length;
  const totalBulletLength = bulletMetrics.reduce((total, metric) => total + metric.length, 0);
  const averageLength = bulletCount > 0 ? Math.round(totalBulletLength / bulletCount) : 0;
  const longBulletCount = bulletMetrics.filter((metric) => metric.status !== "normal").length;
  const veryLongBulletCount = bulletMetrics.filter(
    (metric) => metric.status === "veryLong",
  ).length;
  const likelyWrapPressure =
    bulletCount >= 7 ||
    longBulletCount >= 3 ||
    averageLength >= LONG_BULLET_LENGTH ||
    veryLongBulletCount > 0;
  const veryDense =
    bulletCount >= 9 ||
    longBulletCount >= 5 ||
    averageLength >= 160 ||
    veryLongBulletCount > 0;
  const density: BulletDensityGuidance = veryDense
    ? {
        status: "veryDense",
        label: "Very dense",
        message: "Consider shortening or prioritizing bullets.",
        className: "rs-guidance-chip rs-guidance-chip--high",
        averageLength,
        longBulletCount,
        veryLongBulletCount,
        likelyWrapPressure,
      }
    : likelyWrapPressure
      ? {
          status: "dense",
          label: "Dense",
          message: "Some bullets may wrap heavily.",
          className: "rs-guidance-chip rs-guidance-chip--medium",
          averageLength,
          longBulletCount,
          veryLongBulletCount,
          likelyWrapPressure,
        }
      : {
          status: "balanced",
          label: "Balanced",
          message: "This role should scan cleanly.",
          className: "rs-guidance-chip rs-guidance-chip--low",
          averageLength,
          longBulletCount,
          veryLongBulletCount,
          likelyWrapPressure,
        };

  if (bulletCount >= 8) {
    return {
      bulletCount,
      status: "warning",
      label: "Warning",
      message: "Consider prioritizing the strongest bullets.",
      className: "rs-guidance-chip rs-guidance-chip--high",
      density,
      bulletMetrics,
    };
  }

  if (bulletCount === 7) {
    return {
      bulletCount,
      status: "caution",
      label: "Caution",
      message: "This section is becoming visually dense.",
      className: "rs-guidance-chip rs-guidance-chip--medium",
      density,
      bulletMetrics,
    };
  }

  if (bulletCount >= 4) {
    return {
      bulletCount,
      status: "ideal",
      label: "Ideal",
      message: "Good detail and scan balance.",
      className: "rs-guidance-chip rs-guidance-chip--low",
      density,
      bulletMetrics,
    };
  }

  return {
    bulletCount,
    status: "light",
    label: "Light",
    message: "This role may feel underdeveloped.",
    className: "rs-guidance-chip rs-guidance-chip--low",
    density,
    bulletMetrics,
  };
}

function formatExperienceCardSummary(item: Resume["experience"][number]) {
  const parts = [
    item.title.trim() || "Untitled role",
    item.company.trim() || "Company",
    formatDateRange(item.dateRange),
  ];

  if (item.location.trim()) {
    parts.push(item.location.trim());
  }

  return parts.join(" · ");
}

function formatEducationCardSummary(item: Resume["education"][number]) {
  return [
    item.degree.trim() || "Degree",
    item.school.trim() || "School",
    formatDateRange(item.dateRange),
  ].join(" · ");
}

function truncateEditorSectionSummary(value: string, maxLength = 88) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "Empty";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function VisibilityIcon({ included }: { included: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.2 10s2.7-4.2 7.8-4.2 7.8 4.2 7.8 4.2-2.7 4.2-7.8 4.2S2.2 10 2.2 10Z" />
      <circle cx="10" cy="10" r="2" />
      {!included ? <path d="M3.2 3.2 16.8 16.8" /> : null}
    </svg>
  );
}

function formatExperienceGuidanceLine(bulletCount: number, isDense: boolean) {
  const bulletLabel = `${bulletCount} ${bulletCount === 1 ? "bullet" : "bullets"}`;

  return isDense ? `${bulletLabel} · dense role` : bulletLabel;
}

function isPayloadForContainer(payload: ReorderDragPayload, container: ReorderContainer) {
  if (payload.kind !== container.kind) return false;
  if (payload.kind === "section") return true;
  if (payload.kind === "experience" || payload.kind === "project" || payload.kind === "education") return payload.sectionId === container.sectionId;
  return payload.sectionId === container.sectionId && payload.entryId === container.entryId;
}

function ReorderHandle({
  label,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
}: {
  label: string;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onLostPointerCapture: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      className="rs-reorder-handle"
      type="button"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
    >
      <svg className="rs-reorder-handle-mark" aria-hidden="true" viewBox="0 0 10 9" width="10" height="9" focusable="false">
        <line x1="0.75" y1="1" x2="9.25" y2="1" stroke="#6f7882" strokeWidth="1.1" />
        <line x1="0.75" y1="4.5" x2="9.25" y2="4.5" stroke="#6f7882" strokeWidth="1.1" />
        <line x1="0.75" y1="8" x2="9.25" y2="8" stroke="#6f7882" strokeWidth="1.1" />
      </svg>
    </button>
  );
}

function ReorderInsertionIndicator({
  target,
  containerKey,
}: {
  target: ReorderDropTarget | null;
  containerKey: string;
}) {
  if (!target || target.containerKey !== containerKey) return null;

  return (
    <div
      className="rs-reorder-insertion-indicator"
      aria-hidden="true"
      style={{ top: target.top, left: target.left, width: target.width }}
    />
  );
}

function SectionDisclosureMark({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className="rs-editor-section-disclosure-mark"
      aria-hidden="true"
      viewBox="0 0 18 18"
      focusable="false"
    >
      <line x1="5" y1="9" x2="13" y2="9" />
      {!isOpen ? <line x1="9" y1="5" x2="9" y2="13" /> : null}
    </svg>
  );
}

function EntryDisclosureMark({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className="rs-entry-disclosure-mark-icon"
      aria-hidden="true"
      viewBox="0 0 12 12"
      focusable="false"
    >
      <polyline points={isOpen ? "2.5,4 6,8 9.5,4" : "4,2.5 8,6 4,9.5"} />
    </svg>
  );
}

function RemoveButton({ label, onClick, disabled = false, variant = "text" }: { label: string; onClick: () => void; disabled?: boolean; variant?: "text" | "entry" }) {
  return (
    <button className={variant === "entry" ? "rs-structural-remove-control" : "rs-remove-control"} type="button" aria-label={label} disabled={disabled} onClick={onClick}>
      Remove
    </button>
  );
}

function EditorStackSection({
  title,
  summary,
  isFixedHeader = false,
  isOpen,
  onToggle,
  included,
  onToggleIncluded,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  reorderHandle,
  reorderItemId,
  isDragging = false,
  children,
}: {
  title: string;
  summary: string;
  isFixedHeader?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  included?: boolean;
  onToggleIncluded?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  reorderHandle?: React.ReactNode;
  reorderItemId?: string;
  isDragging?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rs-editor-section${included === false ? " is-excluded" : ""}${isDragging ? " is-dragging" : ""}`}
      data-reorder-item={reorderItemId ? "true" : undefined}
    >
      <div className={`rs-editor-section-head${reorderHandle ? " has-reorder-handle" : ""}${isFixedHeader ? " is-fixed-header" : ""}`}>
        {reorderHandle}
        <button
          className="rs-editor-section-toggle"
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <span className="rs-editor-section-disclosure">
            <SectionDisclosureMark isOpen={isOpen} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="rs-editor-section-title">
              {title}
            </span>
            <span className="rs-editor-section-summary">
              {summary}
            </span>
          </span>
        </button>

        {onToggleIncluded || onMoveUp || onMoveDown ? (
          <div className="rs-editor-section-actions">
            {onMoveUp ? (
              <button
                className="rs-editor-section-action rs-editor-section-action--move"
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                aria-label={`Move ${title} up`}
              >
                Move up
              </button>
            ) : null}
            {onMoveDown ? (
              <button
                className="rs-editor-section-action rs-editor-section-action--move"
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                aria-label={`Move ${title} down`}
              >
                Move down
              </button>
            ) : null}
            {onToggleIncluded ? (
              <button
                className="rs-editor-section-visibility"
                type="button"
                aria-label={included ? `Hide ${title} from resume` : `Show ${title} in resume`}
                aria-pressed={included}
                title={included ? `Hide ${title} from resume` : `Show ${title} in resume`}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleIncluded();
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <VisibilityIcon included={included !== false} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isOpen ? <div className="rs-editor-section-body">{children}</div> : null}
    </section>
  );
}

export function ResumeEditor({ initialResume, templateId }: ResumeEditorProps) {
  const initialDocument = useMemo(() => migrateLegacyResume(initialResume, { templateId }), [initialResume, templateId]);
  const [workspace, dispatchWorkspace] = useReducer(workspaceReducer, initialDocument, (document) => createWorkspaceState({ schemaVersion: 4, activeResumeId: document.id, resumes: [document] }));
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [expandedExperienceId, setExpandedExperienceId] = useState<string | null>(() => getSection(initialDocument, "experience")?.content.entries[0]?.id ?? null);
  const [isExperienceExpansionExplicitlyCollapsed, setIsExperienceExpansionExplicitlyCollapsed] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [expandedEducationId, setExpandedEducationId] = useState<string | null>(() => getSection(initialDocument, "education")?.content.entries[0]?.id ?? null);
  const [skillTextDrafts, setSkillTextDrafts] = useState<Record<string, SkillTextDraft>>({});
  const [pointerReorder, setPointerReorder] = useState<PointerReorderSession | null>(null);
  const [reorderDropTarget, setReorderDropTarget] = useState<ReorderDropTarget | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportPdfError, setExportPdfError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error">("saving");
  const [pageAwareness, setPageAwareness] = useState<PageAwarenessState>({
    pageCount: 1,
    isOverflowing: false,
    hasSecondPage: false,
    isNearLimit: false,
    overflowHeight: 0,
    firstPageHeight: 0,
    contentHeight: 0,
    markerTop: 0,
    markerLeft: 0,
    markerWidth: 0,
  });
  const editorPanelRef = useRef<HTMLElement | null>(null);
  const editorScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingAutosizeTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const projectNameRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const previewShellRef = useRef<HTMLElement | null>(null);
  const previewStageScrollRef = useRef<HTMLDivElement | null>(null);
  const previewScaleRef = useRef(1);
  const previewScrollRestoreRef = useRef<number | null>(null);
  const hasLoadedLibrary = useRef(false);
  const textTimerRef = useRef<number | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const autoScrollDirectionRef = useRef(0);
  const pointerReorderSessionRef = useRef<PointerReorderSession | null>(null);
  const updatePointerReorderTargetRef = useRef<((clientX: number, clientY: number) => void) | null>(null);

  const selectedTemplate = useMemo(() => getResumeTemplate(templateId), [templateId]);
  const activeDocument = workspace.library.resumes.find((document) => document.id === workspace.library.activeResumeId) ?? null;
  const resume = useMemo(() => activeDocument ? toLegacyResume(activeDocument) : initialResume, [activeDocument, initialResume]);
  const renderDocument = activeDocument ?? initialDocument;
  const technicalSkillsSection = activeDocument ? getSection(activeDocument, "technicalSkills") : undefined;
  const experienceEntries = activeDocument ? getSection(activeDocument, "experience")?.content.entries ?? [] : [];
  const resolvedExpandedExperienceId = expandedExperienceId && experienceEntries.some((entry) => entry.id === expandedExperienceId)
    ? expandedExperienceId
    : isExperienceExpansionExplicitlyCollapsed
      ? null
      : experienceEntries[0]?.id ?? null;
  const resolvedOpenSectionId = openSectionId && renderDocument.sections.some((section) => section.id === openSectionId)
    ? openSectionId
    : null;

  const stopSectionAutoScroll = useCallback(() => {
    autoScrollDirectionRef.current = 0;
    if (autoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  const scheduleSectionAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current !== null) return;
    const tick = () => {
      autoScrollFrameRef.current = null;
      const scrollContainer = editorScrollRef.current;
      const direction = autoScrollDirectionRef.current;
      if (!scrollContainer || !pointerReorderSessionRef.current?.active || direction === 0) return;
      const previousScrollTop = scrollContainer.scrollTop;
      scrollContainer.scrollTop += direction * 10;
      if (scrollContainer.scrollTop !== previousScrollTop) {
        const session = pointerReorderSessionRef.current;
        if (session) updatePointerReorderTargetRef.current?.(session.clientX, session.clientY);
        autoScrollFrameRef.current = window.requestAnimationFrame(tick);
      } else {
        autoScrollDirectionRef.current = 0;
      }
    };
    autoScrollFrameRef.current = window.requestAnimationFrame(tick);
  }, []);

  const updateSectionAutoScroll = useCallback((clientY: number) => {
    const scrollContainer = editorScrollRef.current;
    if (!scrollContainer || !pointerReorderSessionRef.current?.active) return;
    const bounds = scrollContainer.getBoundingClientRect();
    autoScrollDirectionRef.current = getSectionDragScrollDirection(clientY, bounds.top, bounds.bottom);
    if (autoScrollDirectionRef.current === 0) {
      stopSectionAutoScroll();
    } else {
      scheduleSectionAutoScroll();
    }
  }, [scheduleSectionAutoScroll, stopSectionAutoScroll]);

  useEffect(() => stopSectionAutoScroll, [stopSectionAutoScroll]);

  const flushTextHistory = useCallback(() => {
    if (textTimerRef.current !== null) {
      window.clearTimeout(textTimerRef.current);
      textTimerRef.current = null;
    }
    dispatchWorkspace({ type: "commit-text-history" });
  }, []);

  const dispatchDocument = useCallback((action: DocumentAction, options: { text?: boolean; key?: string } = {}) => {
    setSaveStatus("saving");
    if (!options.text) flushTextHistory();
    dispatchWorkspace({ type: "document-action", action, historyMode: options.text ? "text" : "record", coalesceKey: options.key });
    if (options.text) {
      if (textTimerRef.current !== null) window.clearTimeout(textTimerRef.current);
      textTimerRef.current = window.setTimeout(() => {
        textTimerRef.current = null;
        dispatchWorkspace({ type: "commit-text-history" });
      }, 650);
    }
  }, [flushTextHistory]);

  const persistLibrary = useCallback((library: ReturnType<typeof createWorkspaceState>["library"]) => {
    setSaveStatus("saving");
    const result = saveResumeLibrary(library);
    if (result.ok) {
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
    }
    return result;
  }, []);
  const syncAutosizeTextarea = useCallback((textarea: HTMLTextAreaElement) => {
    const minHeight = Number(textarea.dataset.autosizeMin ?? 0);
    const maxHeight = Number(textarea.dataset.autosizeMax ?? 0);
    const contentHeight = measureTextareaContentHeight(textarea);
    const clampedHeight = calculateTextareaHeight(contentHeight, minHeight, maxHeight);

    textarea.style.height = `${clampedHeight}px`;
    textarea.style.overflowY =
      maxHeight > 0 && contentHeight > maxHeight ? "auto" : "hidden";
  }, []);

  const autosizeTextareaProps = useCallback(
    ({ minHeight, maxHeight }: EditorTextareaAutosizeConfig) => ({
      "data-autosize": "true",
      "data-autosize-min": String(minHeight),
      "data-autosize-max": String(maxHeight),
    }),
    [],
  );

  const queueAutosizeTextarea = useCallback(
    (textarea: HTMLTextAreaElement) => {
      pendingAutosizeTextareaRef.current = textarea;
      requestAnimationFrame(() => {
        syncAutosizeTextarea(textarea);
        if (pendingAutosizeTextareaRef.current === textarea) {
          pendingAutosizeTextareaRef.current = null;
        }
      });
    },
    [syncAutosizeTextarea],
  );

  useLayoutEffect(() => {
    const editorPanel = editorPanelRef.current;

    if (!editorPanel) {
      return;
    }

    // Textarea change handlers already resize their focused field on the next
    // animation frame. Skip the editor-wide pass for that same render so
    // Safari does not see two consecutive height mutations while typing. If
    // the pending textarea was removed by an intervening document change,
    // keep the editor-wide pass available for the new layout.
    if (pendingAutosizeTextareaRef.current?.isConnected) {
      return;
    }

    editorPanel
      .querySelectorAll<HTMLTextAreaElement>("textarea[data-autosize='true']")
      .forEach((textarea) => {
        syncAutosizeTextarea(textarea);
      });
  }, [
    expandedEducationId,
    expandedExperienceId,
    expandedProjectId,
    openSectionId,
    renderDocument,
    resume,
    syncAutosizeTextarea,
  ]);

  const measurePreviewPages = useCallback(() => {
    const previewShell = previewShellRef.current;
    const resumeArticle = previewShell?.querySelector<HTMLElement>(".resume-document");

    if (!previewShell || !resumeArticle) {
      return;
    }

    const shellRect = previewShell.getBoundingClientRect();
    const articleRect = resumeArticle.getBoundingClientRect();
    const currentScale = previewScaleRef.current || 1;
    const naturalWidth = articleRect.width / currentScale;
    const firstPageHeight = naturalWidth * LETTER_PAGE_ASPECT_RATIO;
    if (firstPageHeight <= 0) {
      return;
    }

    const unscaledContentHeight = articleRect.height / currentScale;
    const contentHeight = unscaledContentHeight;
    const printedMetrics = calculatePrintedPageMetrics(contentHeight, firstPageHeight);
    const isOverflowing = printedMetrics.isOverflowing;
    const overflowHeight = printedMetrics.overflowHeight;
    const hasSecondPage = isOverflowing;
    const pageCount = printedMetrics.pageCount;
    const isNearLimit =
      !isOverflowing && printedMetrics.pageFillRatio >= PAGE_LIMIT_WARNING_RATIO;
    setPageAwareness({
      pageCount,
      isOverflowing,
      hasSecondPage,
      isNearLimit,
      overflowHeight,
      firstPageHeight,
      contentHeight,
      markerTop: articleRect.top - shellRect.top + firstPageHeight * currentScale,
      markerLeft: articleRect.left - shellRect.left,
      markerWidth: articleRect.width,
    });

  }, []);

  const [previewScale, setPreviewScale] = useState(1);
  const [previewSurfaceChromeWidth, setPreviewSurfaceChromeWidth] = useState(0);
  const [previewSurfaceChromeHeight, setPreviewSurfaceChromeHeight] = useState(0);

  useEffect(() => {
    previewScaleRef.current = previewScale;
  }, [previewScale]);

  const measurePreviewScale = useCallback(() => {
    const previewStageScroll = previewStageScrollRef.current;
    const previewShell = previewShellRef.current;
    const resumeArticle = previewShell?.querySelector<HTMLElement>(".resume-document");
    const pageSurface = previewShell?.querySelector<HTMLElement>(".resume-preview-page-surface");

    if (!previewStageScroll || !resumeArticle || !pageSurface) {
      return;
    }

    const availableWidth = previewStageScroll.clientWidth;
    const currentScale = previewScaleRef.current || 1;
    const naturalPageWidth = resumeArticle.getBoundingClientRect().width / currentScale;
    const surfaceChromeWidth = getHorizontalBoxChrome(pageSurface);
    const surfaceChromeHeight = getVerticalBoxChrome(pageSurface);

    if (availableWidth <= 0 || naturalPageWidth <= 0) {
      return;
    }

    const fitWidth = availableWidth - surfaceChromeWidth - PREVIEW_SCALE_FIT_BUFFER_PX;
    const fitScale = fitWidth / naturalPageWidth;
    const nextScale = Math.min(1, Math.max(PREVIEW_SCALE_MIN, fitScale));

    setPreviewSurfaceChromeWidth((currentValue) =>
      Math.abs(currentValue - surfaceChromeWidth) > 0.5 ? surfaceChromeWidth : currentValue,
    );
    setPreviewSurfaceChromeHeight((currentValue) =>
      Math.abs(currentValue - surfaceChromeHeight) > 0.5 ? surfaceChromeHeight : currentValue,
    );

    setPreviewScale((currentValue) =>
      Math.abs(currentValue - nextScale) > 0.01 ? nextScale : currentValue,
    );
  }, []);

  useEffect(() => {
    const previewShell = previewShellRef.current;
    const resumeArticle = previewShell?.querySelector<HTMLElement>(".resume-document");

    if (!previewShell || !resumeArticle) {
      return;
    }

    measurePreviewPages();

    const resizeObserver = new ResizeObserver(() => {
      measurePreviewPages();
    });

    resizeObserver.observe(resumeArticle);
    resizeObserver.observe(previewShell);
    window.addEventListener("resize", measurePreviewPages);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measurePreviewPages);
    };
  }, [measurePreviewPages, renderDocument]);

  useEffect(() => {
    measurePreviewPages();
  }, [measurePreviewPages, previewScale]);

  useEffect(() => {
    let cancelled = false;

    void document.fonts?.ready.then(() => {
      if (!cancelled) {
        measurePreviewPages();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [measurePreviewPages, renderDocument]);

  useEffect(() => {
    const previewStageScroll = previewStageScrollRef.current;
    const previewShell = previewShellRef.current;
    const resumeArticle = previewShell?.querySelector<HTMLElement>(".resume-document");
    const pageSurface = previewShell?.querySelector<HTMLElement>(".resume-preview-page-surface");

    if (!previewStageScroll || !resumeArticle || !pageSurface) {
      return;
    }

    measurePreviewScale();

    const resizeObserver = new ResizeObserver(() => {
      measurePreviewScale();
    });

    resizeObserver.observe(previewStageScroll);
    resizeObserver.observe(resumeArticle);
    resizeObserver.observe(pageSurface);
    window.addEventListener("resize", measurePreviewScale);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measurePreviewScale);
    };
  }, [measurePreviewScale, renderDocument]);

  useEffect(() => {
    const resetPreviewScrollForPrint = () => {
      const previewStageScroll = previewStageScrollRef.current;

      if (!previewStageScroll) {
        return;
      }

      if (previewScrollRestoreRef.current === null) {
        previewScrollRestoreRef.current = previewStageScroll.scrollTop;
      }

      previewStageScroll.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    const restorePreviewScrollAfterPrint = () => {
      const previewStageScroll = previewStageScrollRef.current;

      if (!previewStageScroll || previewScrollRestoreRef.current === null) {
        return;
      }

      previewStageScroll.scrollTo({
        top: previewScrollRestoreRef.current,
        left: 0,
        behavior: "auto",
      });
      previewScrollRestoreRef.current = null;
    };

    window.addEventListener("beforeprint", resetPreviewScrollForPrint);
    window.addEventListener("afterprint", restorePreviewScrollAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", resetPreviewScrollForPrint);
      window.removeEventListener("afterprint", restorePreviewScrollAfterPrint);
    };
  }, []);

  useEffect(() => {
    const restoreId = window.setTimeout(() => {
      try {
        const result = loadResumeLibrary(initialResume, undefined, { templateId });
        if (result.library) {
          const library = result.library;
          dispatchWorkspace({ type: "hydrate-library", library });
          const hydratedDocument = library.resumes.find((document) => document.id === library.activeResumeId);
          if (hydratedDocument) {
            setOpenSectionId(resolveLastOpenSectionId(hydratedDocument, readLastOpenSectionId(hydratedDocument.id)));
            setExpandedEducationId(getSection(hydratedDocument, "education")?.content.entries[0]?.id ?? null);
          }
          setSaveStatus("saved");
        } else if (!result.ok) {
          setSaveStatus("error");
        }
      } catch {
        // Persistence failures are intentionally recoverable; keep the in-memory sample/document.
        setSaveStatus("error");
      } finally {
        hasLoadedLibrary.current = true;
      }
    }, 0);

    return () => window.clearTimeout(restoreId);
  }, [initialResume, templateId]);

  useEffect(() => {
    if (!hasLoadedLibrary.current) {
      return;
    }
    persistLibrary(workspace.library);
  }, [persistLibrary, workspace.library]);

  const previewPageWidth = pageAwareness.firstPageHeight
    ? pageAwareness.firstPageHeight / LETTER_PAGE_ASPECT_RATIO
    : 816;
  const previewPageHeight =
    pageAwareness.firstPageHeight || previewPageWidth * LETTER_PAGE_ASPECT_RATIO;
  const scaledPreviewPageWidth = previewPageWidth * previewScale;
  const scaledPreviewSurfaceWidth = scaledPreviewPageWidth + previewSurfaceChromeWidth;
  const scaledPreviewPageHeight =
    previewPageHeight * previewScale;
  const previewDocumentHeight = Math.max(previewPageHeight, pageAwareness.contentHeight);
  const scaledPreviewDocumentHeight = previewDocumentHeight * previewScale;
  const scaledPreviewSurfaceHeight = scaledPreviewDocumentHeight + previewSurfaceChromeHeight;
  const previewScaleStyle = {
    width: `${previewPageWidth}px`,
    minHeight: `${previewPageHeight}px`,
    transform: `scale(${previewScale})`,
    transformOrigin: "top left",
  } as CSSProperties;

  const handleExportPDF = async () => {
    flushTextHistory();
    const saveResult = persistLibrary(workspace.library);
    if (!saveResult.ok) {
      setExportPdfError("Resume could not be saved before export.");
      return;
    }
    setExportPdfError(null);
    setIsExportingPdf(true);

    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document: renderDocument,
          templateId,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const pdfBlob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(pdfBlob);
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? "resume.pdf";
      const downloadLink = document.createElement("a");

      downloadLink.href = downloadUrl;
      downloadLink.download = filename;
      document.body.append(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("PDF export failed", error);
      setExportPdfError("PDF export failed. Try again.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const activeHistory = activeDocument ? workspace.histories[activeDocument.id] : undefined;
  const canUndo = Boolean(activeHistory?.past.length);
  const canRedo = Boolean(activeHistory?.future.length);
  const handleUndo = () => {
    setSaveStatus("saving");
    setSkillTextDrafts({});
    flushTextHistory();
    dispatchWorkspace({ type: "undo" });
  };
  const handleRedo = () => {
    setSaveStatus("saving");
    setSkillTextDrafts({});
    flushTextHistory();
    dispatchWorkspace({ type: "redo" });
  };

  const updateExperience = (
    experienceId: string | number,
    updater: (item: Resume["experience"][number]) => Resume["experience"][number],
  ) => {
    dispatchDocument({ type: "legacy-update", update: (document) => {
      const projection = toLegacyResume(document);
      const resolvedId = typeof experienceId === "number" ? projection.experience[experienceId]?.id : experienceId;
      return mergeLegacyResume(document, { ...projection, experience: projection.experience.map((item) => item.id === resolvedId ? updater(item) : item) }, templateId);
    } }, { text: true, key: `experience:${experienceId}` });
  };

  const updateExperienceBullet = (experienceId: string, bulletId: string, text: string) => {
    const section = getSection(activeDocument ?? initialDocument, "experience");
    const entry = section?.type === "experience" ? section.content.entries.find((item) => item.id === experienceId) : undefined;
    const bullet = entry?.bullets.find((item) => item.id === bulletId);
    if (!section || section.type !== "experience" || !bullet) return;
    dispatchDocument({ type: "set-experience-bullet", sectionId: section.id, entryId: experienceId, bulletId, bullet: { ...bullet, text } }, { text: true, key: `bullet:${bulletId}` });
  };

  const updateProject = (
    projectId: string,
    updater: (project: ProjectEntry) => ProjectEntry,
    historyKey?: string,
  ) => {
    const section = getSection(activeDocument ?? initialDocument, "projects");
    const project = section?.type === "projects"
      ? section.content.entries.find((entry) => entry.id === projectId)
      : undefined;
    if (!section || section.type !== "projects" || !project) return;
    dispatchDocument({
      type: "set-project-entry",
      sectionId: section.id,
      entryId: projectId,
      entry: updater(project),
    }, historyKey ? { text: true, key: historyKey } : undefined);
  };

  const updateProjectBullet = (projectId: string, bulletId: string, text: string) => {
    const section = getSection(activeDocument ?? initialDocument, "projects");
    const project = section?.type === "projects"
      ? section.content.entries.find((entry) => entry.id === projectId)
      : undefined;
    const bullet = project?.bullets.find((item) => item.id === bulletId);
    if (!section || section.type !== "projects" || !project || !bullet) return;
    dispatchDocument({
      type: "set-project-bullet",
      sectionId: section.id,
      entryId: projectId,
      bulletId,
      bullet: { ...bullet, text },
    }, { text: true, key: `project-bullet:${bulletId}` });
  };

  const handleAddProject = () => {
    const section = getSection(activeDocument ?? initialDocument, "projects");
    if (!section || section.type !== "projects") return;
    const project = createEmptyProject();
    dispatchDocument({ type: "add-project-entry", sectionId: section.id, entry: project });
    setExpandedProjectId(project.id);
    window.requestAnimationFrame(() => projectNameRefs.current[project.id]?.focus());
  };

  const handleRemoveProject = (projectId: string) => {
    const section = getSection(activeDocument ?? initialDocument, "projects");
    if (!section || section.type !== "projects") return;
    dispatchDocument({ type: "delete-project-entry", sectionId: section.id, entryId: projectId });
    setExpandedProjectId((currentId) => currentId === projectId ? null : currentId);
  };

  const handleAddProjectBullet = (projectId: string) => {
    const section = getSection(activeDocument ?? initialDocument, "projects");
    if (!section || section.type !== "projects") return;
    dispatchDocument({
      type: "add-project-bullet",
      sectionId: section.id,
      entryId: projectId,
      bullet: { id: createId("bullet"), text: "", included: true },
    });
  };

  const handleRemoveProjectBullet = (projectId: string, bulletId: string) => {
    const section = getSection(activeDocument ?? initialDocument, "projects");
    if (!section || section.type !== "projects") return;
    dispatchDocument({ type: "delete-project-bullet", sectionId: section.id, entryId: projectId, bulletId });
  };

  const updateEducation = (
    educationId: string | number,
    updater: (item: Resume["education"][number]) => Resume["education"][number],
  ) => {
    dispatchDocument({ type: "legacy-update", update: (document) => {
      const projection = toLegacyResume(document);
      const resolvedId = typeof educationId === "number" ? projection.education[educationId]?.id : educationId;
      return mergeLegacyResume(document, { ...projection, education: projection.education.map((item) => item.id === resolvedId ? updater(item) : item) }, templateId);
    } }, { text: true, key: `education:${educationId}` });
  };

  const updateTechnicalSkillCategory = (
    categoryId: string | number,
    updater: (category: ResumeSkillCategory) => ResumeSkillCategory,
  ) => {
    dispatchDocument({ type: "legacy-update", update: (document) => {
      const projection = toLegacyResume(document);
      const resolvedId = typeof categoryId === "number" ? projection.technicalSkills.categories[categoryId]?.id : categoryId;
      return mergeLegacyResume(document, { ...projection, technicalSkills: { ...projection.technicalSkills, categories: projection.technicalSkills.categories.map((category) => category.id === resolvedId ? updater(category) : category) } }, templateId);
    } }, { text: true, key: `skills:${categoryId}` });
  };

  const handleAddExperience = () => {
    const experience = createEmptyExperience();
    dispatchDocument({ type: "legacy-update", update: (document) => {
      const projection = toLegacyResume(document);
      return mergeLegacyResume(document, { ...projection, experience: [...projection.experience, experience] }, templateId);
    } });
    setExpandedExperienceId(experience.id ?? null);
    setIsExperienceExpansionExplicitlyCollapsed(false);
  };

  const handleRemoveExperience = (experienceId: string | number) => {
    dispatchDocument({ type: "legacy-update", update: (document) => {
      const projection = toLegacyResume(document);
      const resolvedId = typeof experienceId === "number" ? projection.experience[experienceId]?.id : experienceId;
      return mergeLegacyResume(document, { ...projection, experience: projection.experience.filter((item) => item.id !== resolvedId) }, templateId);
    } });
    const resolvedId = typeof experienceId === "number" ? resume.experience[experienceId]?.id : experienceId;
    setExpandedExperienceId((currentExpandedId) => {
      if (currentExpandedId !== resolvedId) return currentExpandedId;
      const resolvedIndex = resume.experience.findIndex((item) => item.id === resolvedId);
      const nextEntry = resume.experience[resolvedIndex + 1] ?? resume.experience[resolvedIndex - 1];
      return nextEntry?.id ?? null;
    });
  };

  const handleAddEducation = () => {
    const education = createEmptyEducation();
    dispatchDocument({ type: "legacy-update", update: (document) => {
      const projection = toLegacyResume(document);
      return mergeLegacyResume(document, { ...projection, education: [...projection.education, education] }, templateId);
    } });
    setExpandedEducationId(education.id ?? null);
  };

  const handleRemoveEducation = (educationId: string | number) => {
    const resolvedId = typeof educationId === "number" ? resume.education[educationId]?.id ?? "" : educationId;
    dispatchDocument({ type: "legacy-update", update: (document) => {
      const projection = toLegacyResume(document);
      return mergeLegacyResume(document, { ...projection, education: projection.education.filter((item) => item.id !== resolvedId) }, templateId);
    } });
    setExpandedEducationId((currentExpandedId) => {
      if (currentExpandedId !== resolvedId) return currentExpandedId;
      const resolvedIndex = resume.education.findIndex((item) => item.id === resolvedId);
      const nextEntry = resume.education[resolvedIndex + 1] ?? resume.education[resolvedIndex - 1];
      return nextEntry?.id ?? null;
    });
  };

  const getSectionTitle = (section: ResumeSection) => {
    switch (section.type) {
      case "summary":
        return "Summary";
      case "experience":
        return "Experience";
      case "projects":
        return "Projects";
      case "technicalSkills":
        return "Technical Skills";
      case "education":
        return "Education";
      case "certifications":
        return "Certifications";
      case "custom":
        return section.content.title.trim() || "Custom Section";
    }
  };

  const getSectionSummary = (section: ResumeSection) => {
    switch (section.type) {
      case "summary":
        return summarySectionSummary;
      case "experience":
        return experienceSectionSummary;
      case "projects":
        return section.content.entries.length > 0
          ? `${section.content.entries.length} ${section.content.entries.length === 1 ? "project" : "projects"}`
          : "No projects";
      case "technicalSkills":
        return skillsSectionSummary;
      case "education":
        return educationSectionSummary;
      case "certifications":
        return section.content.entries.length > 0
          ? `${section.content.entries.length} ${section.content.entries.length === 1 ? "certification" : "certifications"}`
          : "No certifications";
      case "custom":
        return truncateEditorSectionSummary(
          section.content.lines.length > 0
            ? `${section.content.lines.length} ${section.content.lines.length === 1 ? "line" : "lines"}`
            : "No lines",
        );
    }
  };

  const toggleEditorSection = (sectionId: string) => {
    const nextSectionId = openSectionId === sectionId ? null : sectionId;
    setOpenSectionId(nextSectionId);
    if (activeDocument) writeLastOpenSectionId(activeDocument.id, nextSectionId);
  };

  const toggleHeaderSection = () => {
    const nextSectionId = openSectionId === "header" ? null : "header";
    setOpenSectionId(nextSectionId);
    if (activeDocument) writeLastOpenSectionId(activeDocument.id, nextSectionId);
  };

  const getInsertionPosition = (container: HTMLElement, pointerY: number) => {
    const itemBounds = Array.from(container.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child.dataset.reorderItem === "true")
      .map((child) => child.getBoundingClientRect());
    return getReorderInsertionPosition(pointerY, itemBounds);
  };

  const getInsertionIndicator = (container: HTMLElement, position: number) => {
    const items = Array.from(container.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child.dataset.reorderItem === "true");
    const containerBounds = container.getBoundingClientRect();
    const itemBounds = items.map((item) => item.getBoundingClientRect());
    const boundaryY = itemBounds.length === 0
      ? containerBounds.top
      : position === 0
        ? itemBounds[0].top
        : position >= itemBounds.length
          ? itemBounds[itemBounds.length - 1].bottom
          : itemBounds[position].top;

    return {
      top: boundaryY - containerBounds.top,
      left: 0,
      width: containerBounds.width,
    };
  };

  const getContainerFromElement = (element: Element | null | undefined): ReorderContainer | null => {
    const containerElement = element?.closest<HTMLElement>("[data-reorder-container]");
    if (!containerElement) return null;
    const kind = containerElement.dataset.reorderKind;
    const key = containerElement.dataset.reorderContainer;
    if (!key || (kind !== "section" && kind !== "experience" && kind !== "project" && kind !== "education" && kind !== "project-bullet" && kind !== "experience-bullet")) return null;
    return {
      key,
      kind,
      sectionId: containerElement.dataset.reorderSectionId,
      entryId: containerElement.dataset.reorderEntryId,
    };
  };

  const updatePointerReorderTarget = useCallback((clientX: number, clientY: number) => {
    const session = pointerReorderSessionRef.current;
    if (!session?.active) return;
    const containerElement = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-reorder-container]");
    const container = getContainerFromElement(containerElement);
    if (!container || !isPayloadForContainer(session.payload, container) || !containerElement) {
      const nextSession = { ...session, clientX, clientY, container: null, position: null };
      pointerReorderSessionRef.current = nextSession;
      setPointerReorder(nextSession);
      setReorderDropTarget(null);
      return;
    }

    const position = getInsertionPosition(containerElement, clientY);
    const indicator = getInsertionIndicator(containerElement, position);
    const nextSession = { ...session, clientX, clientY, container, position };
    pointerReorderSessionRef.current = nextSession;
    setPointerReorder(nextSession);
    setReorderDropTarget({ containerKey: container.key, position, ...indicator });
  }, []);
  useEffect(() => {
    updatePointerReorderTargetRef.current = updatePointerReorderTarget;
  }, [updatePointerReorderTarget]);

  const resetPointerReorder = useCallback((element?: HTMLButtonElement, pointerId?: number) => {
    stopSectionAutoScroll();
    const session = pointerReorderSessionRef.current;
    if (element && pointerId !== undefined && element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
    pointerReorderSessionRef.current = null;
    setPointerReorder(null);
    setReorderDropTarget(null);
    return session;
  }, [stopSectionAutoScroll]);

  const commitPointerReorder = (session: PointerReorderSession) => {
    if (!activeDocument || !session.active || !session.container || session.position === null) return;
    const { payload, container, position } = session;
    if (payload.kind === "section") {
      const sourceIndex = activeDocument.sections.findIndex((section) => section.id === payload.itemId);
      const toIndex = resolveReorderInsertionIndex(sourceIndex, position, activeDocument.sections.length);
      if (toIndex !== null) dispatchDocument({ type: "move-section", sectionId: payload.itemId, toIndex });
    } else if (payload.kind === "experience" || payload.kind === "project" || payload.kind === "education") {
      const sectionType = payload.kind === "experience" ? "experience" : payload.kind === "project" ? "projects" : "education";
      const section = getSection(activeDocument, sectionType);
      const itemCount = section && "entries" in section.content ? section.content.entries.length : 0;
      const sourceIndex = section && "entries" in section.content
        ? section.content.entries.findIndex((entry) => entry.id === payload.itemId)
        : -1;
      const toIndex = resolveReorderInsertionIndex(sourceIndex, position, itemCount);
      if (toIndex !== null) dispatchDocument({ type: "move-entry", sectionId: container.sectionId ?? payload.sectionId, entryId: payload.itemId, toIndex });
    } else {
      const section = getSection(activeDocument, payload.kind === "project-bullet" ? "projects" : "experience");
      const entry = section && "entries" in section.content
        ? section.content.entries.find((candidate) => candidate.id === payload.entryId)
        : undefined;
      const itemCount = entry && "bullets" in entry ? entry.bullets.length : 0;
      const sourceIndex = entry && "bullets" in entry
        ? entry.bullets.findIndex((bullet) => bullet.id === payload.itemId)
        : -1;
      const toIndex = resolveReorderInsertionIndex(sourceIndex, position, itemCount);
      if (toIndex !== null) dispatchDocument({ type: "move-bullet", sectionId: container.sectionId ?? payload.sectionId, entryId: container.entryId ?? payload.entryId, bulletId: payload.itemId, toIndex });
    }
  };

  const handleReorderPointerDown = (payload: ReorderDragPayload, event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    const session: PointerReorderSession = {
      payload,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      active: false,
      container: null,
      position: null,
    };
    pointerReorderSessionRef.current = session;
    setPointerReorder(session);
    setReorderDropTarget(null);
    autoScrollDirectionRef.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleReorderPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const session = pointerReorderSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    if (!session.active && !hasPointerMovedBeyondThreshold(session.startX, session.startY, event.clientX, event.clientY, POINTER_REORDER_THRESHOLD_PX)) return;
    const nextSession = { ...session, active: true, clientX: event.clientX, clientY: event.clientY };
    pointerReorderSessionRef.current = nextSession;
    setPointerReorder(nextSession);
    updatePointerReorderTarget(event.clientX, event.clientY);
    updateSectionAutoScroll(event.clientY);
  };

  const handleReorderPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const session = pointerReorderSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    if (session.active) commitPointerReorder(session);
    resetPointerReorder(event.currentTarget, event.pointerId);
  };

  const handleReorderPointerCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    const session = pointerReorderSessionRef.current;
    if (session?.pointerId === event.pointerId) resetPointerReorder(event.currentTarget, event.pointerId);
  };

  useEffect(() => {
    if (!pointerReorder?.active) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      resetPointerReorder();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [pointerReorder?.active, resetPointerReorder]);

  if (!selectedTemplate) {
    return null;
  }

  const SelectedTemplate = selectedTemplate.component;

  const printedPageMetrics = pageAwareness.firstPageHeight
    ? calculatePrintedPageMetrics(pageAwareness.contentHeight, pageAwareness.firstPageHeight)
    : null;
  const rawPageFillPercent = printedPageMetrics
    ? Math.round(printedPageMetrics.pageFillRatio * 100)
    : 0;
  const pageFillPercent = Math.min(100, rawPageFillPercent);
  const documentTitle = resume.title.trim() || resume.header.name.trim() || "Untitled resume";
  const templateLabel = selectedTemplate?.name ?? "Template";
  const developmentBuildId = process.env.NODE_ENV !== "production"
    ? process.env.NEXT_PUBLIC_RESUME_STUDIO_BUILD_ID
    : null;
  const pageCountLabel = `${pageAwareness.pageCount} ${
    pageAwareness.pageCount === 1 ? "page" : "pages"
  }`;
  const previewStateLabel = getPreviewStatusLabel({
    saveStatus,
    isOverflowing: pageAwareness.isOverflowing,
    isNearLimit: pageAwareness.isNearLimit,
    pageFillPercent,
  });
  const headerSectionSummary = truncateEditorSectionSummary(
    [
      resume.header.name.trim(),
      resume.header.email.trim(),
      resume.header.phone.trim(),
      resume.header.location.trim(),
    ]
      .filter(Boolean)
      .join(" · "),
  );
  const summarySectionSummary = truncateEditorSectionSummary(resume.summary);
  const experienceSectionSummary = truncateEditorSectionSummary(
    resume.experience.length > 0
      ? `${resume.experience.length} ${
          resume.experience.length === 1 ? "role" : "roles"
        } · ${formatExperienceCardSummary(resume.experience[0])}`
      : "No roles",
  );
  const educationSectionSummary = truncateEditorSectionSummary(
    resume.education.length > 0
      ? `${resume.education.length} ${
          resume.education.length === 1 ? "entry" : "entries"
        } · ${formatEducationCardSummary(resume.education[0])}`
      : "No education entries",
  );
  const skillsSectionSummary = truncateEditorSectionSummary(
    resume.technicalSkills.categories.length > 0
      ? `${resume.technicalSkills.categories.length} ${
          resume.technicalSkills.categories.length === 1 ? "category" : "categories"
        } · ${resume.technicalSkills.categories
          .slice(0, 2)
          .map((category) => category.label.trim() || "Untitled")
          .join(" · ")}`
      : "No skill categories",
  );
  return (
    <main className="resume-app-shell">
      <header className="resume-shell-toolbar" aria-label="Workspace toolbar">
        <div className="resume-shell-toolbar-rail">
          <div className="resume-shell-toolbar-brand">
            <p className="resume-shell-toolbar-kicker">Resume Studio</p>
          </div>

          <div className="resume-shell-toolbar-actions">
            <AppearanceControl />
            <button
              className="resume-shell-toolbar-button resume-shell-toolbar-button--export"
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPdf}
            >
              {isExportingPdf ? "Exporting..." : "Export PDF"}
            </button>
            {exportPdfError ? (
              <p className="resume-shell-toolbar-status" role="status">
                {exportPdfError}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="resume-workspace">
        <section ref={editorPanelRef} className="resume-editor-panel">
          <div className="resume-editor-head">
            <div className="resume-editor-head-block">
              <p className="resume-editor-template-name">{templateLabel}</p>
              <p className="resume-editor-document-name">{documentTitle}</p>
            </div>

            <div className="resume-editor-head-actions">
              <div className="resume-editor-head-undo">
                <button
                  className={`resume-editor-head-action resume-editor-head-action--control${canUndo ? "" : " is-disabled"}`}
                  type="button"
                  disabled={!canUndo}
                  onClick={handleUndo}
                >
                  Undo
                </button>
                <button
                  className={`resume-editor-head-action resume-editor-head-action--control${canRedo ? "" : " is-disabled"}`}
                  type="button"
                  disabled={!canRedo}
                  onClick={handleRedo}
                >
                  Redo
                </button>
              </div>

            </div>
          </div>

            <div
              ref={editorScrollRef}
              className="resume-editor-panel-scroll"
            >
            <div
              className="resume-editor-stack divide-y divide-[var(--rs-line-soft)] rs-reorder-container"
              data-reorder-container="sections"
              data-reorder-kind="section"
            >
              <EditorStackSection
              title="Header"
              summary={headerSectionSummary}
              isFixedHeader
              isOpen={openSectionId === "header"}
              onToggle={toggleHeaderSection}
            >
              <div className="space-y-3">
                <p className={UI_NOTE_CLASSES}>
                  Name and contact details shown in the resume header.
                </p>

                <div className="rs-header-identity-block">
                  <div className="rs-property-row">
                    <div className="rs-property-label">Name</div>
                    <div className="rs-property-value">
                      <input
                        className="rs-property-control rs-header-control"
                        value={resume.header.name}
                        onChange={(event) =>
                          dispatchDocument({ type: "set-header-field", field: "name", value: event.target.value }, { text: true, key: "header:name" })
                        }
                      />
                    </div>
                  </div>

                  <div className="rs-property-row">
                    <div className="rs-property-label">Email</div>
                    <div className="rs-property-value">
                      <input
                        className="rs-property-control rs-header-control"
                        value={resume.header.email}
                        onChange={(event) =>
                          dispatchDocument({ type: "set-header-field", field: "email", value: event.target.value }, { text: true, key: "header:email" })
                        }
                      />
                    </div>
                  </div>

                  <div className="rs-property-row">
                    <div className="rs-property-label">Phone</div>
                    <div className="rs-property-value">
                      <input
                        className="rs-property-control rs-header-control"
                        value={resume.header.phone}
                        onChange={(event) =>
                          dispatchDocument({ type: "set-header-field", field: "phone", value: event.target.value }, { text: true, key: "header:phone" })
                        }
                      />
                    </div>
                  </div>

                  <div className="rs-property-row">
                    <div className="rs-property-label">Location</div>
                    <div className="rs-property-value">
                      <input
                        className="rs-property-control rs-header-control"
                        value={resume.header.location}
                        onChange={(event) =>
                          dispatchDocument({ type: "set-header-field", field: "location", value: event.target.value }, { text: true, key: "header:location" })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </EditorStackSection>

            <ReorderInsertionIndicator target={reorderDropTarget} containerKey="sections" />

            {renderDocument.sections.map((section, sectionIndex) => {
              const sectionProps = {
                included: section.included,
                onToggleIncluded: () => dispatchDocument({
                  type: "set-section-included",
                  sectionId: section.id,
                  included: !section.included,
                }),
                canMoveUp: sectionIndex > 0,
                canMoveDown: sectionIndex < renderDocument.sections.length - 1,
                onMoveUp: () => dispatchDocument({
                  type: "move-section",
                  sectionId: section.id,
                  toIndex: sectionIndex - 1,
                }),
                onMoveDown: () => dispatchDocument({
                  type: "move-section",
                  sectionId: section.id,
                  toIndex: sectionIndex + 1,
                }),
                reorderItemId: section.id,
                isDragging: pointerReorder?.active === true && pointerReorder.payload.kind === "section" && pointerReorder.payload.itemId === section.id,
                reorderHandle: (
                  <ReorderHandle
                    label={`Reorder ${getSectionTitle(section)}`}
                    onPointerDown={(event) => handleReorderPointerDown({ kind: "section", itemId: section.id }, event)}
                    onPointerMove={handleReorderPointerMove}
                    onPointerUp={handleReorderPointerUp}
                    onPointerCancel={handleReorderPointerCancel}
                    onLostPointerCapture={handleReorderPointerCancel}
                  />
                ),
              };

              switch (section.type) {
                case "summary":
                  return (
                    <Fragment key={section.id}>
                      <EditorStackSection
                      title="Summary"
                      summary={getSectionSummary(section)}
                      isOpen={resolvedOpenSectionId === section.id}
                      onToggle={() => toggleEditorSection(section.id)}
                      {...sectionProps}
                    >
              <div className="space-y-3">
                <p className={UI_NOTE_CLASSES}>
                  Short professional summary shown below the header.
                </p>
                <div className="rs-summary-block">
                  <label className="rs-summary-field">
                    <span className="rs-summary-label">Summary</span>
                    <textarea
                      className="rs-property-control rs-summary-control"
                      {...autosizeTextareaProps({ minHeight: 120, maxHeight: 220 })}
                      value={resume.summary}
                      onChange={(event) => {
                        const summarySection = getSection(activeDocument ?? initialDocument, "summary");
                        if (summarySection) dispatchDocument({ type: "set-summary", sectionId: summarySection.id, text: event.target.value }, { text: true, key: "summary" });
                        queueAutosizeTextarea(event.currentTarget);
                      }}
                    />
                  </label>
                </div>
              </div>
                      </EditorStackSection>
                    </Fragment>
                  );

                case "experience":
                  return (
                    <Fragment key={section.id}>
                    <EditorStackSection
                      title="Experience"
                      summary={getSectionSummary(section)}
                      isOpen={resolvedOpenSectionId === section.id}
                      onToggle={() => toggleEditorSection(section.id)}
                      {...sectionProps}
                    >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={UI_NOTE_CLASSES}>
                    Expand a role to edit details.
                  </p>
                  <button
                    className={BUTTON_SECONDARY_CLASSES}
                    type="button"
                    onClick={handleAddExperience}
                  >
                    Add experience
                  </button>
                </div>
                <div
                  className="space-y-3 rs-reorder-container"
                  data-reorder-container={`experience:${section.id}`}
                  data-reorder-kind="experience"
                  data-reorder-section-id={section.id}
                >
                <ReorderInsertionIndicator target={reorderDropTarget} containerKey={`experience:${section.id}`} />
                {resume.experience.map((job, jobIndex) => {
                  const isExpanded = job.id === resolvedExpandedExperienceId;
                  const experienceSection = getSection(activeDocument ?? initialDocument, "experience");
                  const canonicalJob = experienceSection?.type === "experience"
                    ? experienceSection.content.entries.find((entry) => entry.id === job.id)
                    : undefined;
                  const experienceBullets = canonicalJob?.bullets ?? [];
                  const experienceBodyId = `experience-${job.id}-body`;
                  const experienceBulletContainer: ReorderContainer = {
                    key: `experience-bullets:${job.id}`,
                    kind: "experience-bullet",
                    sectionId: experienceSection?.id,
                    entryId: job.id,
                  };
                  const bulletGuidance = analyzeExperienceBullets(job.bullets);
                  const experienceGuidanceLine = formatExperienceGuidanceLine(
                    bulletGuidance.bulletCount,
                    bulletGuidance.density.status !== "balanced",
                  );
                  return (
                    <div
                      key={job.id ?? `experience-${jobIndex}`}
                      data-reorder-item="true"
                      className={`${ITEM_SURFACE_CLASSES}${pointerReorder?.active && pointerReorder.payload.kind === "experience" && pointerReorder.payload.itemId === job.id ? " is-dragging" : ""}`}
                    >
                      <div className="rs-entry-header">
                        <div className="rs-entry-structure">
                          <ReorderHandle
                            label={`Reorder Experience ${jobIndex + 1}`}
                            onPointerDown={(event) => handleReorderPointerDown({ kind: "experience", sectionId: experienceSection?.id ?? "", itemId: job.id ?? "" }, event)}
                            onPointerMove={handleReorderPointerMove}
                            onPointerUp={handleReorderPointerUp}
                            onPointerCancel={handleReorderPointerCancel}
                            onLostPointerCapture={handleReorderPointerCancel}
                          />
                          <button
                            className="rs-entry-disclosure-row"
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={experienceBodyId}
                            aria-label={`${isExpanded ? "Collapse" : "Expand"} Experience ${jobIndex + 1}`}
                            onClick={() => {
                              const nextId = expandedExperienceId === job.id ? null : (job.id ?? null);
                              setExpandedExperienceId(nextId);
                              setIsExperienceExpansionExplicitlyCollapsed(nextId === null);
                            }}
                          >
                            <span className="rs-entry-disclosure-mark"><EntryDisclosureMark isOpen={isExpanded} /></span>
                            <span className="min-w-0 flex-1 text-left">
                              <span className={ITEM_INDEX_CLASSES}>
                                Experience {jobIndex + 1}
                              </span>
                              <span className={ITEM_SUMMARY_CLASSES}>
                                {formatExperienceCardSummary(job)}
                              </span>
                              <span className="rs-experience-guidance-line mt-2">
                                {experienceGuidanceLine}
                              </span>
                            </span>
                          </button>
                        </div>
                        <div className="rs-entry-actions">
                          <RemoveButton
                            label={`Remove Experience ${jobIndex + 1}`}
                            onClick={() => handleRemoveExperience(job.id ?? "")}
                            disabled={resume.experience.length <= 1}
                            variant="entry"
                          />
                        </div>
                      </div>

                      {isExpanded ? (
                        <div id={experienceBodyId} className="mt-3 border-t border-[var(--rs-line-soft)] pt-3">
                          <div className="rs-experience-metadata">
                            <div className="rs-property-row">
                              <div className="rs-property-label">Title</div>
                              <div className="rs-property-value">
                                <input
                                  className="rs-property-control"
                                  value={job.title}
                                  onChange={(event) =>
                                    updateExperience(job.id ?? "", (currentJob) => ({
                                      ...currentJob,
                                      title: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>

                            <div className="rs-property-row">
                              <div className="rs-property-label">Company</div>
                              <div className="rs-property-value">
                                <input
                                  className="rs-property-control"
                                  value={job.company}
                                  onChange={(event) =>
                                    updateExperience(job.id ?? "", (currentJob) => ({
                                      ...currentJob,
                                      company: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>

                            <div className="rs-property-row rs-property-row--dates">
                              <div className="rs-property-label">Dates</div>
                              <div className="rs-property-value">
                                <div className="rs-property-grid">
                                  <label className="rs-property-field">
                                    <span className="rs-property-field-label">Start month</span>
                                    <select
                                      className="rs-property-control"
                                      value={job.dateRange.startMonth}
                                      onChange={(event) =>
                                        updateExperience(job.id ?? "", (currentJob) => ({
                                          ...currentJob,
                                          dateRange: {
                                            ...currentJob.dateRange,
                                            startMonth: event.target.value,
                                          },
                                        }))
                                      }
                                    >
                                      {MONTH_OPTIONS.map((month) => (
                                        <option key={month} value={month}>
                                          {month}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="rs-property-field">
                                    <span className="rs-property-field-label">Start year</span>
                                    <select
                                      className="rs-property-control"
                                      value={job.dateRange.startYear}
                                      onChange={(event) =>
                                        updateExperience(job.id ?? "", (currentJob) => ({
                                          ...currentJob,
                                          dateRange: {
                                            ...currentJob.dateRange,
                                            startYear: event.target.value,
                                          },
                                        }))
                                      }
                                    >
                                      {YEAR_OPTIONS.map((year) => (
                                        <option key={year} value={year}>
                                          {year}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>

                                <label className="rs-property-toggle">
                                  <input
                                    className="rs-checkbox"
                                    type="checkbox"
                                    checked={Boolean(job.dateRange.current)}
                                    onChange={(event) =>
                                      updateExperience(job.id ?? "", (currentJob) => ({
                                        ...currentJob,
                                        dateRange: {
                                          ...currentJob.dateRange,
                                          current: event.target.checked,
                                          endMonth: event.target.checked
                                            ? undefined
                                            : currentJob.dateRange.endMonth ?? currentJob.dateRange.startMonth,
                                          endYear: event.target.checked
                                            ? undefined
                                            : currentJob.dateRange.endYear ?? currentJob.dateRange.startYear,
                                        },
                                      }))
                                    }
                                  />
                                  <span>Current role</span>
                                </label>

                                {!job.dateRange.current ? (
                                  <div className="rs-property-grid rs-property-grid--end">
                                    <label className="rs-property-field">
                                      <span className="rs-property-field-label">End month</span>
                                      <select
                                        className="rs-property-control"
                                        value={job.dateRange.endMonth ?? MONTH_OPTIONS[0]}
                                        onChange={(event) =>
                                          updateExperience(job.id ?? "", (currentJob) => ({
                                            ...currentJob,
                                            dateRange: {
                                              ...currentJob.dateRange,
                                              endMonth: event.target.value,
                                            },
                                          }))
                                        }
                                      >
                                        {MONTH_OPTIONS.map((month) => (
                                          <option key={month} value={month}>
                                            {month}
                                          </option>
                                        ))}
                                      </select>
                                    </label>

                                    <label className="rs-property-field">
                                      <span className="rs-property-field-label">End year</span>
                                      <select
                                        className="rs-property-control"
                                        value={job.dateRange.endYear ?? YEAR_OPTIONS[0]}
                                        onChange={(event) =>
                                          updateExperience(job.id ?? "", (currentJob) => ({
                                            ...currentJob,
                                            dateRange: {
                                              ...currentJob.dateRange,
                                              endYear: event.target.value,
                                            },
                                          }))
                                        }
                                      >
                                        {YEAR_OPTIONS.map((year) => (
                                          <option key={year} value={year}>
                                            {year}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="rs-property-row">
                              <div className="rs-property-label">Location</div>
                              <div className="rs-property-value">
                                <input
                                  className="rs-property-control"
                                  value={job.location}
                                  onChange={(event) =>
                                    updateExperience(job.id ?? "", (currentJob) => ({
                                      ...currentJob,
                                      location: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          <div
                            className="rs-bullet-composer"
                            data-reorder-container={experienceBulletContainer.key}
                            data-reorder-kind={experienceBulletContainer.kind}
                            data-reorder-section-id={experienceBulletContainer.sectionId}
                            data-reorder-entry-id={experienceBulletContainer.entryId}
                          >
                            <div className="rs-bullet-composer-head">
                              <p className={ITEM_INDEX_CLASSES}>
                                Bullets
                              </p>
                              <button
                                className={`${BUTTON_SECONDARY_CLASSES} rs-button--compact`}
                                type="button"
                                onClick={() => {
                                  const section = getSection(activeDocument ?? initialDocument, "experience");
                                  if (section?.type === "experience") dispatchDocument({ type: "add-experience-bullet", sectionId: section.id, entryId: job.id ?? "", bullet: { id: createId("bullet"), text: "", included: true } });
                                }}
                              >
                                Add bullet
                              </button>
                            </div>
                            <ReorderInsertionIndicator target={reorderDropTarget} containerKey={experienceBulletContainer.key} />
                            {experienceBullets.map((bullet, bulletIndex) => {
                              return (
                                <Fragment key={bullet.id}>
                                <div
                                  data-reorder-item="true"
                                  className={`rs-bullet-piece${pointerReorder?.active && pointerReorder.payload.kind === "experience-bullet" && pointerReorder.payload.itemId === bullet.id ? " is-dragging" : ""}`}
                                >
                                  <div className="rs-bullet-piece-row">
                                    <ReorderHandle
                                      label={`Reorder Experience bullet ${bulletIndex + 1}`}
                                      onPointerDown={(event) => handleReorderPointerDown({ kind: "experience-bullet", sectionId: experienceSection?.id ?? "", entryId: job.id ?? "", itemId: bullet.id }, event)}
                                      onPointerMove={handleReorderPointerMove}
                                      onPointerUp={handleReorderPointerUp}
                                      onPointerCancel={handleReorderPointerCancel}
                                      onLostPointerCapture={handleReorderPointerCancel}
                                    />
                                    <textarea
                                      className="rs-bullet-textarea"
                                      {...autosizeTextareaProps({ minHeight: 72, maxHeight: 160 })}
                                      value={bullet.text}
                                      onChange={(event) => {
                                        updateExperienceBullet(job.id ?? "", bullet.id, event.target.value);
                                        queueAutosizeTextarea(event.currentTarget);
                                      }}
                                    />
                                    <RemoveButton
                                      label={`Remove Experience bullet ${bulletIndex + 1}`}
                                      onClick={() => {
                                        if (experienceSection?.type === "experience") dispatchDocument({ type: "delete-experience-bullet", sectionId: experienceSection.id, entryId: job.id ?? "", bulletId: bullet.id });
                                      }}
                                    />
                                  </div>
                                </div>
                                </Fragment>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              </div>
                    </EditorStackSection>
                    </Fragment>
                  );

                case "education":
                  return (
                    <Fragment key={section.id}>
                    <EditorStackSection
                      title="Education"
                      summary={getSectionSummary(section)}
                      isOpen={resolvedOpenSectionId === section.id}
                      onToggle={() => toggleEditorSection(section.id)}
                      {...sectionProps}
                    >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={UI_NOTE_CLASSES}>
                    Expand an entry to edit school details and structured dates.
                  </p>
                  <button
                    className={BUTTON_SECONDARY_CLASSES}
                    type="button"
                    onClick={handleAddEducation}
                  >
                    Add education
                  </button>
                </div>
                <div
                  className="space-y-3 rs-reorder-container"
                  data-reorder-container={`education:${section.id}`}
                  data-reorder-kind="education"
                  data-reorder-section-id={section.id}
                >
                <ReorderInsertionIndicator target={reorderDropTarget} containerKey={`education:${section.id}`} />
                {resume.education.map((item, itemIndex) => {
                  const educationId = item.id ?? `education-${itemIndex}`;
                  const isExpanded = expandedEducationId === educationId;
                  const educationBodyId = `education-${educationId}-body`;
                  return (
                    <div
                      key={educationId}
                      data-reorder-item="true"
                      className={`${ITEM_SURFACE_CLASSES}${pointerReorder?.active && pointerReorder.payload.kind === "education" && pointerReorder.payload.itemId === educationId ? " is-dragging" : ""}`}
                    >
                      <div className="rs-entry-header">
                        <div className="rs-entry-structure">
                          <ReorderHandle
                            label={`Reorder Education ${itemIndex + 1}`}
                            onPointerDown={(event) => handleReorderPointerDown({ kind: "education", sectionId: section.id, itemId: educationId }, event)}
                            onPointerMove={handleReorderPointerMove}
                            onPointerUp={handleReorderPointerUp}
                            onPointerCancel={handleReorderPointerCancel}
                            onLostPointerCapture={handleReorderPointerCancel}
                          />
                          <button
                            className="rs-entry-disclosure-row"
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={educationBodyId}
                            aria-label={`${isExpanded ? "Collapse" : "Expand"} Education ${itemIndex + 1}`}
                            onClick={() => setExpandedEducationId((currentId) => currentId === educationId ? null : educationId)}
                          >
                            <span className="rs-entry-disclosure-mark"><EntryDisclosureMark isOpen={isExpanded} /></span>
                            <span className="min-w-0 flex-1 text-left">
                              <span className={ITEM_INDEX_CLASSES}>
                                Education {itemIndex + 1}
                              </span>
                              <span className={ITEM_SUMMARY_CLASSES}>
                                {formatEducationCardSummary(item)}
                              </span>
                            </span>
                          </button>
                        </div>
                        <div className="rs-entry-actions">
                          <RemoveButton
                            label={`Remove Education ${itemIndex + 1}`}
                            onClick={() => handleRemoveEducation(educationId)}
                            disabled={resume.education.length <= 1}
                            variant="entry"
                          />
                        </div>
                      </div>

                      {isExpanded ? (
                        <div id={educationBodyId} className="mt-3 border-t border-[var(--rs-line-soft)] pt-3">
                          <div className="rs-education-metadata">
                            <div className="rs-property-row">
                              <div className="rs-property-label">School</div>
                              <div className="rs-property-value">
                                <input
                                  className="rs-property-control"
                                  value={item.school}
                                  onChange={(event) =>
                                    updateEducation(item.id ?? "", (currentItem) => ({
                                      ...currentItem,
                                      school: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>

                            <div className="rs-property-row">
                              <div className="rs-property-label">Degree</div>
                              <div className="rs-property-value">
                                <input
                                  className="rs-property-control"
                                  value={item.degree}
                                  onChange={(event) =>
                                    updateEducation(item.id ?? "", (currentItem) => ({
                                      ...currentItem,
                                      degree: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>

                            <div className="rs-property-row rs-property-row--dates rs-education-dates-row">
                              <div className="rs-property-label">Dates</div>
                              <div className="rs-property-value rs-education-dates-value">
                                <div className="rs-property-grid rs-education-dates-grid">
                                  <label className="rs-property-field">
                                    <span className="rs-property-field-label">Start month</span>
                                    <select
                                      className="rs-property-control"
                                      value={item.dateRange.startMonth}
                                      onChange={(event) =>
                                        updateEducation(item.id ?? "", (currentItem) => ({
                                          ...currentItem,
                                          dateRange: {
                                            ...currentItem.dateRange,
                                            startMonth: event.target.value,
                                          },
                                        }))
                                      }
                                    >
                                      {MONTH_OPTIONS.map((month) => (
                                        <option key={month} value={month}>
                                          {month}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="rs-property-field">
                                    <span className="rs-property-field-label">Start year</span>
                                    <select
                                      className="rs-property-control"
                                      value={item.dateRange.startYear}
                                      onChange={(event) =>
                                        updateEducation(item.id ?? "", (currentItem) => ({
                                          ...currentItem,
                                          dateRange: {
                                            ...currentItem.dateRange,
                                            startYear: event.target.value,
                                          },
                                        }))
                                      }
                                    >
                                      {YEAR_OPTIONS.map((year) => (
                                        <option key={year} value={year}>
                                          {year}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>

                                <label className="rs-property-toggle rs-education-date-toggle">
                                  <input
                                    className="rs-checkbox"
                                    type="checkbox"
                                    checked={Boolean(item.dateRange.current)}
                                    onChange={(event) =>
                                      updateEducation(item.id ?? "", (currentItem) => ({
                                        ...currentItem,
                                        dateRange: {
                                          ...currentItem.dateRange,
                                          current: event.target.checked,
                                          endMonth: event.target.checked
                                            ? undefined
                                            : currentItem.dateRange.endMonth ?? currentItem.dateRange.startMonth,
                                          endYear: event.target.checked
                                            ? undefined
                                            : currentItem.dateRange.endYear ?? currentItem.dateRange.startYear,
                                        },
                                      }))
                                    }
                                  />
                                  <span>Currently enrolled</span>
                                </label>

                                {!item.dateRange.current ? (
                                  <div className="rs-property-grid rs-property-grid--end rs-education-dates-grid rs-education-dates-grid--end">
                                    <label className="rs-property-field">
                                      <span className="rs-property-field-label">End month</span>
                                      <select
                                        className="rs-property-control"
                                        value={item.dateRange.endMonth ?? MONTH_OPTIONS[0]}
                                        onChange={(event) =>
                                          updateEducation(item.id ?? "", (currentItem) => ({
                                            ...currentItem,
                                            dateRange: {
                                              ...currentItem.dateRange,
                                              endMonth: event.target.value,
                                            },
                                          }))
                                        }
                                      >
                                        {MONTH_OPTIONS.map((month) => (
                                          <option key={month} value={month}>
                                            {month}
                                          </option>
                                        ))}
                                      </select>
                                    </label>

                                    <label className="rs-property-field">
                                      <span className="rs-property-field-label">End year</span>
                                      <select
                                        className="rs-property-control"
                                        value={item.dateRange.endYear ?? YEAR_OPTIONS[0]}
                                        onChange={(event) =>
                                          updateEducation(item.id ?? "", (currentItem) => ({
                                            ...currentItem,
                                            dateRange: {
                                              ...currentItem.dateRange,
                                              endYear: event.target.value,
                                            },
                                          }))
                                        }
                                      >
                                        {YEAR_OPTIONS.map((year) => (
                                          <option key={year} value={year}>
                                            {year}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="rs-property-row">
                              <div className="rs-property-label">Location</div>
                              <div className="rs-property-value">
                                <input
                                  className="rs-property-control"
                                  value={item.location ?? ""}
                                  onChange={(event) =>
                                    updateEducation(item.id ?? "", (currentItem) => ({
                                      ...currentItem,
                                      location: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>

                            <div className="rs-property-row rs-education-coursework-row">
                              <div className="rs-property-label">Relevant Coursework</div>
                              <div className="rs-property-value rs-education-coursework-value">
                                <label className="rs-property-field">
                                  <span className="rs-property-field-label">One line per item</span>
                                  <textarea
                                    className="rs-property-control rs-property-control--textarea rs-education-coursework-textarea"
                                    {...autosizeTextareaProps({ minHeight: 96, maxHeight: 180 })}
                                    value={(item.coursework ?? []).join("\n")}
                                    onChange={(event) => {
                                      updateEducation(item.id ?? "", (currentItem) => ({
                                        ...currentItem,
                                        coursework: parseCourseworkLines(event.target.value),
                                      }));
                                      queueAutosizeTextarea(event.currentTarget);
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              </div>
                    </EditorStackSection>
                    </Fragment>
                  );

                case "technicalSkills":
                  return (
                    <Fragment key={section.id}>
                    <EditorStackSection
                      title="Technical Skills"
                      summary={getSectionSummary(section)}
                      isOpen={resolvedOpenSectionId === section.id}
                      onToggle={() => toggleEditorSection(section.id)}
                      {...sectionProps}
                    >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={UI_NOTE_CLASSES}>
                    Labels become bold prefixes. Skills appear after them in the resume.
                  </p>
                  <button
                    className={BUTTON_SECONDARY_CLASSES}
                    type="button"
                    onClick={() =>
                      dispatchDocument({ type: "legacy-update", update: (document) => {
                        const projection = toLegacyResume(document);
                        return mergeLegacyResume(document, { ...projection, technicalSkills: { ...projection.technicalSkills, categories: [...projection.technicalSkills.categories, { id: createId("skill"), label: "New Category", value: "" }] } }, templateId);
                      } })
                    }
                  >
                    Add category
                  </button>
                </div>
                <div className="rs-skill-section-title">
                  <div className="rs-property-row">
                    <div className="rs-property-label">Section title</div>
                    <div className="rs-property-value">
                      <input
                        className="rs-property-control rs-skill-control"
                        value="Technical Skills"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                {resume.technicalSkills.categories.map((category, categoryIndex) => {
                  const canonicalCategory = technicalSkillsSection?.type === "technicalSkills"
                    ? technicalSkillsSection.content.categories.find((item) => item.id === category.id)
                    : undefined;
                  const categorySkills = canonicalCategory?.skills ?? [];
                  const skillDraft = skillTextDrafts[category.id];
                  const displayedSkillText = skillDraft
                    ? rebaseSkillTextDraft(skillDraft, categorySkills).value
                    : serializeSkillNames(categorySkills);
                  return (
                  <div
                    key={category.id}
                    className="rs-skill-group"
                  >
                    <div className="rs-skill-group-head">
                      <p className="rs-skill-group-index">
                        Category {categoryIndex + 1}
                      </p>
                      <button
                        className="rs-structural-remove-control"
                        type="button"
                        onClick={() =>
                          dispatchDocument({ type: "delete-skill-category", sectionId: getSection(activeDocument ?? initialDocument, "technicalSkills")?.id ?? "", categoryId: category.id })
                        }
                        disabled={resume.technicalSkills.categories.length <= 1}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="rs-skill-group-fields">
                      <div className="rs-property-row">
                        <div className="rs-property-label">Display label</div>
                        <div className="rs-property-value">
                          <input
                            className="rs-property-control rs-skill-control"
                            value={category.label}
                            onChange={(event) =>
                              updateTechnicalSkillCategory(category.id, (currentCategory) => ({
                                ...currentCategory,
                                label: event.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="rs-property-row">
                        <div className="rs-property-label">Skills</div>
                        <div className="rs-property-value">
                          <textarea
                            className={`rs-property-control rs-skill-control rs-skill-textarea${
                              displayedSkillText.length > 90 || displayedSkillText.includes("\n")
                                ? " is-expanded"
                                : ""
                            }`}
                            {...autosizeTextareaProps({ minHeight: 64, maxHeight: 140 })}
                            value={displayedSkillText}
                            onFocus={() => {
                              setSkillTextDrafts((current) => current[category.id]
                                ? current
                                : {
                                    ...current,
                                    [category.id]: {
                                      value: serializeSkillNames(categorySkills),
                                      canonicalSignature: getSkillSignature(categorySkills),
                                    },
                                  });
                            }}
                            onChange={(event) => {
                              const rawValue = event.target.value;
                              const update = updateSkillTextDraft(rawValue, categorySkills);
                              setSkillTextDrafts((current) => ({
                                ...current,
                                [category.id]: update.draft,
                              }));
                              if (update.changed && technicalSkillsSection?.type === "technicalSkills" && canonicalCategory) {
                                dispatchDocument({
                                  type: "set-skill-category",
                                  sectionId: technicalSkillsSection.id,
                                  categoryId: category.id,
                                  category: {
                                    ...canonicalCategory,
                                    skills: update.skills,
                                  },
                                }, { text: true, key: `skills:${category.id}` });
                              }
                              queueAutosizeTextarea(event.currentTarget);
                            }}
                            onBlur={() => {
                              setSkillTextDrafts((current) => {
                                if (!current[category.id]) return current;
                                const next = { ...current };
                                delete next[category.id];
                                return next;
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
              </div>
                    </EditorStackSection>
                    </Fragment>
                  );

                case "projects":
                  return (
                    <Fragment key={section.id}>
                    <EditorStackSection
                      title="Projects"
                      summary={getSectionSummary(section)}
                      isOpen={resolvedOpenSectionId === section.id}
                      onToggle={() => toggleEditorSection(section.id)}
                      {...sectionProps}
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-start gap-2">
                          <button
                            className={BUTTON_SECONDARY_CLASSES}
                            type="button"
                            onClick={handleAddProject}
                          >
                            Add project
                          </button>
                        </div>

                        <div
                          className="space-y-3 rs-reorder-container"
                          data-reorder-container={`projects:${section.id}`}
                          data-reorder-kind="project"
                          data-reorder-section-id={section.id}
                        >
                          <ReorderInsertionIndicator target={reorderDropTarget} containerKey={`projects:${section.id}`} />
                          {section.content.entries.map((project, projectIndex) => {
                            const isExpanded = expandedProjectId === project.id;
                            const projectBodyId = `project-${project.id}-body`;
                            const projectBulletContainer: ReorderContainer = {
                              key: `project-bullets:${section.id}:${project.id}`,
                              kind: "project-bullet",
                              sectionId: section.id,
                              entryId: project.id,
                            };
                            const projectSummary = [
                              project.name.trim() || "Untitled project",
                              project.date?.trim(),
                            ]
                              .filter(Boolean)
                              .join(" · ");

                            return (
                              <Fragment key={project.id}>
                              <div
                                data-reorder-item="true"
                                className={`${ITEM_SURFACE_CLASSES}${pointerReorder?.active && pointerReorder.payload.kind === "project" && pointerReorder.payload.itemId === project.id ? " is-dragging" : ""}`}
                              >
                                <div className="rs-entry-header">
                                  <div className="rs-entry-structure">
                                    <ReorderHandle
                                      label={`Reorder Project ${projectIndex + 1}`}
                                      onPointerDown={(event) => handleReorderPointerDown({ kind: "project", sectionId: section.id, itemId: project.id }, event)}
                                      onPointerMove={handleReorderPointerMove}
                                      onPointerUp={handleReorderPointerUp}
                                      onPointerCancel={handleReorderPointerCancel}
                                      onLostPointerCapture={handleReorderPointerCancel}
                                    />
                                    <button
                                      className="rs-entry-disclosure-row"
                                      type="button"
                                      aria-expanded={isExpanded}
                                      aria-controls={projectBodyId}
                                      aria-label={`${isExpanded ? "Collapse" : "Expand"} Project ${projectIndex + 1}`}
                                      onClick={() => setExpandedProjectId((currentId) => currentId === project.id ? null : project.id)}
                                    >
                                      <span className="rs-entry-disclosure-mark"><EntryDisclosureMark isOpen={isExpanded} /></span>
                                      <span className="min-w-0 flex-1 text-left">
                                        <span className={ITEM_INDEX_CLASSES}>
                                          Project {projectIndex + 1}
                                        </span>
                                        <span className={ITEM_SUMMARY_CLASSES}>{projectSummary}</span>
                                      </span>
                                    </button>
                                  </div>
                                  <div className="rs-entry-actions">
                                    <RemoveButton label={`Remove Project ${projectIndex + 1}`} onClick={() => handleRemoveProject(project.id)} variant="entry" />
                                  </div>
                                </div>

                                {isExpanded ? (
                                  <div id={projectBodyId} className="mt-3 border-t border-[var(--rs-line-soft)] pt-3">
                                    <div className="rs-property-row">
                                      <div className="rs-property-label">Name</div>
                                      <div className="rs-property-value">
                                        <input
                                          className="rs-property-control"
                                          ref={(element) => {
                                            projectNameRefs.current[project.id] = element;
                                          }}
                                          value={project.name}
                                          onChange={(event) => updateProject(project.id, (currentProject) => ({ ...currentProject, name: event.target.value }), `project:${project.id}:name`)}
                                        />
                                      </div>
                                    </div>

                                    <div className="rs-property-row">
                                      <div className="rs-property-label">Date</div>
                                      <div className="rs-property-value">
                                        <input
                                          className="rs-property-control"
                                          value={project.date ?? ""}
                                          onChange={(event) => updateProject(project.id, (currentProject) => ({ ...currentProject, date: event.target.value }), `project:${project.id}:date`)}
                                        />
                                      </div>
                                    </div>

                                    <div className="rs-property-row">
                                      <div className="rs-property-label">Technologies</div>
                                      <div className="rs-property-value">
                                        <input
                                          className="rs-property-control"
                                          value={project.technologies ?? ""}
                                          onChange={(event) => updateProject(project.id, (currentProject) => ({ ...currentProject, technologies: event.target.value }), `project:${project.id}:technologies`)}
                                        />
                                      </div>
                                    </div>

                                    <div className="rs-property-row">
                                      <div className="rs-property-label">URL</div>
                                      <div className="rs-property-value">
                                        <input
                                          className="rs-property-control"
                                          value={project.url ?? ""}
                                          onChange={(event) => updateProject(project.id, (currentProject) => ({ ...currentProject, url: event.target.value }), `project:${project.id}:url`)}
                                        />
                                      </div>
                                    </div>

                                    <div className="rs-property-row">
                                      <div className="rs-property-label">Description</div>
                                      <div className="rs-property-value">
                                        <textarea
                                          className="rs-property-control rs-property-control--textarea"
                                          style={{ minHeight: "72px" }}
                                          {...autosizeTextareaProps({ minHeight: 72, maxHeight: 160 })}
                                          value={project.description ?? ""}
                                          onChange={(event) => {
                                            updateProject(project.id, (currentProject) => ({ ...currentProject, description: event.target.value }), `project:${project.id}:description`);
                                            queueAutosizeTextarea(event.currentTarget);
                                          }}
                                        />
                                      </div>
                                    </div>

                                    <div
                                      className="rs-bullet-composer"
                                      data-reorder-container={projectBulletContainer.key}
                                      data-reorder-kind={projectBulletContainer.kind}
                                      data-reorder-section-id={projectBulletContainer.sectionId}
                                      data-reorder-entry-id={projectBulletContainer.entryId}
                                    >
                                      <ReorderInsertionIndicator target={reorderDropTarget} containerKey={projectBulletContainer.key} />
                                      <div className="rs-bullet-composer-head">
                                        <p className={ITEM_INDEX_CLASSES}>Bullets</p>
                                        <button
                                          className={`${BUTTON_SECONDARY_CLASSES} rs-button--compact`}
                                          type="button"
                                          onClick={() => handleAddProjectBullet(project.id)}
                                        >
                                          Add bullet
                                        </button>
                                      </div>

                                      {project.bullets.map((bullet, bulletIndex) => (
                                        <Fragment key={bullet.id}>
                                <div
                                  data-reorder-item="true"
                                  className={`rs-bullet-piece${pointerReorder?.active && pointerReorder.payload.kind === "project-bullet" && pointerReorder.payload.itemId === bullet.id ? " is-dragging" : ""}`}
                                >
                                          <div className="rs-bullet-piece-row">
                                            <ReorderHandle
                                              label={`Reorder Project bullet ${bulletIndex + 1}`}
                                              onPointerDown={(event) => handleReorderPointerDown({ kind: "project-bullet", sectionId: section.id, entryId: project.id, itemId: bullet.id }, event)}
                                              onPointerMove={handleReorderPointerMove}
                                              onPointerUp={handleReorderPointerUp}
                                              onPointerCancel={handleReorderPointerCancel}
                                              onLostPointerCapture={handleReorderPointerCancel}
                                            />
                                            <textarea
                                              className="rs-bullet-textarea"
                                              {...autosizeTextareaProps({ minHeight: 72, maxHeight: 160 })}
                                              value={bullet.text}
                                              onChange={(event) => {
                                                updateProjectBullet(project.id, bullet.id, event.target.value);
                                                queueAutosizeTextarea(event.currentTarget);
                                              }}
                                            />
                                            <RemoveButton label={`Remove Project bullet ${bulletIndex + 1}`} onClick={() => handleRemoveProjectBullet(project.id, bullet.id)} />
                                          </div>
                                        </div>
                                        </Fragment>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                              </Fragment>
                            );
                          })}
                        </div>
                      </div>
                    </EditorStackSection>
                    </Fragment>
                  );

                case "certifications":
                  return (
                    <Fragment key={section.id}>
                    <EditorStackSection
                      title="Certifications"
                      summary={getSectionSummary(section)}
                      isOpen={resolvedOpenSectionId === section.id}
                      onToggle={() => toggleEditorSection(section.id)}
                      {...sectionProps}
                    >
                      <p className={UI_NOTE_CLASSES}>No certification editor available yet.</p>
                    </EditorStackSection>
                    </Fragment>
                  );

                case "custom":
                  return (
                    <Fragment key={section.id}>
                    <EditorStackSection
                      title={getSectionTitle(section)}
                      summary={getSectionSummary(section)}
                      isOpen={resolvedOpenSectionId === section.id}
                      onToggle={() => toggleEditorSection(section.id)}
                      {...sectionProps}
                    >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={UI_NOTE_CLASSES}>
                    Optional section content.
                  </p>
                </div>
                <div className="space-y-3">
                  <div
                    className={ITEM_SURFACE_CLASSES}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className={ITEM_INDEX_CLASSES}>Custom section</p>
                      <button
                        className={BUTTON_DANGER_CLASSES}
                        type="button"
                        onClick={() => dispatchDocument({ type: "delete-custom-section", sectionId: section.id })}
                      >
                        Remove
                      </button>
                    </div>

                    <label className="block text-sm">
                      <span className="mb-1 block text-xs font-medium text-slate-600">Section title</span>
                      <input
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                        value={section.content.title}
                        onChange={(event) =>
                          dispatchDocument({ type: "set-custom-section", sectionId: section.id, section: { ...section, content: { ...section.content, title: event.target.value } } }, { text: true, key: `custom:${section.id}:title` })
                        }
                      />
                    </label>

                    <label className="mt-2 block text-sm">
                      <span className="mb-1 block text-xs font-medium text-slate-600">
                        Section lines (one per line)
                      </span>
                      <textarea
                        className="h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                        {...autosizeTextareaProps({ minHeight: 96, maxHeight: 220 })}
                        value={section.content.lines.join("\n")}
                        onChange={(event) => {
                          dispatchDocument({ type: "set-custom-section", sectionId: section.id, section: { ...section, content: { ...section.content, lines: parseCustomSectionLines(event.target.value) } } }, { text: true, key: `custom:${section.id}:lines` });
                          queueAutosizeTextarea(event.currentTarget);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
                    </EditorStackSection>
                    </Fragment>
                  );
              }
            })}


            <div className="rs-editor-add-custom-section">
              <button
                className={BUTTON_SECONDARY_CLASSES}
                type="button"
                onClick={() =>
                  dispatchDocument({ type: "add-custom-section", section: { id: createId("section"), type: "custom", included: true, content: { title: "New Section", lines: [] } } })
                }
              >
                Add custom section
              </button>
            </div>
            </div>
          </div>

          {developmentBuildId ? (
            <p className="resume-editor-build-id" aria-label="Development build identifier">
              Build {developmentBuildId}
            </p>
          ) : null}
        </section>

        <section
          ref={previewShellRef}
          className="resume-preview-shell relative"
        >
          <div className="resume-preview-stage-head">
            <div className="resume-preview-stage-block">
              <p className="resume-preview-stage-count">{pageCountLabel}</p>
            </div>

            <p className="resume-preview-stage-state">{previewStateLabel}</p>
          </div>

          <div
            ref={previewStageScrollRef}
            className="resume-preview-stage-scroll"
          >
            <div
              className="resume-preview-scale-wrap"
              style={{
                width: `${scaledPreviewSurfaceWidth}px`,
                height: `${scaledPreviewSurfaceHeight}px`,
                minHeight: `${scaledPreviewPageHeight + previewSurfaceChromeHeight}px`,
              }}
            >
              <div
                className="resume-preview-page-surface"
                style={{ height: "100%" }}
              >
                <div className="resume-preview-scale-inner" style={previewScaleStyle}>
                  <SelectedTemplate document={renderDocument} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
