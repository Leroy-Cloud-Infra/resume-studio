import type {
  Bullet,
  CustomSection,
  EducationEntry,
  EducationSection,
  ExperienceEntry,
  ExperienceSection,
  ProjectEntry,
  ProjectsSection,
  Resume,
  ResumeDocument,
  ResumeSection,
  SkillCategory,
  TechnicalSkillsSection,
} from "../types/resume.ts";
import { createStableId } from "./stable-id.ts";

export { createStableId } from "./stable-id.ts";

export const CURRENT_SCHEMA_VERSION = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeMonth(value: string) {
  const monthMap: Record<string, string> = {
    jan: "Jan", january: "Jan", feb: "Feb", february: "Feb", mar: "Mar", march: "Mar",
    apr: "Apr", april: "Apr", may: "May", jun: "Jun", june: "Jun", jul: "Jul", july: "Jul",
    aug: "Aug", august: "Aug", sep: "Sept", sept: "Sept", september: "Sept", oct: "Oct",
    october: "Oct", nov: "Nov", november: "Nov", dec: "Dec", december: "Dec",
  };

  return monthMap[value.trim().toLowerCase()] ?? value;
}

function parseDateRange(value: unknown, legacyDates?: unknown) {
  if (isRecord(value) && typeof value.startMonth === "string" && typeof value.startYear === "string") {
    const current = Boolean(value.current);
    return {
      startMonth: normalizeMonth(value.startMonth),
      startYear: value.startYear,
      ...(current
        ? { current: true }
        : {
            current: false,
            ...(typeof value.endMonth === "string" ? { endMonth: normalizeMonth(value.endMonth) } : {}),
            ...(typeof value.endYear === "string" ? { endYear: value.endYear } : {}),
          }),
    };
  }

  if (typeof legacyDates !== "string") return null;
  const match = legacyDates.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().match(
    /^([A-Za-z]+)\s+(\d{4})\s*[—-]\s*(Present|([A-Za-z]+)\s+(\d{4}))$/i,
  );
  if (!match) return null;
  if (/^present$/i.test(match[3])) {
    return { startMonth: normalizeMonth(match[1]), startYear: match[2], current: true };
  }
  return {
    startMonth: normalizeMonth(match[1]),
    startYear: match[2],
    endMonth: normalizeMonth(match[4]),
    endYear: match[5],
    current: false,
  };
}

function optionalId(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : createStableId();
}

function migrateBullets(value: unknown): Bullet[] {
  if (!Array.isArray(value)) throw new Error("Invalid bullets.");
  return value.map((bullet) => {
    if (typeof bullet === "string") return { id: createStableId(), text: bullet, included: true };
    if (isRecord(bullet) && typeof bullet.text === "string") {
      return { id: optionalId(bullet.id), text: bullet.text, included: bullet.included !== false };
    }
    throw new Error("Invalid bullet entry.");
  });
}

function splitSkills(value: string): string[] {
  const parts = value.split(/[,\n]/).map((part) => part.trim());
  if (parts.length === 0 || parts.some((part) => part.length === 0)) return [value.trim()];
  return parts.filter(Boolean);
}

function migrateSkillCategory(value: unknown): SkillCategory {
  if (!isRecord(value) || typeof value.label !== "string") throw new Error("Invalid skill category.");
  const rawSkills = Array.isArray(value.skills)
    ? value.skills.map((skill) => {
        if (typeof skill === "string") return { id: createStableId(), name: skill, included: true };
        if (isRecord(skill) && typeof skill.name === "string") {
          return { id: optionalId(skill.id), name: skill.name, included: skill.included !== false };
        }
        throw new Error("Invalid skill.");
      })
    : typeof value.value === "string"
      ? splitSkills(value.value).map((name) => ({ id: createStableId(), name, included: true }))
      : [];

  return {
    id: optionalId(value.id),
    included: value.included !== false,
    label: value.label,
    skills: rawSkills,
  };
}

