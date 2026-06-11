"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { getResumeTemplate, type ResumeTemplateId } from "@/templates/resume-templates";
import type {
  Resume,
  ResumeCustomSection,
  ResumeDateRange,
  ResumeSkillCategory,
} from "@/types/resume";

type ResumeEditorProps = {
  initialResume: Resume;
  templateId: ResumeTemplateId;
};

const RESUME_STORAGE_KEY = "resume-studio.current-resume";
const RESUME_STORAGE_VERSION = 3;
const RESUME_SEED_VERSION = "2026-05-11-structured-editor-v1";

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
const BUTTON_PRIMARY_CLASSES = `${BUTTON_BASE_CLASSES} rs-button--primary`;
const BUTTON_DANGER_CLASSES = `${BUTTON_BASE_CLASSES} rs-button--danger`;
const UI_NOTE_CLASSES = "rs-ui-note";
const ITEM_SURFACE_CLASSES = "rs-section-item";
const ITEM_INDEX_CLASSES = "rs-item-index";
const ITEM_SUMMARY_CLASSES = "rs-item-summary";
const LETTER_PAGE_ASPECT_RATIO = 11 / 8.5;
const PAGE_LIMIT_WARNING_RATIO = 0.93;
const PAGE_OVERFLOW_TOLERANCE_PX = 12;
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

type LegacyResumeSkillGroup = {
  category: string;
  items: string[];
};

type EditorTextareaAutosizeConfig = {
  minHeight: number;
  maxHeight: number;
};

type ResumeStoragePayload = {
  version: number;
  seedVersion: string;
  baseResumeHash: string;
  dirty: boolean;
  resume: Resume;
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
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

function parseTextareaItems(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function isLegacySkillGroupArray(value: unknown): value is LegacyResumeSkillGroup[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        !!item &&
        typeof item === "object" &&
        typeof item.category === "string" &&
        isStringArray(item.items),
    )
  );
}

function normalizeMonth(value: string) {
  const normalized = value.trim().toLowerCase();
  const monthMap: Record<string, string> = {
    jan: "Jan",
    january: "Jan",
    feb: "Feb",
    february: "Feb",
    mar: "Mar",
    march: "Mar",
    apr: "Apr",
    april: "Apr",
    may: "May",
    jun: "Jun",
    june: "Jun",
    jul: "Jul",
    july: "Jul",
    aug: "Aug",
    august: "Aug",
    sep: "Sept",
    sept: "Sept",
    september: "Sept",
    oct: "Oct",
    october: "Oct",
    nov: "Nov",
    november: "Nov",
    dec: "Dec",
    december: "Dec",
  };

  return monthMap[normalized] ?? value;
}

function parseDateRangeFromString(dates: string): ResumeDateRange | null {
  const normalizedDates = dates.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
  const match = normalizedDates.match(
    /^([A-Za-z]+)\s+(\d{4})\s*[—-]\s*(Present|([A-Za-z]+)\s+(\d{4}))$/i,
  );

  if (!match) {
    return null;
  }

  const startMonth = normalizeMonth(match[1]);
  const startYear = match[2];

  if (/^present$/i.test(match[3])) {
    return {
      startMonth,
      startYear,
      current: true,
    };
  }

  return {
    startMonth,
    startYear,
    endMonth: normalizeMonth(match[4]),
    endYear: match[5],
    current: false,
  };
}

function normalizeDateRange(value: unknown): ResumeDateRange | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ResumeDateRange>;

  if (typeof candidate.startMonth !== "string" || typeof candidate.startYear !== "string") {
    return null;
  }

  const current = Boolean(candidate.current);
  const normalized: ResumeDateRange = {
    startMonth: normalizeMonth(candidate.startMonth),
    startYear: candidate.startYear,
    current,
  };

  if (!current && typeof candidate.endMonth === "string" && typeof candidate.endYear === "string") {
    normalized.endMonth = normalizeMonth(candidate.endMonth);
    normalized.endYear = candidate.endYear;
  }

  return normalized;
}

function normalizeSkillCategories(value: unknown): ResumeSkillCategory[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const categories: ResumeSkillCategory[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Partial<ResumeSkillCategory>;

    if (typeof candidate.label !== "string" || typeof candidate.value !== "string") {
      continue;
    }

    categories.push({
      id: typeof candidate.id === "string" ? candidate.id : createId("skill"),
      label: candidate.label,
      value: candidate.value,
    });
  }

  return categories.length > 0 ? categories : null;
}

