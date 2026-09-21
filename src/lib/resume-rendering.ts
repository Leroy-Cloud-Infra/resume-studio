import type {
  Bullet,
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  ResumeDocument,
  ResumeSection,
  SkillCategory,
} from "../types/resume.ts";

export function getIncludedSections(document: ResumeDocument): ResumeSection[] {
  return document.sections.filter((section) => section.included);
}

/**
 * The Header owns the boundary rule before the first included section. Later
 * section headings keep their normal top rule. Keeping this plan alongside
 * the canonical filtering makes the boundary position-based rather than
 * dependent on a particular section type (Summary, Experience, etc.).
 */
export function getIncludedSectionRenderPlan(document: ResumeDocument) {
  return getIncludedSections(document).map((section, index) => ({
    section,
    showTopRule: index > 0,
  }));
}

export function getIncludedExperienceEntries(entries: ExperienceEntry[]) {
  return entries.filter((entry) => entry.included);
}

export function getIncludedEducationEntries(entries: EducationEntry[]) {
  return entries.filter((entry) => entry.included);
}

export function getIncludedSkillCategories(categories: SkillCategory[]) {
  return categories
    .filter((category) => category.included)
    .map((category) => ({ ...category, skills: category.skills.filter((skill) => skill.included) }));
}

export function getIncludedBullets(bullets: Bullet[]) {
  return bullets.filter((bullet) => bullet.included);
}

export function getProjectMetadataParts(project: ProjectEntry) {
  return [project.date, project.technologies, project.url].filter((value): value is string => Boolean(value?.trim()));
}

export function getProjectSupportingMetadataParts(project: ProjectEntry) {
  return [project.technologies, project.url].filter((value): value is string => Boolean(value?.trim()));
}

export function getCertificationMetadataParts(certification: CertificationEntry) {
  return [certification.issuer, certification.date, certification.expirationDate, certification.credentialId, certification.credentialUrl].filter((value): value is string => Boolean(value?.trim()));
}

export function getEducationIdentityParts(entry: Pick<EducationEntry, "degree" | "school">) {
  const hasDegree = entry.degree.trim().length > 0;
  const hasSchool = entry.school.trim().length > 0;
  return {
    degree: entry.degree,
    school: entry.school,
    showSeparator: hasDegree && hasSchool,
  };
}