function migrateSkills(value: unknown, skillsSection: unknown): SkillCategory[] {
  if (value === undefined || value === null) value = skillsSection;
  if (isRecord(value) && Array.isArray(value.categories)) {
    return value.categories.map(migrateSkillCategory);
  }
  if (isRecord(skillsSection) && isStringArray(skillsSection.lines)) {
    return skillsSection.lines.map((line) => {
      const colonIndex = line.indexOf(":");
      return migrateSkillCategory(colonIndex === -1
        ? { label: line, value: "" }
        : { label: line.slice(0, colonIndex).trim(), value: line.slice(colonIndex + 1).trim() });
    });
  }
  if (Array.isArray(value)) {
    return value.map((group) => {
      if (!isRecord(group) || typeof group.category !== "string" || !isStringArray(group.items)) {
        throw new Error("Invalid legacy skill group.");
      }
      return {
        id: createStableId(), included: true, label: group.category,
        skills: group.items.map((name) => ({ id: createStableId(), name, included: true })),
      };
    });
  }
  return [];
}

function migrateExperience(value: unknown): ExperienceEntry[] {
  if (!Array.isArray(value)) throw new Error("Invalid experience.");
  return value.map((item) => {
    if (!isRecord(item) || typeof item.company !== "string" || typeof item.title !== "string" || typeof item.location !== "string") {
      throw new Error("Invalid experience entry.");
    }
    const dateRange = parseDateRange(item.dateRange, item.dates);
    if (!dateRange) throw new Error("Invalid experience date range.");
    return {
      id: optionalId(item.id), included: item.included !== false, company: item.company, title: item.title,
      location: item.location, dateRange, bullets: migrateBullets(item.bullets ?? []),
    };
  });
}

function migrateProjects(value: unknown): ProjectEntry[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!isRecord(item) || typeof item.name !== "string") throw new Error("Invalid project entry.");
    return {
      id: optionalId(item.id), included: item.included !== false, name: item.name,
      ...(typeof item.description === "string" && item.description ? { description: item.description } : {}),
      ...(typeof item.date === "string" ? { date: item.date } : {}),
      ...(typeof item.technologies === "string" ? { technologies: item.technologies } : {}),
      ...(typeof item.url === "string" ? { url: item.url } : {}),
      bullets: migrateBullets(item.bullets ?? []),
    };
  });
}

function migrateEducation(value: unknown): EducationEntry[] {
  if (!Array.isArray(value)) throw new Error("Invalid education.");
  return value.map((item) => {
    if (!isRecord(item) || typeof item.school !== "string" || typeof item.degree !== "string") {
      throw new Error("Invalid education entry.");
    }
    const dateRange = parseDateRange(item.dateRange, item.dates);
    if (!dateRange) throw new Error("Invalid education date range.");
    return {
      id: optionalId(item.id), included: item.included !== false, school: item.school, degree: item.degree,
      ...(typeof item.location === "string" ? { location: item.location } : {}), dateRange,
      ...(typeof item.expectedGraduation === "boolean" ? { expectedGraduation: item.expectedGraduation } : {}),
      ...(typeof item.gpa === "string" ? { gpa: item.gpa } : {}),
      ...(typeof item.details === "string" ? { details: item.details } : {}),
      ...(isStringArray(item.coursework) ? { coursework: item.coursework } : {}),
    };
  });
}

function migrateCustomSections(value: unknown): CustomSection[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!isRecord(item) || typeof item.title !== "string" || !isStringArray(item.lines)) {
      throw new Error("Invalid custom section.");
    }
    return { id: optionalId(item.id), type: "custom", included: item.included !== false, content: { title: item.title, lines: item.lines } };
  });
}

