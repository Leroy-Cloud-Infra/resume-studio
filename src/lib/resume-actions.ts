import type {
  Bullet,
  CertificationEntry,
  CustomSection,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  ResumeDocument,
  ResumeHeader,
  ResumeSection,
  Skill,
  SkillCategory,
} from "../types/resume.ts";

export type DocumentAction =
  | { type: "set-header-field"; field: keyof ResumeHeader; value: string }
  | { type: "set-summary"; sectionId: string; text: string }
  | { type: "set-metadata"; field: "title" | "templateId"; value: string }
  | { type: "set-section-included"; sectionId: string; included: boolean }
  | { type: "set-entry-included"; sectionId: string; entryId: string; included: boolean }
  | { type: "set-bullet-included"; sectionId: string; entryId: string; bulletId: string; included: boolean }
  | { type: "move-section"; sectionId: string; toIndex: number }
  | { type: "move-entry"; sectionId: string; entryId: string; toIndex: number }
  | { type: "move-bullet"; sectionId: string; entryId: string; bulletId: string; toIndex: number }
  | { type: "set-experience-entry"; sectionId: string; entryId: string; entry: ExperienceEntry }
  | { type: "add-experience-entry"; sectionId: string; entry: ExperienceEntry }
  | { type: "delete-experience-entry"; sectionId: string; entryId: string }
  | { type: "set-experience-bullet"; sectionId: string; entryId: string; bulletId: string; bullet: Bullet }
  | { type: "add-experience-bullet"; sectionId: string; entryId: string; bullet: Bullet }
  | { type: "delete-experience-bullet"; sectionId: string; entryId: string; bulletId: string }
  | { type: "set-project-entry"; sectionId: string; entryId: string; entry: ProjectEntry }
  | { type: "add-project-entry"; sectionId: string; entry: ProjectEntry }
  | { type: "delete-project-entry"; sectionId: string; entryId: string }
  | { type: "set-project-bullet"; sectionId: string; entryId: string; bulletId: string; bullet: Bullet }
  | { type: "add-project-bullet"; sectionId: string; entryId: string; bullet: Bullet }
  | { type: "delete-project-bullet"; sectionId: string; entryId: string; bulletId: string }
  | { type: "set-education-entry"; sectionId: string; entryId: string; entry: EducationEntry }
  | { type: "add-education-entry"; sectionId: string; entry: EducationEntry }
  | { type: "delete-education-entry"; sectionId: string; entryId: string }
  | { type: "set-certification-entry"; sectionId: string; entryId: string; entry: CertificationEntry }
  | { type: "add-certification-entry"; sectionId: string; entry: CertificationEntry }
  | { type: "delete-certification-entry"; sectionId: string; entryId: string }
  | { type: "set-skill-category"; sectionId: string; categoryId: string; category: SkillCategory }
  | { type: "add-skill-category"; sectionId: string; category: SkillCategory }
  | { type: "delete-skill-category"; sectionId: string; categoryId: string }
  | { type: "move-skill-category"; sectionId: string; categoryId: string; toIndex: number }
  | { type: "set-skill"; sectionId: string; categoryId: string; skillId: string; skill: Skill }
  | { type: "move-skill"; sectionId: string; categoryId: string; skillId: string; toIndex: number }
  | { type: "set-custom-section"; sectionId: string; section: CustomSection }
  | { type: "add-custom-section"; section: CustomSection }
  | { type: "delete-custom-section"; sectionId: string }
  | { type: "legacy-update"; update: (document: ResumeDocument) => ResumeDocument };

export function getSection<T extends ResumeSection["type"]>(document: ResumeDocument, type: T) {
  return document.sections.find((section): section is Extract<ResumeSection, { type: T }> => section.type === type);
}

export function getSectionById(document: ResumeDocument, sectionId: string) {
  return document.sections.find((section) => section.id === sectionId);
}

