"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

const BUTTON_BASE_CLASSES =
  "inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
const BUTTON_SECONDARY_CLASSES = `${BUTTON_BASE_CLASSES} border-slate-300 text-slate-700 hover:bg-slate-100`;
const BUTTON_PRIMARY_CLASSES = `${BUTTON_BASE_CLASSES} border-slate-300 bg-slate-900 text-white hover:bg-slate-800`;
const BUTTON_DANGER_CLASSES = `${BUTTON_BASE_CLASSES} border-red-200 text-red-700 hover:bg-red-50`;
const LETTER_PAGE_ASPECT_RATIO = 11 / 8.5;
const PAGE_LIMIT_WARNING_RATIO = 0.93;
const PAGE_OVERFLOW_TOLERANCE_PX = 8;
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
        className: "border-orange-200 bg-orange-50 text-orange-800",
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
          className: "border-amber-200 bg-amber-50 text-amber-800",
          averageLength,
          longBulletCount,
          veryLongBulletCount,
          likelyWrapPressure,
        }
      : {
          status: "balanced",
          label: "Balanced",
          message: "This role should scan cleanly.",
          className: "border-sky-200 bg-sky-50 text-sky-800",
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
      className: "border-orange-200 bg-orange-50 text-orange-800",
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
      className: "border-amber-200 bg-amber-50 text-amber-800",
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
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      density,
      bulletMetrics,
    };
  }

  return {
    bulletCount,
    status: "light",
    label: "Light",
    message: "This role may feel underdeveloped.",
    className: "border-slate-200 bg-white text-slate-600",
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
  const [expandedExperienceIndex, setExpandedExperienceIndex] = useState<number | null>(0);
  const [expandedEducationIndex, setExpandedEducationIndex] = useState<number | null>(0);
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
  const previewShellRef = useRef<HTMLElement | null>(null);
  const hasRestoredFromStorage = useRef(false);
  const fallbackTechnicalSkills = useRef(initialResume.technicalSkills);
  const initialResumeHash = useMemo(
    () => JSON.stringify(initialResume),
    [initialResume],
  );

  const selectedTemplate = useMemo(() => getResumeTemplate(templateId), [templateId]);
  const renderResume = useMemo(() => normalizeResumeBullets(resume), [resume]);
  const measurePreviewPages = useCallback(() => {
    const previewShell = previewShellRef.current;
    const resumeArticle = previewShell?.querySelector<HTMLElement>(".resume-document");

    if (!previewShell || !resumeArticle) {
      return;
    }

    const shellRect = previewShell.getBoundingClientRect();
    const articleRect = resumeArticle.getBoundingClientRect();
    const firstPageHeight = articleRect.width * LETTER_PAGE_ASPECT_RATIO;
    if (firstPageHeight <= 0) {
      return;
    }

    const contentHeight = resumeArticle.scrollHeight;
    const measuredOverflowHeight = contentHeight - firstPageHeight;
    const isOverflowing = measuredOverflowHeight > PAGE_OVERFLOW_TOLERANCE_PX;
    const overflowHeight = isOverflowing ? measuredOverflowHeight : 0;
    const hasSecondPage = isOverflowing;
    const pageCount = isOverflowing
      ? Math.max(2, Math.ceil(contentHeight / firstPageHeight))
      : 1;
    const isNearLimit =
      !isOverflowing && contentHeight / firstPageHeight >= PAGE_LIMIT_WARNING_RATIO;

    setPageAwareness({
      pageCount,
      isOverflowing,
      hasSecondPage,
      isNearLimit,
      overflowHeight,
      firstPageHeight,
      contentHeight,
      markerTop: articleRect.top - shellRect.top + firstPageHeight,
      markerLeft: articleRect.left - shellRect.left,
      markerWidth: articleRect.width,
    });
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

  const handleExportPDF = () => {
    window.print();
  };

  const handleReset = () => {
    window.localStorage.removeItem(RESUME_STORAGE_KEY);
    setResume(initialResume);
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
  const pageStatusLabel = pageAwareness.isOverflowing
    ? `${pageAwareness.pageCount} ${pageAwareness.pageCount === 1 ? "Page" : "Pages"}`
    : pageAwareness.isNearLimit
      ? "Near Limit"
      : "1 Page";
  const pageStatusDetail = pageAwareness.isOverflowing
    ? "Content continues past page 1"
    : pageAwareness.isNearLimit
      ? `About ${pageFillPercent}% used`
      : "Fits";
  const toolbarTitle = resume.title.trim() || resume.header.name.trim() || "Untitled resume";
  const toolbarIdentityNote =
    resume.header.name.trim() && resume.header.name.trim() !== toolbarTitle
      ? resume.header.name.trim()
      : "Draft";

  return (
    <main className="resume-app-shell">
      <header className="resume-shell-toolbar" aria-label="Workspace toolbar">
        <div className="resume-shell-toolbar-rail">
          <div className="resume-shell-toolbar-group resume-shell-toolbar-group--identity">
            <div className="resume-shell-toolbar-block">
              <p className="resume-shell-toolbar-kicker">Resume</p>
              <p className="resume-shell-toolbar-title">{toolbarTitle}</p>
              <p className="resume-shell-toolbar-note">{toolbarIdentityNote}</p>
            </div>
          </div>

          <div className="resume-shell-toolbar-group resume-shell-toolbar-group--right">
            <div className="resume-shell-toolbar-meta">
              <p className="resume-shell-toolbar-meta-label">{pageStatusLabel}</p>
              <p className="resume-shell-toolbar-meta-detail">{pageStatusDetail}</p>
            </div>

            <div className="resume-shell-toolbar-actions">
              <button
                className="resume-shell-toolbar-button resume-shell-toolbar-button--subtle"
                type="button"
                onClick={handleReset}
              >
                Reset sample
              </button>
              <button
                className="resume-shell-toolbar-button resume-shell-toolbar-button--export"
                type="button"
                onClick={handleExportPDF}
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="resume-workspace">
        <section className="resume-editor-panel">
          <div className="space-y-7">
            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-700">
                  Header
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Contact details shown at the top of the resume.
                </p>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Name</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                  value={resume.header.name}
                  onChange={(event) =>
                    setResume((current) => ({
                      ...current,
                      header: { ...current.header, name: event.target.value },
                    }))
                  }
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Email</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                  value={resume.header.email}
                  onChange={(event) =>
                    setResume((current) => ({
                      ...current,
                      header: { ...current.header, email: event.target.value },
                    }))
                  }
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Phone</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                  value={resume.header.phone}
                  onChange={(event) =>
                    setResume((current) => ({
                      ...current,
                      header: { ...current.header, phone: event.target.value },
                    }))
                  }
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Location</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                  value={resume.header.location}
                  onChange={(event) =>
                    setResume((current) => ({
                      ...current,
                      header: { ...current.header, location: event.target.value },
                    }))
                  }
                />
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-700">
                  Professional Summary
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Keep this short and specific to your current target roles.
                </p>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Summary text</span>
                <textarea
                  className="h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                  value={resume.summary}
                  onChange={(event) =>
                    setResume((current) => ({ ...current, summary: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-700">
                    Experience
                  </h2>
                  <button
                    className={BUTTON_PRIMARY_CLASSES}
                    type="button"
                    onClick={handleAddExperience}
                  >
                    Add experience
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Expand a role to edit fields. Collapsed summaries update live as you type.
                </p>
              </div>
              <div className="space-y-3">
                {resume.experience.map((job, jobIndex) => {
                  const isExpanded = expandedExperienceIndex === jobIndex;
                  const bulletGuidance = analyzeExperienceBullets(job.bullets);
                  return (
                    <div
                      key={`${job.company}-${job.title}-${jobIndex}`}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-3"
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
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                            Experience {jobIndex + 1}
                          </p>
                          <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                            {formatExperienceCardSummary(job)}
                          </p>
                          <div className="mt-2 flex max-w-full flex-wrap gap-1.5">
                            <span
                              className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 text-xs ${bulletGuidance.className}`}
                            >
                              <span className="font-semibold">{bulletGuidance.label}</span>
                              <span className="text-[11px] opacity-80">
                                {bulletGuidance.bulletCount}{" "}
                                {bulletGuidance.bulletCount === 1 ? "bullet" : "bullets"}
                              </span>
                              <span className="text-[11px] opacity-90">
                                {bulletGuidance.message}
                              </span>
                            </span>
                            <span
                              className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 text-xs ${bulletGuidance.density.className}`}
                            >
                              <span className="font-semibold">{bulletGuidance.density.label}</span>
                              <span className="text-[11px] opacity-80">
                                Avg {bulletGuidance.density.averageLength} chars
                              </span>
                              <span className="text-[11px] opacity-90">
                                {bulletGuidance.density.message}
                              </span>
                            </span>
                          </div>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            className={BUTTON_SECONDARY_CLASSES}
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
                            className={BUTTON_DANGER_CLASSES}
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
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="block text-sm">
                              <span className="mb-1 block text-xs font-medium text-slate-600">Title</span>
                              <input
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                                value={job.title}
                                onChange={(event) =>
                                  updateExperience(jobIndex, (currentJob) => ({
                                    ...currentJob,
                                    title: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <label className="block text-sm">
                              <span className="mb-1 block text-xs font-medium text-slate-600">Company</span>
                              <input
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                                value={job.company}
                                onChange={(event) =>
                                  updateExperience(jobIndex, (currentJob) => ({
                                    ...currentJob,
                                    company: event.target.value,
                                  }))
                                }
                              />
                            </label>
                          </div>

                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <label className="block text-sm">
                              <span className="mb-1 block text-xs font-medium text-slate-600">Start month</span>
                              <select
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
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
                            <label className="block text-sm">
                              <span className="mb-1 block text-xs font-medium text-slate-600">Start year</span>
                              <select
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
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

                          <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                            <input
                              className="h-4 w-4 rounded border-slate-300"
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
                            Currently in this role
                          </label>

                          {!job.dateRange.current ? (
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <label className="block text-sm">
                                <span className="mb-1 block text-xs font-medium text-slate-600">End month</span>
                                <select
                                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
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
                              <label className="block text-sm">
                                <span className="mb-1 block text-xs font-medium text-slate-600">End year</span>
                                <select
                                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
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

                          <label className="mt-2 block text-sm">
                            <span className="mb-1 block text-xs font-medium text-slate-600">Location</span>
                            <input
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                              value={job.location}
                              onChange={(event) =>
                                updateExperience(jobIndex, (currentJob) => ({
                                  ...currentJob,
                                  location: event.target.value,
                                }))
                              }
                            />
                          </label>

                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                                  Bullets
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {bulletGuidance.message} {bulletGuidance.density.message}
                                </p>
                              </div>
                              <button
                                className={BUTTON_SECONDARY_CLASSES}
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
                              const bulletLengthStatus = getBulletLengthStatus(bullet.trim().length);
                              const bulletHintClass =
                                bulletLengthStatus === "veryLong"
                                  ? "border-orange-200 bg-orange-50 text-orange-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700";

                              return (
                                <div
                                  key={`${job.company}-${job.title}-${bulletIndex}`}
                                  className="rounded-md border border-slate-200 bg-white p-2"
                                >
                                  <div className="mb-1.5 flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                      Bullet {bulletIndex + 1}
                                      {bulletLengthStatus !== "normal" ? (
                                        <span
                                          className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${bulletHintClass}`}
                                        >
                                          {bulletLengthStatus === "veryLong" ? "Very long" : "Long"}
                                        </span>
                                      ) : null}
                                    </span>
                                    <button
                                      className={BUTTON_DANGER_CLASSES}
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
                                      Remove bullet
                                    </button>
                                  </div>
                                  <textarea
                                    className="min-h-[76px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                                    value={bullet}
                                    onChange={(event) =>
                                      updateExperience(jobIndex, (currentJob) => ({
                                        ...currentJob,
                                        bullets: currentJob.bullets.map((currentBullet, currentBulletIndex) =>
                                          currentBulletIndex === bulletIndex
                                            ? event.target.value
                                            : currentBullet,
                                        ),
                                      }))
                                    }
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

            <div className="space-y-3">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-700">
                    Education
                  </h2>
                  <button
                    className={BUTTON_PRIMARY_CLASSES}
                    type="button"
                    onClick={handleAddEducation}
                  >
                    Add education
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Expand an entry to edit school details and structured dates.
                </p>
              </div>
              <div className="space-y-3">
                {resume.education.map((item, itemIndex) => {
                  const isExpanded = expandedEducationIndex === itemIndex;
                  return (
                    <div
                      key={`${item.school}-${item.degree}-${itemIndex}`}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-3"
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
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                            Education {itemIndex + 1}
                          </p>
                          <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                            {formatEducationCardSummary(item)}
                          </p>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            className={BUTTON_SECONDARY_CLASSES}
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
                            className={BUTTON_DANGER_CLASSES}
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
                          <label className="block text-sm">
                            <span className="mb-1 block text-xs font-medium text-slate-600">School</span>
                            <input
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                              value={item.school}
                              onChange={(event) =>
                                updateEducation(itemIndex, (currentItem) => ({
                                  ...currentItem,
                                  school: event.target.value,
                                }))
                              }
                            />
                          </label>

                          <label className="mt-2 block text-sm">
                            <span className="mb-1 block text-xs font-medium text-slate-600">Degree</span>
                            <input
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                              value={item.degree}
                              onChange={(event) =>
                                updateEducation(itemIndex, (currentItem) => ({
                                  ...currentItem,
                                  degree: event.target.value,
                                }))
                              }
                            />
                          </label>

                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <label className="block text-sm">
                              <span className="mb-1 block text-xs font-medium text-slate-600">Start month</span>
                              <select
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
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
                            <label className="block text-sm">
                              <span className="mb-1 block text-xs font-medium text-slate-600">Start year</span>
                              <select
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
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

                          <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                            <input
                              className="h-4 w-4 rounded border-slate-300"
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
                            Currently enrolled
                          </label>

                          {!item.dateRange.current ? (
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <label className="block text-sm">
                                <span className="mb-1 block text-xs font-medium text-slate-600">End month</span>
                                <select
                                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
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
                              <label className="block text-sm">
                                <span className="mb-1 block text-xs font-medium text-slate-600">End year</span>
                                <select
                                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
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

                          <label className="mt-2 block text-sm">
                            <span className="mb-1 block text-xs font-medium text-slate-600">Location</span>
                            <input
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                              value={item.location ?? ""}
                              onChange={(event) =>
                                updateEducation(itemIndex, (currentItem) => ({
                                  ...currentItem,
                                  location: event.target.value,
                                }))
                              }
                            />
                          </label>

                          <label className="mt-2 block text-sm">
                            <span className="mb-1 block text-xs font-medium text-slate-600">
                              Coursework (one per line)
                            </span>
                            <textarea
                              className="h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                              value={(item.coursework ?? []).join("\n")}
                              onChange={(event) =>
                                updateEducation(itemIndex, (currentItem) => ({
                                  ...currentItem,
                                  coursework: parseTextareaItems(event.target.value),
                                }))
                              }
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-700">
                    Technical Skills
                  </h2>
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
                <p className="mt-1 text-xs text-slate-500">
                  Edit category labels and values. The preview keeps the inline label:value format.
                </p>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-600">Section title</span>
                <input
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
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
              </label>
              <div className="space-y-3">
                {resume.technicalSkills.categories.map((category, categoryIndex) => (
                  <div
                    key={category.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                        Category {categoryIndex + 1}
                      </p>
                      <p className="min-w-0 flex-1 truncate text-right text-xs text-slate-500">
                        {category.label.trim() || "New Category"}
                      </p>
                      <button
                        className={BUTTON_DANGER_CLASSES}
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
                        Remove category
                      </button>
                    </div>

                    <label className="block text-sm">
                      <span className="mb-1 block text-xs font-medium text-slate-600">Category label</span>
                      <input
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                        value={category.label}
                        onChange={(event) =>
                          updateTechnicalSkillCategory(categoryIndex, (currentCategory) => ({
                            ...currentCategory,
                            label: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="mt-2 block text-sm">
                      <span className="mb-1 block text-xs font-medium text-slate-600">Skills/value</span>
                      <textarea
                        className="min-h-[70px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                        value={category.value}
                        onChange={(event) =>
                          updateTechnicalSkillCategory(categoryIndex, (currentCategory) => ({
                            ...currentCategory,
                            value: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-700">
                  Custom Resume Sections
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Optional sections for Projects, Certifications, Awards, Languages, or Volunteer work.
                </p>
              </div>
              <div className="space-y-3">
                {resume.customSections.map((section, sectionIndex) => (
                  <div
                    key={section.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
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
                        value={section.lines.join("\n")}
                        onChange={(event) =>
                          updateCustomSection(sectionIndex, (currentSection) => ({
                            ...currentSection,
                            lines: parseTextareaItems(event.target.value),
                          }))
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
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
          </div>
        </section>

        <section
          ref={previewShellRef}
          className="resume-preview-shell relative"
        >
          {pageAwareness.hasSecondPage ? (
            <div
              aria-hidden="true"
              className="resume-page-break-guide pointer-events-none absolute z-10 flex -translate-y-1/2 items-center gap-2 text-[10px] font-medium text-slate-500"
              style={{
                top: pageAwareness.markerTop,
                left: pageAwareness.markerLeft,
                width: pageAwareness.markerWidth,
              }}
            >
              <span className="h-0 flex-1 border-t border-dashed border-slate-300" />
              <span className="bg-white/85 px-1">Page 2 starts here</span>
              <span className="h-0 w-10 border-t border-dashed border-slate-300" />
            </div>
          ) : null}
          <SelectedTemplate resume={renderResume} />
        </section>
      </div>
    </main>
  );
}
