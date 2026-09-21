import type { StorageLike } from "./resume-library.ts";
import type { ResumeDocument } from "../types/resume.ts";

export const RESUME_UI_PREFERENCES_STORAGE_KEY = "resume-studio.ui-preferences.v1";

export function resolveLastOpenSectionId(
  document: Pick<ResumeDocument, "sections">,
  storedSectionId: string | null | undefined,
) {
  if (storedSectionId === "header") return "header";
  return storedSectionId && document.sections.some((section) => section.id === storedSectionId)
    ? storedSectionId
    : null;
}

type ResumeUiPreferences = {
  version: 1;
  lastOpenSectionByResumeId: Record<string, string | null>;
};

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function parsePreferences(raw: string | null): ResumeUiPreferences {
  if (!raw) return { version: 1, lastOpenSectionByResumeId: {} };
  try {
    const value = JSON.parse(raw) as Partial<ResumeUiPreferences>;
    if (value.version !== 1 || !value.lastOpenSectionByResumeId || typeof value.lastOpenSectionByResumeId !== "object") {
      return { version: 1, lastOpenSectionByResumeId: {} };
    }
    const entries = Object.entries(value.lastOpenSectionByResumeId).filter(([, sectionId]) => sectionId === null || typeof sectionId === "string");
    return { version: 1, lastOpenSectionByResumeId: Object.fromEntries(entries) };
  } catch {
    return { version: 1, lastOpenSectionByResumeId: {} };
  }
}

export function readLastOpenSectionId(resumeId: string, storage: StorageLike | null = browserStorage()): string | null | undefined {
  if (!storage) return undefined;
  try {
    const preferences = parsePreferences(storage.getItem(RESUME_UI_PREFERENCES_STORAGE_KEY));
    return Object.prototype.hasOwnProperty.call(preferences.lastOpenSectionByResumeId, resumeId)
      ? preferences.lastOpenSectionByResumeId[resumeId]
      : undefined;
  } catch {
    return undefined;
  }
}

export function writeLastOpenSectionId(resumeId: string, sectionId: string | null, storage: StorageLike | null = browserStorage()) {
  if (!storage) return { ok: false, error: "Browser storage is unavailable." };
  try {
    const preferences = parsePreferences(storage.getItem(RESUME_UI_PREFERENCES_STORAGE_KEY));
    preferences.lastOpenSectionByResumeId[resumeId] = sectionId;
    storage.setItem(RESUME_UI_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    return { ok: true };
  } catch {
    return { ok: false, error: "Resume UI preferences could not be saved." };
  }
}