export function migrateLegacyResume(value: unknown, options: { now?: string; templateId?: string } = {}): ResumeDocument {
  if (!isRecord(value) || !isRecord(value.header)) throw new Error("Invalid legacy resume.");
  const header = value.header;
  if (!["name", "email", "phone", "location"].every((key) => typeof header[key] === "string")) throw new Error("Invalid resume header.");
  if (typeof value.title !== "string" || typeof value.summary !== "string") throw new Error("Invalid resume metadata.");

  const experience = migrateExperience(value.experience);
  const projects = migrateProjects(value.projects);
  const education = migrateEducation(value.education);
  const categories = migrateSkills(value.technicalSkills, value.skillsSection ?? value.skills);
  const customSections = migrateCustomSections(value.customSections);
  const now = options.now ?? new Date().toISOString();
  const documentId = optionalId(value.id);
  const summaryId = createStableId();
  const experienceId = createStableId();
  const projectsId = createStableId();
  const educationId = createStableId();
  const skillsId = createStableId();
  const certificationsId = createStableId();
  const sections: ResumeSection[] = [
    { id: summaryId, type: "summary", included: true, content: { text: value.summary } },
    { id: experienceId, type: "experience", included: true, content: { entries: experience } },
    { id: projectsId, type: "projects", included: projects.length > 0, content: { entries: projects } },
    { id: educationId, type: "education", included: true, content: { entries: education } },
    { id: skillsId, type: "technicalSkills", included: true, content: { categories } },
    { id: certificationsId, type: "certifications", included: false, content: { entries: [] } },
    ...customSections,
  ];

  const document: ResumeDocument = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: documentId,
    metadata: { title: value.title, templateId: options.templateId ?? "classic", createdAt: now, updatedAt: now },
    header: { name: header.name as string, email: header.email as string, phone: header.phone as string, location: header.location as string, links: Array.isArray(header.links) ? header.links.filter((link): link is string => typeof link === "string") : [] },
    sections,
  };
  if (!isValidResumeDocument(document)) throw new Error("Migrated resume failed validation.");
  return document;
}

export function migrateLegacyPayload(value: unknown, options: { now?: string; templateId?: string } = {}) {
  if (!isRecord(value)) throw new Error("Invalid legacy payload.");
  return migrateLegacyResume(isRecord(value.resume) ? value.resume : value, options);
}

function allIds(document: ResumeDocument) {
  const ids: string[] = [document.id, ...document.sections.map((section) => section.id)];
  for (const section of document.sections) {
    if (section.type === "experience" || section.type === "projects" || section.type === "education" || section.type === "certifications") {
      for (const entry of section.content.entries) {
        ids.push(entry.id);
        if ("bullets" in entry) ids.push(...entry.bullets.map((bullet) => bullet.id));
      }
    }
    if (section.type === "technicalSkills") {
      for (const category of section.content.categories) ids.push(category.id, ...category.skills.map((skill) => skill.id));
    }
  }
  return ids;
}

export function isValidResumeDocument(value: unknown): value is ResumeDocument {
  if (!isRecord(value) || value.schemaVersion !== 4 || typeof value.id !== "string" || !isRecord(value.metadata) || !isRecord(value.header) || !Array.isArray(value.sections)) return false;
  const metadata = value.metadata;
  const header = value.header;
  if (!["title", "templateId", "createdAt", "updatedAt"].every((key) => typeof metadata[key] === "string")) return false;
  if (!["name", "email", "phone", "location"].every((key) => typeof header[key] === "string") || !isStringArray(header.links)) return false;
  const required = ["summary", "experience", "projects", "technicalSkills", "education", "certifications"];
  const types = value.sections.map((section) => isRecord(section) && typeof section.type === "string" ? section.type : "");
  if (required.some((type) => types.filter((candidate) => candidate === type).length !== 1)) return false;
  if (types.some((type) => !required.includes(type) && type !== "custom")) return false;
  if (value.sections.some((section) => !isRecord(section) || typeof section.id !== "string" || typeof section.included !== "boolean" || typeof section.type !== "string" || !isRecord(section.content))) return false;
  if (!(value.sections as unknown[]).every(isValidSection)) return false;
  const ids = allIds(value as ResumeDocument);
  return new Set(ids).size === ids.length;
}

function isValidDateRange(value: unknown) {
  return isRecord(value) && typeof value.startMonth === "string" && typeof value.startYear === "string" &&
    (value.current === undefined || typeof value.current === "boolean") &&
    (value.endMonth === undefined || typeof value.endMonth === "string") &&
    (value.endYear === undefined || typeof value.endYear === "string");
}

function isValidBullet(value: unknown): value is Bullet {
  return isRecord(value) && typeof value.id === "string" && typeof value.text === "string" && typeof value.included === "boolean";
}