function linesToSkillCategories(lines: string[]) {
  return lines.map((line) => {
    const colonIndex = line.indexOf(":");

    if (colonIndex === -1) {
      return {
        id: createId("skill"),
        label: line,
        value: "",
      };
    }

    return {
      id: createId("skill"),
      label: line.slice(0, colonIndex).trim(),
      value: line.slice(colonIndex + 1).trim(),
    };
  });
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

function normalizeResumeBullets(resume: Resume): Resume {
  return {
    ...resume,
    experience: resume.experience.map((item) => ({
      ...item,
      bullets: removeEmptyBullets(item.bullets),
    })),
    projects: resume.projects.map((project) => ({
      ...project,
      bullets: removeEmptyBullets(project.bullets),
    })),
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

type EditorSectionId =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "customSections";

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

function formatExperienceGuidanceLine(bulletCount: number, isDense: boolean) {
  const bulletLabel = `${bulletCount} ${bulletCount === 1 ? "bullet" : "bullets"}`;

  return isDense ? `${bulletLabel} · dense role` : bulletLabel;
}

function EditorStackSection({
  title,
  summary,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rs-editor-section">
      <button
        className="rs-editor-section-toggle"
        type="button"
        onClick={onToggle}
      >
        <span className="rs-editor-section-disclosure">
          {isOpen ? "−" : "+"}
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

      {isOpen ? <div className="rs-editor-section-body">{children}</div> : null}
    </section>
  );
}

function normalizeCustomSections(value: unknown): ResumeCustomSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Partial<ResumeCustomSection>;
      if (typeof candidate.title !== "string" || !isStringArray(candidate.lines)) {
        return null;
      }

      return {
        id: typeof candidate.id === "string" ? candidate.id : createId("section"),
        title: candidate.title,
        lines: candidate.lines,
      };
    })
    .filter((item): item is ResumeCustomSection => !!item);
}

function normalizeStoredResume(
  value: unknown,
  fallbackTechnicalSkills: Resume["technicalSkills"],
): Resume | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Resume> & {
    skills?: unknown;
    skillsSection?: unknown;
    technicalSkills?: unknown;
    customSections?: unknown;
    experience?: unknown;
    education?: unknown;
    projects?: unknown;
  };

  if (
    typeof candidate.title !== "string" ||
    typeof candidate.summary !== "string" ||
    typeof candidate.header?.name !== "string" ||
    typeof candidate.header?.email !== "string" ||
    typeof candidate.header?.phone !== "string" ||
    typeof candidate.header?.location !== "string" ||
    !Array.isArray(candidate.experience) ||
    !Array.isArray(candidate.education)
  ) {
    return null;
  }

  const experience = candidate.experience
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const experienceItem = item as {
        company?: unknown;
        title?: unknown;
        location?: unknown;
        dateRange?: unknown;
        dates?: unknown;
        bullets?: unknown;
      };

      if (
        typeof experienceItem.company !== "string" ||
        typeof experienceItem.title !== "string" ||
        typeof experienceItem.location !== "string" ||
        !isStringArray(experienceItem.bullets)
      ) {
        return null;
      }

      const structuredDateRange = normalizeDateRange(experienceItem.dateRange);
      const parsedLegacyDateRange =
        typeof experienceItem.dates === "string"
          ? parseDateRangeFromString(experienceItem.dates)
          : null;

      const dateRange = structuredDateRange ?? parsedLegacyDateRange;
      if (!dateRange) {
        return null;
      }

      return {
        company: experienceItem.company,
        title: experienceItem.title,
        location: experienceItem.location,
        dateRange,
        bullets: removeEmptyBullets(experienceItem.bullets),
      };
    })
    .filter(isDefined);

  const education = candidate.education
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const educationItem = item as {
        school?: unknown;
        degree?: unknown;
        location?: unknown;
        dateRange?: unknown;
        dates?: unknown;
        coursework?: unknown;
      };

      if (typeof educationItem.school !== "string" || typeof educationItem.degree !== "string") {
        return null;
      }

      const structuredDateRange = normalizeDateRange(educationItem.dateRange);
      const parsedLegacyDateRange =
        typeof educationItem.dates === "string"
          ? parseDateRangeFromString(educationItem.dates)
          : null;
      const dateRange = structuredDateRange ?? parsedLegacyDateRange;
      if (!dateRange) {
        return null;
      }

      return {
        school: educationItem.school,
        degree: educationItem.degree,
        location: typeof educationItem.location === "string" ? educationItem.location : "",
        dateRange,
        coursework: isStringArray(educationItem.coursework) ? educationItem.coursework : [],
      };
    })
    .filter(isDefined);

  if (experience.length === 0 || education.length === 0) {
    return null;
  }

  let technicalSkills = fallbackTechnicalSkills;
  const rawTechnicalSkills = candidate.technicalSkills as
    | { title?: unknown; categories?: unknown }
    | undefined;

  if (
    rawTechnicalSkills &&
    typeof rawTechnicalSkills.title === "string" &&
    rawTechnicalSkills.categories
  ) {
    const categories = normalizeSkillCategories(rawTechnicalSkills.categories);
    if (categories) {
      technicalSkills = {
        title: rawTechnicalSkills.title,
        categories,
      };
    }
  } else {
    const rawSkillsSection = candidate.skillsSection as
      | { title?: unknown; lines?: unknown }
      | undefined;

    if (
      rawSkillsSection &&
      typeof rawSkillsSection.title === "string" &&
      isStringArray(rawSkillsSection.lines)
    ) {
      technicalSkills = {
        title: rawSkillsSection.title,
        categories: linesToSkillCategories(rawSkillsSection.lines),
      };
    } else if (isLegacySkillGroupArray(candidate.skills)) {
      technicalSkills = {
        title: "Technical Skills",
        categories: candidate.skills.map((group) => ({
          id: createId("skill"),
          label: group.category,
          value: group.items.join(", "),
        })),
      };
    }
  }

  const projects = Array.isArray(candidate.projects)
    ? candidate.projects.filter(
        (project): project is Resume["projects"][number] =>
          !!project &&
          typeof project === "object" &&
          typeof (project as Resume["projects"][number]).name === "string" &&
          typeof (project as Resume["projects"][number]).description === "string" &&
          isStringArray((project as Resume["projects"][number]).bullets),
      ).map((project) => ({
        ...project,
        bullets: removeEmptyBullets(project.bullets),
      }))
    : [];

  return {
    title: candidate.title,
    header: {
      name: candidate.header.name,
      email: candidate.header.email,
      phone: candidate.header.phone,
      location: candidate.header.location,
      links: Array.isArray(candidate.header.links)
        ? candidate.header.links.filter((link): link is string => typeof link === "string")
        : [],
    },
    summary: candidate.summary,
    technicalSkills,
    experience,
    education,
    projects,
    customSections: normalizeCustomSections(candidate.customSections),
  };
}

