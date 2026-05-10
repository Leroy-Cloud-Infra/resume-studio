import type { ComponentType } from "react";

import { ClassicTemplate } from "@/components/resume/ClassicTemplate";
import type { Resume } from "@/types/resume";

export type ResumeTemplateId = "classic";

export type ResumeTemplateDefinition = {
  id: ResumeTemplateId;
  name: string;
  description: string;
  component: ComponentType<{ resume: Resume }>;
};

export const resumeTemplates: ResumeTemplateDefinition[] = [
  {
    id: "classic",
    name: "Classic",
    description: "A clean, traditional resume layout focused on readability.",
    component: ClassicTemplate,
  },
];

export function getResumeTemplate(templateId: ResumeTemplateId) {
  return resumeTemplates.find((template) => template.id === templateId);
}