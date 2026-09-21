export type Resume = {
  title: string;
  header: ResumeHeader;
  summary: string;
  technicalSkills: ResumeSkillsSection;
  experience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  projects: ResumeProjectItem[];
  customSections: ResumeCustomSection[];
  /** Compatibility-only canonical document retained by the Phase 1A adapter. */
  __v4Document?: ResumeDocument;
  /** Compatibility-only section inclusion map used by the current renderer adapter. */
  __includedSections?: Partial<Record<ResumeSection["type"], boolean>>;
};

export type ResumeHeader = {
  name: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
};

export type ResumeExperienceItem = {
  id?: string;
  included?: boolean;
  company: string;
  title: string;
  location: string;
  dateRange: ResumeDateRange;
  bullets: string[];
  bulletIds?: string[];
};

export type ResumeDateRange = {
  startMonth: string;
  startYear: string;
  endMonth?: string;
  endYear?: string;
  current?: boolean;
};

export type ResumeSkillCategory = {
  id: string;
  included?: boolean;
  label: string;
  value: string;
  skillIds?: string[];
};

export type ResumeSkillsSection = {
  title: string;
  categories: ResumeSkillCategory[];
};

export type ResumeCustomSection = {
  id: string;
  included?: boolean;
  title: string;
  lines: string[];
};

export type ResumeProjectItem = {
  id?: string;
  included?: boolean;
  name: string;
  description: string;
  date?: string;
  technologies?: string;
  url?: string;
  bullets: string[];
  bulletIds?: string[];
};

export type ResumeEducationItem = {
  id?: string;
  included?: boolean;
  school: string;
  degree: string;
  dateRange: ResumeDateRange;
  location?: string;
  expectedGraduation?: boolean;
  gpa?: string;
  details?: string;
  coursework?: string[];
};

export type Bullet = {
  id: string;
  text: string;
  included: boolean;
};

export type ExperienceEntry = {
  id: string;
  included: boolean;
  company: string;
  title: string;
  location: string;
  dateRange: ResumeDateRange;
  bullets: Bullet[];
};

export type ProjectEntry = {
  id: string;
  included: boolean;
  name: string;
  description?: string;
  date?: string;
  technologies?: string;
  url?: string;
  bullets: Bullet[];
};

export type Skill = {
  id: string;
  included: boolean;
  name: string;
};

export type SkillCategory = {
  id: string;
  included: boolean;
  label: string;
  skills: Skill[];
};

export type EducationEntry = {
  id: string;
  included: boolean;
  school: string;
  degree: string;
  location?: string;
  dateRange: ResumeDateRange;
  expectedGraduation?: boolean;
  gpa?: string;
  details?: string;
  coursework?: string[];
};

export type CertificationEntry = {
  id: string;
  included: boolean;
  name: string;
  issuer?: string;
  date?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
};

export type SummarySection = {
  id: string;
  type: "summary";
  included: boolean;
  content: { text: string };
};

export type ExperienceSection = {
  id: string;
  type: "experience";
  included: boolean;
  content: { entries: ExperienceEntry[] };
};

export type ProjectsSection = {
  id: string;
  type: "projects";
  included: boolean;
  content: { entries: ProjectEntry[] };
};

export type TechnicalSkillsSection = {
  id: string;
  type: "technicalSkills";
  included: boolean;
  content: { categories: SkillCategory[] };
};

export type EducationSection = {
  id: string;
  type: "education";
  included: boolean;
  content: { entries: EducationEntry[] };
};

export type CertificationsSection = {
  id: string;
  type: "certifications";
  included: boolean;
  content: { entries: CertificationEntry[] };
};

export type CustomSection = {
  id: string;
  type: "custom";
  included: boolean;
  content: { title: string; lines: string[] };
};

export type ResumeSection =
  | SummarySection
  | ExperienceSection
  | ProjectsSection
  | TechnicalSkillsSection
  | EducationSection
  | CertificationsSection
  | CustomSection;

export type ResumeDocument = {
  schemaVersion: 4;
  id: string;
  metadata: {
    title: string;
    templateId: string;
    createdAt: string;
    updatedAt: string;
  };
  header: ResumeHeader;
  sections: ResumeSection[];
};

export type ResumeLibrary = {
  schemaVersion: 4;
  activeResumeId: string;
  resumes: ResumeDocument[];
};