function isValidSection(value: unknown): value is ResumeSection {
  if (!isRecord(value) || !isRecord(value.content)) return false;
  if (value.type === "summary") return isRecord(value.content) && typeof value.content.text === "string";
  if (value.type === "experience") {
    if (!Array.isArray(value.content.entries)) return false;
    return value.content.entries.every((entry) => isRecord(entry) && typeof entry.id === "string" && typeof entry.included === "boolean" && typeof entry.company === "string" && typeof entry.title === "string" && typeof entry.location === "string" && isValidDateRange(entry.dateRange) && Array.isArray(entry.bullets) && entry.bullets.every(isValidBullet));
  }
  if (value.type === "projects") {
    if (!Array.isArray(value.content.entries)) return false;
    return value.content.entries.every((entry) => isRecord(entry) && typeof entry.id === "string" && typeof entry.included === "boolean" && typeof entry.name === "string" && (entry.description === undefined || typeof entry.description === "string") && (entry.date === undefined || typeof entry.date === "string") && (entry.technologies === undefined || typeof entry.technologies === "string") && (entry.url === undefined || typeof entry.url === "string") && Array.isArray(entry.bullets) && entry.bullets.every(isValidBullet));
  }
  if (value.type === "education") {
    return Array.isArray(value.content.entries) && value.content.entries.every((entry) => isRecord(entry) && typeof entry.id === "string" && typeof entry.included === "boolean" && typeof entry.school === "string" && typeof entry.degree === "string" && isValidDateRange(entry.dateRange));
  }
  if (value.type === "certifications") {
    return Array.isArray(value.content.entries) && value.content.entries.every((entry) => isRecord(entry) && typeof entry.id === "string" && typeof entry.included === "boolean" && typeof entry.name === "string");
  }
  if (value.type === "technicalSkills") {
    return Array.isArray(value.content.categories) && value.content.categories.every((category) => isRecord(category) && typeof category.id === "string" && typeof category.included === "boolean" && typeof category.label === "string" && Array.isArray(category.skills) && category.skills.every((skill) => isRecord(skill) && typeof skill.id === "string" && typeof skill.included === "boolean" && typeof skill.name === "string"));
  }
  if (value.type === "custom") {
    return typeof value.content.title === "string" && isStringArray(value.content.lines);
  }
  return false;
}

function legacyEntryId(entry: unknown, fallback: unknown) {
  return isRecord(entry) && typeof entry.id === "string" ? entry.id : typeof fallback === "string" ? fallback : createStableId();
}

export function toLegacyResume(document: ResumeDocument, onlyIncluded = false): Resume {
  const find = <T extends ResumeSection["type"]>(type: T) => document.sections.find((section): section is Extract<ResumeSection, { type: T }> => section.type === type)!;
  const summary = find("summary");
  const experience = find("experience");
  const projects = find("projects");
  const education = find("education");
  const skills = find("technicalSkills");
  const custom = document.sections.filter((section): section is CustomSection => section.type === "custom");
  const include = (value: boolean) => !onlyIncluded || value;
  const old: Resume = {
    title: document.metadata.title,
    header: document.header,
    summary: include(summary.included) ? summary.content.text : "",
    technicalSkills: {
      title: "Technical Skills",
      categories: include(skills.included) ? skills.content.categories.filter((category) => include(category.included)).map((category) => ({
        id: category.id, included: category.included, label: category.label,
        value: category.skills.filter((skill) => include(skill.included)).map((skill) => skill.name).join(", "),
        skillIds: category.skills.map((skill) => skill.id),
      })) : [],
    },
    experience: include(experience.included) ? experience.content.entries.filter((entry) => include(entry.included)).map((entry) => ({
      id: entry.id, included: entry.included, company: entry.company, title: entry.title, location: entry.location, dateRange: entry.dateRange,
      bullets: entry.bullets.filter((bullet) => include(bullet.included)).map((bullet) => bullet.text), bulletIds: entry.bullets.map((bullet) => bullet.id),
    })) : [],
    projects: include(projects.included) ? projects.content.entries.filter((entry) => include(entry.included)).map((entry) => ({
      id: entry.id, included: entry.included, name: entry.name, description: entry.description ?? "", date: entry.date, technologies: entry.technologies, url: entry.url, bullets: entry.bullets.filter((bullet) => include(bullet.included)).map((bullet) => bullet.text), bulletIds: entry.bullets.map((bullet) => bullet.id),
    })) : [],
    education: include(education.included) ? education.content.entries.filter((entry) => include(entry.included)).map((entry) => ({ id: entry.id, included: entry.included, school: entry.school, degree: entry.degree, dateRange: entry.dateRange, location: entry.location, expectedGraduation: entry.expectedGraduation, gpa: entry.gpa, details: entry.details, coursework: entry.coursework })) : [],
    customSections: custom.filter((section) => include(section.included)).map((section) => ({ id: section.id, included: section.included, title: section.content.title, lines: section.content.lines })),
    __includedSections: Object.fromEntries(document.sections.map((section) => [section.type, section.included])),
    __v4Document: document,
  };
  return old;
}

