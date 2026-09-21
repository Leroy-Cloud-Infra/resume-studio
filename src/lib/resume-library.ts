import type { Resume, ResumeDocument, ResumeLibrary } from "../types/resume.ts";
import {
  CURRENT_SCHEMA_VERSION,
  isValidResumeDocument,
  migrateLegacyPayload,
  migrateLegacyResume,
} from "./resume-migrations.ts";

export const RESUME_LIBRARY_STORAGE_KEY = "resume-studio.library.v4";
export const LEGACY_RESUME_STORAGE_KEY = "resume-studio.current-resume";

export type StorageLike = Pick<Storage, "getItem" | "setItem"> & Partial<Pick<Storage, "removeItem">>;

export type LibraryResult = {
  ok: boolean;
  library?: ResumeLibrary;
  status: "loaded" | "migrated" | "seeded" | "error";
  error?: string;
};

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function isValidResumeLibrary(value: unknown): value is ResumeLibrary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ResumeLibrary>;
  return candidate.schemaVersion === CURRENT_SCHEMA_VERSION &&
    typeof candidate.activeResumeId === "string" &&
    Array.isArray(candidate.resumes) &&
    candidate.resumes.length > 0 &&
    candidate.resumes.every(isValidResumeDocument) &&
    candidate.resumes.some((resume) => resume.id === candidate.activeResumeId) &&
    new Set(candidate.resumes.map((resume) => resume.id)).size === candidate.resumes.length;
}

export function createLibrary(document: ResumeDocument): ResumeLibrary {
  const library = { schemaVersion: CURRENT_SCHEMA_VERSION, activeResumeId: document.id, resumes: [document] };
  if (!isValidResumeLibrary(library)) throw new Error("Cannot create an invalid resume library.");
  return library;
}

export function saveResumeLibrary(library: ResumeLibrary, storage: StorageLike | null = browserStorage()) {
  if (!storage) return { ok: false, error: "Browser storage is unavailable." };
  if (!isValidResumeLibrary(library)) return { ok: false, error: "Invalid resume library." };
  try {
    const serialized = JSON.stringify(library);
    storage.setItem(RESUME_LIBRARY_STORAGE_KEY, serialized);
    const written = JSON.parse(storage.getItem(RESUME_LIBRARY_STORAGE_KEY) ?? "null") as unknown;
    if (!isValidResumeLibrary(written)) return { ok: false, error: "Saved resume library failed validation." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Resume library could not be saved." };
  }
}

export function loadResumeLibrary(
  initialResume: Resume,
  storage: StorageLike | null = browserStorage(),
  options: { now?: string; templateId?: string } = {},
): LibraryResult {
  if (!storage) return { ok: false, status: "error", error: "Browser storage is unavailable." };

  let currentRaw: string | null;
  try {
    currentRaw = storage.getItem(RESUME_LIBRARY_STORAGE_KEY);
  } catch {
    return { ok: false, status: "error", error: "Resume library could not be read." };
  }

  if (currentRaw !== null) {
    try {
      const parsed = JSON.parse(currentRaw) as unknown;
      if (!isValidResumeLibrary(parsed)) return { ok: false, status: "error", error: "Saved resume library is invalid." };
      return { ok: true, status: "loaded", library: parsed };
    } catch {
      return { ok: false, status: "error", error: "Saved resume library is malformed." };
    }
  }

  let legacyRaw: string | null;
  try {
    legacyRaw = storage.getItem(LEGACY_RESUME_STORAGE_KEY);
  } catch {
    return { ok: false, status: "error", error: "Legacy resume could not be read." };
  }

  let document: ResumeDocument;
  let status: LibraryResult["status"];
  try {
    if (legacyRaw !== null) {
      document = migrateLegacyPayload(JSON.parse(legacyRaw), options);
      status = "migrated";
    } else {
      document = migrateLegacyResume(initialResume, options);
      status = "seeded";
    }
  } catch {
    return { ok: false, status: "error", error: "Resume data could not be migrated." };
  }

  const library = createLibrary(document);
  const saved = saveResumeLibrary(library, storage);
  if (!saved.ok) {
    try {
      storage.removeItem?.(RESUME_LIBRARY_STORAGE_KEY);
    } catch {
      // Preserve the original legacy key even if cleanup is unavailable.
    }
    return { ok: false, status: "error", library, error: saved.error };
  }
  return { ok: true, status, library };
}

export function upsertResumeDocument(library: ResumeLibrary, document: ResumeDocument): ResumeLibrary {
  if (!isValidResumeDocument(document)) throw new Error("Cannot store an invalid resume document.");
  const index = library.resumes.findIndex((resume) => resume.id === document.id);
  const resumes = [...library.resumes];
  if (index === -1) resumes.push(document);
  else resumes[index] = document;
  const next = { ...library, resumes };
  if (!isValidResumeLibrary(next)) throw new Error("Resume update produced an invalid library.");
  return next;
}
