import type { Resume } from "@/types/resume";

import { ResumeSection } from "./ResumeSection";

function splitSectionLine(line: string) {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) {
    return { label: "", value: line };
  }

  return {
    label: line.slice(0, colonIndex).trim(),
    value: line.slice(colonIndex + 1).trim(),
  };
}

export function ClassicTemplate({ resume }: { resume: Resume }) {
  return (
    <article
      className="mx-auto min-h-[11in] max-w-[8.5in] bg-white px-6 py-5 text-[11px] leading-[1.18] text-slate-950"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <header className="border-b border-slate-900 pb-1 text-center">
        <h2 className="text-[22px] font-semibold tracking-normal">
          {resume.header.name}
        </h2>
        <p className="mt-[2px] text-[10.5px] leading-[1.15]">
          {[resume.header.location, resume.header.email, resume.header.phone]
            .filter(Boolean)
            .join(" | ")}
        </p>
        {resume.header.links.length > 0 ? (
          <p className="mt-[2px] text-[10.5px] leading-[1.15]">
            {resume.header.links.join(" | ")}
          </p>
        ) : null}
      </header>

      <ResumeSection title="Summary">
        <p className="max-w-[7in] text-[10.8px] leading-[1.22]">
          {resume.summary}
        </p>
      </ResumeSection>

      <ResumeSection title={resume.skillsSection.title || "Technical Skills"}>
        <div className="space-y-0">
          {resume.skillsSection.lines.map((line) => {
            const parsedLine = splitSectionLine(line);
            return (
              <p key={line} className="text-[10.8px] leading-[1.18]">
                {parsedLine.label ? (
                  <>
                    <span className="font-bold">{parsedLine.label}:</span>{" "}
                    {parsedLine.value}
                  </>
                ) : (
                  parsedLine.value
                )}
              </p>
            );
          })}
        </div>
      </ResumeSection>

      <ResumeSection title="Experience">
        {resume.experience.map((job) => (
          <div
            key={`${job.company}-${job.title}`}
            className="mt-1.5 grid grid-cols-[92px_1fr] gap-x-2"
          >
            <p className="pt-[2px] text-[10.2px] leading-[1.1] text-slate-800">
              {job.dates}
            </p>
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <h4 className="text-[11px] font-bold leading-[1.1]">
                  {job.title}
                </h4>
                {job.location ? (
                  <p className="text-[10.2px] leading-[1.1] text-slate-800">
                    {job.location}
                  </p>
                ) : null}
              </div>
              <p className="mt-[2px] text-[10.8px] font-bold uppercase tracking-[0.02em]">
                {job.company}
              </p>
              <ul className="mt-[2px] list-disc space-y-0 pl-3 text-[10.8px] leading-[1.15]">
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
            <div key={project.name} className="mt-1">
              <h4 className="text-[11px] font-bold leading-[1.1]">
                {project.name}
              </h4>
              <p className="text-[10.8px] leading-[1.15]">{project.description}</p>
              <ul className="mt-[2px] list-disc space-y-0 pl-3 text-[10.8px] leading-[1.15]">
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
            className="mt-1.5 grid grid-cols-[92px_1fr] gap-x-2"
          >
            <p className="pt-[2px] text-[10.2px] leading-[1.1] text-slate-800">
              {item.dates}
            </p>
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <p className="text-[11px] font-bold leading-[1.1]">
                  {item.school}
                </p>
                {item.location ? (
                  <p className="text-[10.2px] leading-[1.1] text-slate-800">
                    {item.location}
                  </p>
                ) : null}
              </div>
              <p className="mt-[2px] text-[10.8px] leading-[1.15]">{item.degree}</p>
              {item.coursework && item.coursework.length > 0 ? (
                <p className="mt-[2px] text-[10.2px] leading-[1.15] text-slate-800">
                  <span className="font-bold">Coursework:</span>{" "}
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