function previousSection(document: ResumeDocument, type: ResumeSection["type"]) {
  return document.sections.find((section) => section.type === type);
}

export function mergeLegacyResume(document: ResumeDocument, legacy: Resume, templateId = document.metadata.templateId): ResumeDocument {
  const current = JSON.parse(JSON.stringify(document)) as ResumeDocument;
  current.metadata.title = legacy.title;
  current.metadata.templateId = templateId;
  current.metadata.updatedAt = new Date().toISOString();
  current.header = legacy.header;
  const summary = previousSection(current, "summary") as Extract<ResumeSection, { type: "summary" }>;
  summary.content.text = legacy.summary;
  const experience = previousSection(current, "experience") as ExperienceSection;
  experience.content.entries = legacy.experience.map((entry, index) => {
    const prior = experience.content.entries[index];
    return { id: legacyEntryId(entry, prior?.id), included: entry.included ?? prior?.included ?? true, company: entry.company, title: entry.title, location: entry.location, dateRange: entry.dateRange, bullets: entry.bullets.map((text, bulletIndex) => ({ id: entry.bulletIds?.[bulletIndex] ?? prior?.bullets[bulletIndex]?.id ?? createStableId(), text, included: prior?.bullets[bulletIndex]?.included ?? true })) };
  });
  const projects = previousSection(current, "projects") as ProjectsSection;
  projects.content.entries = legacy.projects.map((entry, index) => {
    const prior = projects.content.entries[index];
    return { id: legacyEntryId(entry, prior?.id), included: entry.included ?? prior?.included ?? true, name: entry.name, description: entry.description || undefined, date: entry.date ?? prior?.date, technologies: entry.technologies ?? prior?.technologies, url: entry.url ?? prior?.url, bullets: entry.bullets.map((text, bulletIndex) => ({ id: entry.bulletIds?.[bulletIndex] ?? prior?.bullets[bulletIndex]?.id ?? createStableId(), text, included: prior?.bullets[bulletIndex]?.included ?? true })) };
  });
  const education = previousSection(current, "education") as EducationSection;
  education.content.entries = legacy.education.map((entry, index) => {
    const prior = education.content.entries[index];
    return { id: legacyEntryId(entry, prior?.id), included: entry.included ?? prior?.included ?? true, school: entry.school, degree: entry.degree, dateRange: entry.dateRange, location: entry.location, expectedGraduation: entry.expectedGraduation ?? prior?.expectedGraduation, gpa: entry.gpa ?? prior?.gpa, details: entry.details ?? prior?.details, coursework: entry.coursework };
  });
  const skills = previousSection(current, "technicalSkills") as TechnicalSkillsSection;
  skills.content.categories = legacy.technicalSkills.categories.map((category, index) => {
    const prior = skills.content.categories[index];
    const names = splitSkills(category.value);
    return { id: category.id || prior?.id || createStableId(), included: category.included ?? prior?.included ?? true, label: category.label, skills: names.map((name, skillIndex) => ({ id: category.skillIds?.[skillIndex] ?? prior?.skills[skillIndex]?.id ?? createStableId(), name, included: prior?.skills[skillIndex]?.included ?? true })) };
  });
  const legacyCustomSections = legacy.customSections.map((section) => ({
    id: section.id || createStableId(),
    type: "custom",
    included: section.included !== false,
    content: { title: section.title, lines: section.lines },
  } as CustomSection));
  const customById = new Map(legacyCustomSections.map((section) => [section.id, section]));
  const existingCustomIds = new Set<string>();
  const mergedSections: ResumeSection[] = [];
  current.sections.forEach((section) => {
    if (section.type !== "custom") {
      mergedSections.push(section);
      return;
    }
    const updated = customById.get(section.id);
    if (!updated) return;
    existingCustomIds.add(section.id);
    mergedSections.push(updated);
  });
  current.sections = mergedSections;
  current.sections.push(...legacyCustomSections.filter((section) => !existingCustomIds.has(section.id)));
  if (!isValidResumeDocument(current)) throw new Error("Resume update failed validation.");
  return current;
}