function withUpdatedSection(document: ResumeDocument, sectionId: string, update: (section: ResumeSection) => ResumeSection) {
  const index = document.sections.findIndex((section) => section.id === sectionId);
  if (index < 0) return document;
  const nextSection = update(document.sections[index]);
  if (nextSection === document.sections[index]) return document;
  const sections = [...document.sections];
  sections[index] = nextSection;
  return { ...document, metadata: { ...document.metadata, updatedAt: new Date().toISOString() }, sections };
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function applyDocumentAction(document: ResumeDocument, action: DocumentAction): ResumeDocument {
  switch (action.type) {
    case "legacy-update":
      return action.update(document);
    case "set-header-field":
      if (document.header[action.field] === action.value) return document;
      return { ...document, metadata: { ...document.metadata, updatedAt: new Date().toISOString() }, header: { ...document.header, [action.field]: action.value } };
    case "set-summary":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "summary" && section.content.text !== action.text ? { ...section, content: { text: action.text } } : section);
    case "set-metadata":
      if (document.metadata[action.field] === action.value) return document;
      return { ...document, metadata: { ...document.metadata, [action.field]: action.value, updatedAt: new Date().toISOString() } };
    case "set-section-included":
      return withUpdatedSection(document, action.sectionId, (section) => section.included === action.included ? section : { ...section, included: action.included });
    case "move-section": {
      const from = document.sections.findIndex((section) => section.id === action.sectionId);
      const sections = moveItem(document.sections, from, action.toIndex);
      return sections === document.sections ? document : { ...document, metadata: { ...document.metadata, updatedAt: new Date().toISOString() }, sections };
    }
    case "set-entry-included":
      return withUpdatedSection(document, action.sectionId, (section) => {
        if (!("entries" in section.content)) return section;
        const content = section.content as { entries: Array<{ id: string; included: boolean }> };
        const entries = content.entries.map((entry) => entry.id === action.entryId ? { ...entry, included: action.included } : entry);
        return entries.some((entry, index) => entry !== content.entries[index]) ? { ...section, content: { ...section.content, entries } } as ResumeSection : section;
      });
    case "set-bullet-included":
      return withUpdatedSection(document, action.sectionId, (section) => {
        if (!("entries" in section.content)) return section;
        const content = section.content as { entries: Array<{ id: string; bullets?: Bullet[] }> };
        let changed = false;
        const entries = content.entries.map((entry) => {
          if (entry.id !== action.entryId || !entry.bullets) return entry;
          let entryChanged = false;
          const bullets = entry.bullets.map((bullet) => {
            if (bullet.id !== action.bulletId || bullet.included === action.included) return bullet;
            changed = true;
            entryChanged = true;
            return { ...bullet, included: action.included };
          });
          return entryChanged ? { ...entry, bullets } : entry;
        });
        return changed ? { ...section, content: { ...section.content, entries } } as ResumeSection : section;
      });
    case "move-entry":
      return withUpdatedSection(document, action.sectionId, (section) => {
        if (!("entries" in section.content)) return section;
        const content = section.content as { entries: Array<{ id: string }> };
        const from = content.entries.findIndex((entry) => entry.id === action.entryId);
        const entries = moveItem(content.entries, from, action.toIndex);
        return entries === content.entries ? section : { ...section, content: { ...section.content, entries } } as ResumeSection;
      });
    case "move-bullet":
      return withUpdatedSection(document, action.sectionId, (section) => {
        if (!("entries" in section.content)) return section;
        const content = section.content as { entries: Array<{ id: string; bullets?: Bullet[] }> };
        let changed = false;
        const entries = content.entries.map((entry) => {
          if (entry.id !== action.entryId || !entry.bullets) return entry;
          const from = entry.bullets.findIndex((bullet) => bullet.id === action.bulletId);
          const bullets = moveItem(entry.bullets, from, action.toIndex);
          if (bullets === entry.bullets) return entry;
          changed = true;
          return { ...entry, bullets };
        });
        return changed ? { ...section, content: { ...section.content, entries } } as ResumeSection : section;
      });
    case "set-experience-entry":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "experience" ? { ...section, content: { entries: section.content.entries.map((entry) => entry.id === action.entryId ? action.entry : entry) } } : section);
    case "add-experience-entry":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "experience" ? { ...section, content: { entries: [...section.content.entries, action.entry] } } : section);
    case "delete-experience-entry":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "experience" ? { ...section, content: { entries: section.content.entries.filter((entry) => entry.id !== action.entryId) } } : section);
    case "set-experience-bullet":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "experience" ? { ...section, content: { entries: section.content.entries.map((entry) => entry.id === action.entryId ? { ...entry, bullets: entry.bullets.map((bullet) => bullet.id === action.bulletId ? action.bullet : bullet) } : entry) } } : section);
    case "add-experience-bullet":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "experience" ? { ...section, content: { entries: section.content.entries.map((entry) => entry.id === action.entryId ? { ...entry, bullets: [...entry.bullets, action.bullet] } : entry) } } : section);
    case "delete-experience-bullet":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "experience" ? { ...section, content: { entries: section.content.entries.map((entry) => entry.id === action.entryId ? { ...entry, bullets: entry.bullets.filter((bullet) => bullet.id !== action.bulletId) } : entry) } } : section);
    case "set-project-entry":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "projects" ? { ...section, content: { entries: section.content.entries.map((entry) => entry.id === action.entryId ? action.entry : entry) } } : section);
    case "add-project-entry":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "projects" ? { ...section, content: { entries: [...section.content.entries, action.entry] } } : section);
    case "delete-project-entry":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "projects" ? { ...section, content: { entries: section.content.entries.filter((entry) => entry.id !== action.entryId) } } : section);
    case "set-project-bullet":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "projects" ? { ...section, content: { entries: section.content.entries.map((entry) => entry.id === action.entryId ? { ...entry, bullets: entry.bullets.map((bullet) => bullet.id === action.bulletId ? action.bullet : bullet) } : entry) } } : section);
    case "add-project-bullet":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "projects" ? { ...section, content: { entries: section.content.entries.map((entry) => entry.id === action.entryId ? { ...entry, bullets: [...entry.bullets, action.bullet] } : entry) } } : section);
    case "delete-project-bullet":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "projects" ? { ...section, content: { entries: section.content.entries.map((entry) => entry.id === action.entryId ? { ...entry, bullets: entry.bullets.filter((bullet) => bullet.id !== action.bulletId) } : entry) } } : section);
    case "set-education-entry":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "education" ? { ...section, content: { entries: section.content.entries.map((entry) => entry.id === action.entryId ? action.entry : entry) } } : section);
    case "add-education-entry":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "education" ? { ...section, content: { entries: [...section.content.entries, action.entry] } } : section);
    case "delete-education-entry":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "education" ? { ...section, content: { entries: section.content.entries.filter((entry) => entry.id !== action.entryId) } } : section);
    case "set-certification-entry":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "certifications" ? { ...section, content: { entries: section.content.entries.map((entry) => entry.id === action.entryId ? action.entry : entry) } } : section);
    case "add-certification-entry":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "certifications" ? { ...section, content: { entries: [...section.content.entries, action.entry] } } : section);
    case "delete-certification-entry":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "certifications" ? { ...section, content: { entries: section.content.entries.filter((entry) => entry.id !== action.entryId) } } : section);
    case "set-skill-category":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "technicalSkills" ? { ...section, content: { categories: section.content.categories.map((category) => category.id === action.categoryId ? action.category : category) } } : section);
    case "add-skill-category":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "technicalSkills" ? { ...section, content: { categories: [...section.content.categories, action.category] } } : section);
    case "delete-skill-category":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "technicalSkills" ? { ...section, content: { categories: section.content.categories.filter((category) => category.id !== action.categoryId) } } : section);
    case "move-skill-category":
      return withUpdatedSection(document, action.sectionId, (section) => {
        if (section.type !== "technicalSkills") return section;
        const from = section.content.categories.findIndex((category) => category.id === action.categoryId);
        const categories = moveItem(section.content.categories, from, action.toIndex);
        return categories === section.content.categories ? section : { ...section, content: { categories } };
      });
    case "set-skill":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "technicalSkills" ? { ...section, content: { categories: section.content.categories.map((category) => category.id === action.categoryId ? { ...category, skills: category.skills.map((skill) => skill.id === action.skillId ? action.skill : skill) } : category) } } : section);
    case "move-skill":
      return withUpdatedSection(document, action.sectionId, (section) => {
        if (section.type !== "technicalSkills") return section;
        const categories = section.content.categories.map((category) => {
          if (category.id !== action.categoryId) return category;
          const from = category.skills.findIndex((skill) => skill.id === action.skillId);
          const skills = moveItem(category.skills, from, action.toIndex);
          return skills === category.skills ? category : { ...category, skills };
        });
        return { ...section, content: { categories } };
      });
    case "set-custom-section":
      return withUpdatedSection(document, action.sectionId, (section) => section.type === "custom" && action.section.id === action.sectionId ? action.section : section);
    case "add-custom-section":
      return { ...document, metadata: { ...document.metadata, updatedAt: new Date().toISOString() }, sections: [...document.sections, action.section] };
    case "delete-custom-section":
      return { ...document, metadata: { ...document.metadata, updatedAt: new Date().toISOString() }, sections: document.sections.filter((section) => section.id !== action.sectionId) };
  }
}
