import type { Resume } from "@/types/resume";

import { ResumeSection } from "./ResumeSection";

export function ClassicTemplate({ resume }: { resume: Resume }) {
  return (
    <article className="mx-auto min-h-[11in] max-w-[8.5in] bg-white px-8 py-7 text-[13px] leading-[1.25] text-slate-950 shadow-sm ring-1 ring-slate-200">
      <header className="border-b border-slate-900 pb-2 text-center">
        <h2 className="text-[28px] font-semibold tracking-[0.02em]">
          {resume.header.name}
        </h2>
        <p className="mt-1 text-[12px]">
          {[resume.header.location, resume.header.email, resume.header.phone]
            .filter(Boolean)
            .join(" | ")}
        </p>
        {resume.header.links.length > 0 ? (
          <p className="mt-0.5 text-[12px]">{resume.header.links.join(" | ")}</p>
        ) : null}
      </header>

      <ResumeSection title="Summary">
        <p className="max-w-[7.4in] text-[12.5px] leading-[1.3]">
          {resume.summary}
        </p>
      </ResumeSection>

      <ResumeSection title="Technical Skills">
        <div className="space-y-1">
          {resume.skills.map((group) => (
            <p key={group.category} className="text-[12.5px] leading-[1.25]">
              <span className="font-semibold">{group.category}:</span>{" "}
              {group.items.join(", ")}
            </p>
          ))}
        </div>
      </ResumeSection>

      <ResumeSection title="Experience">
        {resume.experience.map((job) => (
          <div key={`${job.company}-${job.title}`} className="mt-2.5 grid grid-cols-[110px_1fr] gap-x-3">
            <p className="pt-0.5 text-[12px] leading-[1.2] text-slate-700">
              {job.dates}
            </p>
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <h4 className="text-[13px] font-semibold leading-[1.2]">
                  {job.title}
                </h4>
                {job.location ? (
                  <p className="text-[12px] leading-[1.2] text-slate-700">
                    {job.location}
                  </p>
                ) : null}
              </div>
              <p className="mt-0.5 text-[12.5px] font-medium uppercase tracking-[0.02em]">
                {job.company}
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px] leading-[1.25]">
                {job.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </ResumeSection>

      {resume.projects.length > 0 ? (
        <ResumeSection title="Projects">
          {resume.projects.map((project) => (
            <div key={project.name} className="mt-2">
              <h4 className="text-[13px] font-semibold">{project.name}</h4>
              <p className="text-[12.5px] leading-[1.25]">{project.description}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px] leading-[1.25]">
                {project.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </ResumeSection>
      ) : null}

      <ResumeSection title="Education">
        {resume.education.map((item) => (
          <div
            key={`${item.school}-${item.degree}`}
            className="mt-2.5 grid grid-cols-[110px_1fr] gap-x-3"
          >
            <p className="pt-0.5 text-[12px] leading-[1.2] text-slate-700">
              {item.dates}
            </p>
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <p className="text-[13px] font-semibold leading-[1.2]">
                  {item.school}
                </p>
                {item.location ? (
                  <p className="text-[12px] leading-[1.2] text-slate-700">
                    {item.location}
                  </p>
                ) : null}
              </div>
              <p className="mt-0.5 text-[12.5px] leading-[1.25]">{item.degree}</p>
              {item.coursework && item.coursework.length > 0 ? (
                <p className="mt-0.5 text-[12px] leading-[1.25] text-slate-700">
                  <span className="font-semibold">Coursework:</span>{" "}
                  {item.coursework.join(", ")}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </ResumeSection>
    </article>
  );
}