function isResumeStoragePayload(value: unknown): value is ResumeStoragePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ResumeStoragePayload>;
  return (
    typeof candidate.version === "number" &&
    typeof candidate.seedVersion === "string" &&
    typeof candidate.baseResumeHash === "string" &&
    typeof candidate.dirty === "boolean" &&
    !!candidate.resume
  );
}

export function ResumeEditor({ initialResume, templateId }: ResumeEditorProps) {
  const [resume, setResume] = useState<Resume>(initialResume);
  const [openEditorSection, setOpenEditorSection] = useState<EditorSectionId | null>("experience");
  const [expandedExperienceIndex, setExpandedExperienceIndex] = useState<number | null>(0);
  const [expandedEducationIndex, setExpandedEducationIndex] = useState<number | null>(0);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportPdfError, setExportPdfError] = useState<string | null>(null);
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
  const previewShellRef = useRef<HTMLElement | null>(null);
  const previewStageScrollRef = useRef<HTMLDivElement | null>(null);
  const previewScaleRef = useRef(1);
  const previewScrollRestoreRef = useRef<number | null>(null);
  const hasRestoredFromStorage = useRef(false);
  const fallbackTechnicalSkills = useRef(initialResume.technicalSkills);
  const initialResumeHash = useMemo(
    () => JSON.stringify(initialResume),
    [initialResume],
  );

  const selectedTemplate = useMemo(() => getResumeTemplate(templateId), [templateId]);
  const renderResume = useMemo(() => normalizeResumeBullets(resume), [resume]);
  const syncAutosizeTextarea = useCallback((textarea: HTMLTextAreaElement) => {
    const minHeight = Number(textarea.dataset.autosizeMin ?? 0);
    const maxHeight = Number(textarea.dataset.autosizeMax ?? 0);

    textarea.style.height = "auto";

    const nextHeight = Math.max(minHeight, textarea.scrollHeight);
    const clampedHeight = maxHeight > 0 ? Math.min(nextHeight, maxHeight) : nextHeight;

    textarea.style.height = `${clampedHeight}px`;
    textarea.style.overflowY =
      maxHeight > 0 && textarea.scrollHeight > maxHeight ? "auto" : "hidden";
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
      requestAnimationFrame(() => {
        syncAutosizeTextarea(textarea);
      });
    },
    [syncAutosizeTextarea],
  );

  useLayoutEffect(() => {
    const editorPanel = editorPanelRef.current;

    if (!editorPanel) {
      return;
    }

    editorPanel
      .querySelectorAll<HTMLTextAreaElement>("textarea[data-autosize='true']")
      .forEach((textarea) => {
        syncAutosizeTextarea(textarea);
      });
  }, [
    expandedEducationIndex,
    expandedExperienceIndex,
    openEditorSection,
    renderResume,
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
    const measuredElement = `${resumeArticle.tagName.toLowerCase()}.${Array.from(resumeArticle.classList).join(".")}`;
    const naturalWidth = articleRect.width / currentScale;
    const firstPageHeight = naturalWidth * LETTER_PAGE_ASPECT_RATIO;
    if (firstPageHeight <= 0) {
      return;
    }

    const legacyWidth = resumeArticle.offsetWidth;
    const legacyContentHeight = Math.max(resumeArticle.scrollHeight, resumeArticle.offsetHeight);
    const legacyFirstPageHeight = legacyWidth * LETTER_PAGE_ASPECT_RATIO;
    const unscaledContentHeight = articleRect.height / currentScale;
    const contentHeight = unscaledContentHeight;
    const measuredOverflowHeight = contentHeight - firstPageHeight;
    const isOverflowing = measuredOverflowHeight > PAGE_OVERFLOW_TOLERANCE_PX;
    const overflowHeight = isOverflowing ? measuredOverflowHeight : 0;
    const hasSecondPage = isOverflowing;
    const pageCount = isOverflowing
      ? Math.max(2, Math.ceil(contentHeight / firstPageHeight))
      : 1;
    const isNearLimit =
      !isOverflowing && contentHeight / firstPageHeight >= PAGE_LIMIT_WARNING_RATIO;
    const legacyOverflowAmount = legacyContentHeight - legacyFirstPageHeight;
    const legacyPageCount = legacyOverflowAmount > PAGE_OVERFLOW_TOLERANCE_PX
      ? Math.max(2, Math.ceil(legacyContentHeight / legacyFirstPageHeight))
      : 1;

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

    if (process.env.NODE_ENV !== "production") {
      const nextDebugState = {
        currentScale,
        measuredElement,
        rawMeasuredWidth: articleRect.width,
        rawMeasuredHeight: articleRect.height,
        legacyWidth,
        legacyHeight: legacyContentHeight,
        unscaledContentHeight,
        calculatedFirstPageHeight: firstPageHeight,
        overflowAmount: measuredOverflowHeight,
        computedPageCount: pageCount,
        legacyOverflowAmount,
        legacyPageCount,
      };

      console.info("[resume-preview-measurement]", nextDebugState);
    }
  }, []);

  const [previewScale, setPreviewScale] = useState(1);
  const [previewSurfaceChromeWidth, setPreviewSurfaceChromeWidth] = useState(0);

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

    if (availableWidth <= 0 || naturalPageWidth <= 0) {
      return;
    }

    const fitWidth = availableWidth - surfaceChromeWidth - PREVIEW_SCALE_FIT_BUFFER_PX;
    const fitScale = fitWidth / naturalPageWidth;
    const nextScale = Math.min(1, Math.max(PREVIEW_SCALE_MIN, fitScale));

    setPreviewSurfaceChromeWidth((currentValue) =>
      Math.abs(currentValue - surfaceChromeWidth) > 0.5 ? surfaceChromeWidth : currentValue,
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
  }, [measurePreviewPages, renderResume]);

  useEffect(() => {
    measurePreviewPages();
  }, [measurePreviewPages, previewScale]);

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
  }, [measurePreviewScale, renderResume]);

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
        const savedResume = window.localStorage.getItem(RESUME_STORAGE_KEY);
        if (!savedResume) {
          return;
        }

        const parsedResume: unknown = JSON.parse(savedResume);

        if (!isResumeStoragePayload(parsedResume)) {
          window.localStorage.removeItem(RESUME_STORAGE_KEY);
          return;
        }

        if (
          parsedResume.version !== RESUME_STORAGE_VERSION ||
          parsedResume.seedVersion !== RESUME_SEED_VERSION
        ) {
          window.localStorage.removeItem(RESUME_STORAGE_KEY);
          return;
        }

        const normalizedResume = normalizeStoredResume(
          parsedResume.resume,
          fallbackTechnicalSkills.current,
        );
        if (!normalizedResume) {
          window.localStorage.removeItem(RESUME_STORAGE_KEY);
          return;
        }

        if (parsedResume.baseResumeHash !== initialResumeHash) {
          window.localStorage.removeItem(RESUME_STORAGE_KEY);
          return;
        }

        setResume(normalizedResume);
      } catch {
        window.localStorage.removeItem(RESUME_STORAGE_KEY);
      } finally {
        hasRestoredFromStorage.current = true;
      }
    }, 0);

    return () => window.clearTimeout(restoreId);
  }, [initialResumeHash]);

  useEffect(() => {
    if (!hasRestoredFromStorage.current) {
      return;
    }

    const normalizedResume = normalizeResumeBullets(resume);
    const serializedResume = JSON.stringify(normalizedResume);
    const payload: ResumeStoragePayload = {
      version: RESUME_STORAGE_VERSION,
      seedVersion: RESUME_SEED_VERSION,
      baseResumeHash: initialResumeHash,
      dirty: serializedResume !== initialResumeHash,
      resume: normalizedResume,
    };

    window.localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(payload));
  }, [resume, initialResumeHash]);

  if (!selectedTemplate) {
    return null;
  }

  const SelectedTemplate = selectedTemplate.component;
  const previewPageWidth = pageAwareness.firstPageHeight
    ? pageAwareness.firstPageHeight / LETTER_PAGE_ASPECT_RATIO
    : 816;
  const previewPageHeight =
    pageAwareness.firstPageHeight || previewPageWidth * LETTER_PAGE_ASPECT_RATIO;
  const scaledPreviewPageWidth = previewPageWidth * previewScale;
  const scaledPreviewSurfaceWidth = scaledPreviewPageWidth + previewSurfaceChromeWidth;
  const scaledPreviewPageHeight =
    previewPageHeight * previewScale;
  const previewScaleStyle = {
    width: `${previewPageWidth}px`,
    minHeight: `${previewPageHeight}px`,
    transform: `scale(${previewScale})`,
    transformOrigin: "top left",
  } as CSSProperties;

  const handleExportPDF = async () => {
    setExportPdfError(null);
    setIsExportingPdf(true);

    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume: renderResume,
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

  const handleReset = () => {
    window.localStorage.removeItem(RESUME_STORAGE_KEY);
    setResume(initialResume);
    setOpenEditorSection("experience");
    setExpandedExperienceIndex(0);
    setExpandedEducationIndex(0);
  };

  const updateExperience = (
    experienceIndex: number,
    updater: (item: Resume["experience"][number]) => Resume["experience"][number],
  ) => {
    setResume((current) => ({
      ...current,
      experience: current.experience.map((item, index) =>
        index === experienceIndex ? updater(item) : item,
      ),
    }));
  };

  const updateEducation = (
    educationIndex: number,
    updater: (item: Resume["education"][number]) => Resume["education"][number],
  ) => {
    setResume((current) => ({
      ...current,
      education: current.education.map((item, index) =>
        index === educationIndex ? updater(item) : item,
      ),
    }));
  };

  const updateTechnicalSkillCategory = (
    categoryIndex: number,
    updater: (category: ResumeSkillCategory) => ResumeSkillCategory,
  ) => {
    setResume((current) => ({
      ...current,
      technicalSkills: {
        ...current.technicalSkills,
        categories: current.technicalSkills.categories.map((category, index) =>
          index === categoryIndex ? updater(category) : category,
        ),
      },
    }));
  };

  const updateCustomSection = (
    sectionIndex: number,
    updater: (section: ResumeCustomSection) => ResumeCustomSection,
  ) => {
    setResume((current) => ({
      ...current,
      customSections: current.customSections.map((section, index) =>
        index === sectionIndex ? updater(section) : section,
      ),
    }));
  };

  const handleAddExperience = () => {
    setResume((current) => ({
      ...current,
      experience: [...current.experience, createEmptyExperience()],
    }));
    setExpandedExperienceIndex(resume.experience.length);
  };

  const handleRemoveExperience = (experienceIndex: number) => {
    setResume((current) => ({
      ...current,
      experience: current.experience.filter((_, index) => index !== experienceIndex),
    }));
    setExpandedExperienceIndex((currentExpandedIndex) => {
      if (currentExpandedIndex === null) {
        return null;
      }

      if (currentExpandedIndex === experienceIndex) {
        const nextLength = resume.experience.length - 1;
        return nextLength > 0 ? Math.max(0, experienceIndex - 1) : null;
      }

      return currentExpandedIndex > experienceIndex
        ? currentExpandedIndex - 1
        : currentExpandedIndex;
    });
  };

  const handleAddEducation = () => {
    setResume((current) => ({
      ...current,
      education: [...current.education, createEmptyEducation()],
    }));
    setExpandedEducationIndex(resume.education.length);
  };

  const handleRemoveEducation = (educationIndex: number) => {
    setResume((current) => ({
      ...current,
      education: current.education.filter((_, index) => index !== educationIndex),
    }));
    setExpandedEducationIndex((currentExpandedIndex) => {
      if (currentExpandedIndex === null) {
        return null;
      }

      if (currentExpandedIndex === educationIndex) {
        const nextLength = resume.education.length - 1;
        return nextLength > 0 ? Math.max(0, educationIndex - 1) : null;
      }

      return currentExpandedIndex > educationIndex
        ? currentExpandedIndex - 1
        : currentExpandedIndex;
    });
  };

  const rawPageFillPercent = pageAwareness.firstPageHeight
    ? Math.round((pageAwareness.contentHeight / pageAwareness.firstPageHeight) * 100)
    : 0;
  const pageFillPercent = Math.min(100, rawPageFillPercent);
  const documentTitle = resume.title.trim() || resume.header.name.trim() || "Untitled resume";
  const templateLabel = selectedTemplate?.name ?? "Template";
  const pageCountLabel = `${pageAwareness.pageCount} ${
    pageAwareness.pageCount === 1 ? "page" : "pages"
  }`;
  const previewStateLabel = pageAwareness.isOverflowing
    ? "Saved locally · page 2 active"
    : pageAwareness.isNearLimit
      ? `Saved locally · ${pageFillPercent}% used`
      : "Saved locally";
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
  const customSectionsSummary = truncateEditorSectionSummary(
    resume.customSections.length > 0
      ? `${resume.customSections.length} ${
          resume.customSections.length === 1 ? "section" : "sections"
        } · ${resume.customSections
          .slice(0, 2)
          .map((section) => section.title.trim() || "Untitled")
          .join(" · ")}`
      : "No custom sections",
  );
  const toggleEditorSection = (sectionId: EditorSectionId) => {
    setOpenEditorSection((currentSection) =>
      currentSection === sectionId ? null : sectionId,
    );
  };

  return (
    <main className="resume-app-shell">
      <header className="resume-shell-toolbar" aria-label="Workspace toolbar">
        <div className="resume-shell-toolbar-rail">
          <div className="resume-shell-toolbar-brand">
            <p className="resume-shell-toolbar-kicker">Resume Studio</p>
          </div>

          <div className="resume-shell-toolbar-actions">
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
                  className="resume-editor-head-action resume-editor-head-action--control is-disabled"
                  type="button"
                  disabled
                >
                  Undo
                </button>
                <button
                  className="resume-editor-head-action resume-editor-head-action--control is-disabled"
                  type="button"
                  disabled
                >
                  Redo
                </button>
              </div>

              <button
                className="resume-editor-head-action resume-editor-head-action--subtle resume-editor-head-action--utility"
                type="button"
                onClick={handleReset}
              >
                Reset sample
              </button>
            </div>
          </div>

          <div className="resume-editor-panel-scroll">
            <div className="resume-editor-stack divide-y divide-slate-200">
              <EditorStackSection
              title="Header"
              summary={headerSectionSummary}
              isOpen={openEditorSection === "header"}
              onToggle={() => toggleEditorSection("header")}
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
                          setResume((current) => ({
                            ...current,
                            header: { ...current.header, name: event.target.value },
                          }))
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
                          setResume((current) => ({
                            ...current,
                            header: { ...current.header, email: event.target.value },
                          }))
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
                          setResume((current) => ({
                            ...current,
                            header: { ...current.header, phone: event.target.value },
                          }))
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
                          setResume((current) => ({
                            ...current,
                            header: { ...current.header, location: event.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </EditorStackSection>

            <EditorStackSection
              title="Summary"
              summary={summarySectionSummary}
              isOpen={openEditorSection === "summary"}
              onToggle={() => toggleEditorSection("summary")}
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
                        setResume((current) => ({ ...current, summary: event.target.value }));
                        queueAutosizeTextarea(event.currentTarget);
                      }}
                    />
                  </label>
                </div>
              </div>
            </EditorStackSection>

            <EditorStackSection
              title="Experience"
              summary={experienceSectionSummary}
              isOpen={openEditorSection === "experience"}
              onToggle={() => toggleEditorSection("experience")}
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={UI_NOTE_CLASSES}>
                    Expand a role to edit details.
                  </p>
                  <button
                    className={BUTTON_PRIMARY_CLASSES}
                    type="button"
                    onClick={handleAddExperience}
                  >
                    Add experience
                  </button>
                </div>
                <div className="space-y-3">
                {resume.experience.map((job, jobIndex) => {
                  const isExpanded = expandedExperienceIndex === jobIndex;
                  const bulletGuidance = analyzeExperienceBullets(job.bullets);
                  const experienceGuidanceLine = formatExperienceGuidanceLine(
                    bulletGuidance.bulletCount,
                    bulletGuidance.density.status !== "balanced",
                  );
                  return (
                    <div
                      key={jobIndex}
                      className={ITEM_SURFACE_CLASSES}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <button
                          className="min-w-0 flex-1 text-left"
                          type="button"
                          onClick={() =>
                            setExpandedExperienceIndex((currentIndex) =>
                              currentIndex === jobIndex ? null : jobIndex,
                            )
                          }
                        >
                          <p className={ITEM_INDEX_CLASSES}>
                            Experience {jobIndex + 1}
                          </p>
                          <p className={ITEM_SUMMARY_CLASSES}>
                            {formatExperienceCardSummary(job)}
                          </p>
                          <p className="rs-experience-guidance-line mt-2">
                            {experienceGuidanceLine}
                          </p>
                        </button>
                        <div className="rs-experience-role-actions">
                          <button
                            className={`${BUTTON_SECONDARY_CLASSES} rs-experience-role-action`}
                            type="button"
                            onClick={() =>
                              setExpandedExperienceIndex((currentIndex) =>
                                currentIndex === jobIndex ? null : jobIndex,
                              )
                            }
                          >
                            {isExpanded ? "Collapse" : "Edit"}
                          </button>
                          <button
                            className={`${BUTTON_DANGER_CLASSES} rs-experience-role-action`}
                            type="button"
                            onClick={() => handleRemoveExperience(jobIndex)}
                            disabled={resume.experience.length <= 1}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="mt-3 border-t border-slate-200 pt-3">
                          <div className="rs-experience-metadata">
                            <div className="rs-property-row">
                              <div className="rs-property-label">Title</div>
                              <div className="rs-property-value">
                                <input
                                  className="rs-property-control"
                                  value={job.title}
                                  onChange={(event) =>
                                    updateExperience(jobIndex, (currentJob) => ({
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
                                    updateExperience(jobIndex, (currentJob) => ({
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
                                        updateExperience(jobIndex, (currentJob) => ({
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
                                        updateExperience(jobIndex, (currentJob) => ({
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
                                      updateExperience(jobIndex, (currentJob) => ({
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
                                          updateExperience(jobIndex, (currentJob) => ({
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
                                          updateExperience(jobIndex, (currentJob) => ({
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
                                    updateExperience(jobIndex, (currentJob) => ({
                                      ...currentJob,
                                      location: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          <div className="rs-bullet-composer">
                            <div className="rs-bullet-composer-head">
                              <p className={ITEM_INDEX_CLASSES}>
                                Bullets
                              </p>
                              <button
                                className="rs-bullet-add-action"
                                type="button"
                                onClick={() =>
                                  updateExperience(jobIndex, (currentJob) => ({
                                    ...currentJob,
                                    bullets: [...currentJob.bullets, ""],
                                  }))
                                }
                              >
                                Add bullet
                              </button>
                            </div>
                            {job.bullets.map((bullet, bulletIndex) => {
                              return (
                                <div
                                  key={bulletIndex}
                                  className="rs-bullet-piece"
                                >
                                  <div className="rs-bullet-piece-head">
                                    <span className="rs-bullet-piece-label">
                                      Bullet {bulletIndex + 1}
                                    </span>
                                    <button
                                      className="rs-bullet-remove-action"
                                      type="button"
                                      onClick={() =>
                                        updateExperience(jobIndex, (currentJob) => ({
                                          ...currentJob,
                                          bullets: currentJob.bullets.filter(
                                            (_, currentBulletIndex) => currentBulletIndex !== bulletIndex,
                                          ),
                                        }))
                                      }
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  <textarea
                                    className="rs-bullet-textarea"
                                    {...autosizeTextareaProps({ minHeight: 72, maxHeight: 160 })}
                                    value={bullet}
                                    onChange={(event) => {
                                      updateExperience(jobIndex, (currentJob) => ({
                                        ...currentJob,
                                        bullets: currentJob.bullets.map((currentBullet, currentBulletIndex) =>
                                          currentBulletIndex === bulletIndex
                                            ? event.target.value
                                            : currentBullet,
                                        ),
                                      }));
                                      queueAutosizeTextarea(event.currentTarget);
                                    }}
                                  />
                                </div>
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

            <EditorStackSection
              title="Education"
              summary={educationSectionSummary}
              isOpen={openEditorSection === "education"}
              onToggle={() => toggleEditorSection("education")}
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={UI_NOTE_CLASSES}>
                    Expand an entry to edit school details and structured dates.
                  </p>
                  <button
                    className={BUTTON_PRIMARY_CLASSES}
                    type="button"
                    onClick={handleAddEducation}
                  >
                    Add education
                  </button>
                </div>
                <div className="space-y-3">
                {resume.education.map((item, itemIndex) => {
                  const isExpanded = expandedEducationIndex === itemIndex;
                  return (
                    <div
                      key={itemIndex}
                      className={ITEM_SURFACE_CLASSES}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <button
                          className="min-w-0 flex-1 text-left"
                          type="button"
                          onClick={() =>
                            setExpandedEducationIndex((currentIndex) =>
                              currentIndex === itemIndex ? null : itemIndex,
                            )
                          }
                        >
                          <p className={ITEM_INDEX_CLASSES}>
                            Education {itemIndex + 1}
                          </p>
                          <p className={ITEM_SUMMARY_CLASSES}>
                            {formatEducationCardSummary(item)}
                          </p>
                        </button>
                        <div className="rs-experience-role-actions">
                          <button
                            className={`${BUTTON_SECONDARY_CLASSES} rs-experience-role-action`}
                            type="button"
                            onClick={() =>
                              setExpandedEducationIndex((currentIndex) =>
                                currentIndex === itemIndex ? null : itemIndex,
                              )
                            }
                          >
                            {isExpanded ? "Collapse" : "Edit"}
                          </button>
                          <button
                            className={`${BUTTON_DANGER_CLASSES} rs-experience-role-action`}
                            type="button"
                            onClick={() => handleRemoveEducation(itemIndex)}
                            disabled={resume.education.length <= 1}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="mt-3 border-t border-slate-200 pt-3">
                          <div className="rs-education-metadata">
                            <div className="rs-property-row">
                              <div className="rs-property-label">School</div>
                              <div className="rs-property-value">
                                <input
                                  className="rs-property-control"
                                  value={item.school}
                                  onChange={(event) =>
                                    updateEducation(itemIndex, (currentItem) => ({
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
                                    updateEducation(itemIndex, (currentItem) => ({
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
                                        updateEducation(itemIndex, (currentItem) => ({
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
                                        updateEducation(itemIndex, (currentItem) => ({
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
                                      updateEducation(itemIndex, (currentItem) => ({
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
                                          updateEducation(itemIndex, (currentItem) => ({
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
                                          updateEducation(itemIndex, (currentItem) => ({
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
                                    updateEducation(itemIndex, (currentItem) => ({
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
                                      updateEducation(itemIndex, (currentItem) => ({
                                        ...currentItem,
                                        coursework: parseTextareaItems(event.target.value),
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

            <EditorStackSection
              title="Skills"
              summary={skillsSectionSummary}
              isOpen={openEditorSection === "skills"}
              onToggle={() => toggleEditorSection("skills")}
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={UI_NOTE_CLASSES}>
                    Labels become bold prefixes. Skills appear after them in the resume.
                  </p>
                  <button
                    className={BUTTON_PRIMARY_CLASSES}
                    type="button"
                    onClick={() =>
                      setResume((current) => ({
                        ...current,
                        technicalSkills: {
                          ...current.technicalSkills,
                          categories: [
                            ...current.technicalSkills.categories,
                            {
                              id: createId("skill"),
                              label: "New Category",
                              value: "",
                            },
                          ],
                        },
                      }))
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
                        value={resume.technicalSkills.title}
                        onChange={(event) =>
                          setResume((current) => ({
                            ...current,
                            technicalSkills: {
                              ...current.technicalSkills,
                              title: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                {resume.technicalSkills.categories.map((category, categoryIndex) => (
                  <div
                    key={category.id}
                    className="rs-skill-group"
                  >
                    <div className="rs-skill-group-head">
                      <p className="rs-skill-group-index">
                        Category {categoryIndex + 1}
                      </p>
                      <button
                        className="rs-skill-group-remove"
                        type="button"
                        onClick={() =>
                          setResume((current) => ({
                            ...current,
                            technicalSkills: {
                              ...current.technicalSkills,
                              categories: current.technicalSkills.categories.filter(
                                (_, index) => index !== categoryIndex,
                              ),
                            },
                          }))
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
                              updateTechnicalSkillCategory(categoryIndex, (currentCategory) => ({
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
                              category.value.length > 90 || category.value.includes("\n")
                                ? " is-expanded"
                                : ""
                            }`}
                            {...autosizeTextareaProps({ minHeight: 64, maxHeight: 140 })}
                            value={category.value}
                            onChange={(event) => {
                              updateTechnicalSkillCategory(categoryIndex, (currentCategory) => ({
                                ...currentCategory,
                                value: event.target.value,
                              }));
                              queueAutosizeTextarea(event.currentTarget);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </EditorStackSection>

            <EditorStackSection
              title="Custom Sections"
              summary={customSectionsSummary}
              isOpen={openEditorSection === "customSections"}
              onToggle={() => toggleEditorSection("customSections")}
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={UI_NOTE_CLASSES}>
                    Optional sections for Projects, Certifications, Awards, Languages, or Volunteer work.
                  </p>
                  <button
                    className={BUTTON_SECONDARY_CLASSES}
                    type="button"
                    onClick={() =>
                      setResume((current) => ({
                        ...current,
                        customSections: [
                          ...current.customSections,
                          {
                            id: createId("section"),
                            title: "New Section",
                            lines: [],
                          },
                        ],
                      }))
                    }
                  >
                    Add custom section
                  </button>
                </div>
                <div className="space-y-3">
                {resume.customSections.map((section, sectionIndex) => (
                  <div
                    key={section.id}
                    className={ITEM_SURFACE_CLASSES}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className={ITEM_INDEX_CLASSES}>
                        Section {sectionIndex + 1}
                      </p>
                      <button
                        className={BUTTON_DANGER_CLASSES}
                        type="button"
                        onClick={() =>
                          setResume((current) => ({
                            ...current,
                            customSections: current.customSections.filter((_, index) => index !== sectionIndex),
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>

                    <label className="block text-sm">
                      <span className="mb-1 block text-xs font-medium text-slate-600">Section title</span>
                      <input
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                        value={section.title}
                        onChange={(event) =>
                          updateCustomSection(sectionIndex, (currentSection) => ({
                            ...currentSection,
                            title: event.target.value,
                          }))
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
                        value={section.lines.join("\n")}
                        onChange={(event) => {
                          updateCustomSection(sectionIndex, (currentSection) => ({
                            ...currentSection,
                            lines: parseTextareaItems(event.target.value),
                          }));
                          queueAutosizeTextarea(event.currentTarget);
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>
              </div>
              </EditorStackSection>
            </div>
          </div>
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
                minHeight: `${scaledPreviewPageHeight}px`,
              }}
            >
              <div className="resume-preview-page-surface">
                <div className="resume-preview-scale-inner" style={previewScaleStyle}>
                  <SelectedTemplate resume={renderResume} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
