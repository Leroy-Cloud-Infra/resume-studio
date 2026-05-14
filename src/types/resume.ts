export type Resume = {
  title: string;
  header: ResumeHeader;
  summary: string;
  technicalSkills: ResumeSkillsSection;
  experience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  projects: ResumeProjectItem[];
  customSections: ResumeCustomSection[];
};

export type ResumeHeader = {
  name: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
};

export type ResumeExperienceItem = {
  company: string;
  title: string;
  location: string;
  dateRange: ResumeDateRange;
  bullets: string[];
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
  label: string;
  value: string;
};

export type ResumeSkillsSection = {
  title: string;
  categories: ResumeSkillCategory[];
};

export type ResumeCustomSection = {
  id: string;
  title: string;
  lines: string[];
};

export type ResumeProjectItem = {
  name: string;
  description: string;
  bullets: string[];
};

export type ResumeEducationItem = {
  school: string;
  degree: string;
  dateRange: ResumeDateRange;
  location?: string;
  coursework?: string[];
};
