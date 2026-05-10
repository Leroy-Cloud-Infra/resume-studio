export type Resume = {
  title: string;
  header: ResumeHeader;
  summary: string;
  skills: ResumeSkillGroup[];
  experience: ResumeExperienceItem[];
  projects: ResumeProjectItem[];
  education: ResumeEducationItem[];
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
  dates: string;
  bullets: string[];
};

export type ResumeSkillGroup = {
  category: string;
  items: string[];
};

export type ResumeProjectItem = {
  name: string;
  description: string;
  bullets: string[];
};

export type ResumeEducationItem = {
  school: string;
  degree: string;
  dates: string;
  location?: string;
  coursework?: string[];
};
