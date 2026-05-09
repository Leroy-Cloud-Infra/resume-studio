import { ResumeSection } from "./ResumeSection";

type Resume = {
  title: string;
  header: {
    name: string;
    email: string;
    phone: string;
    location: string;
    links: string[];
  };
  summary: string;
  skills: string[];
  experience: {
    company: string;
    title: string;
    location: string;
    dates: string;
    bullets: string[];
  }[];
  projects: {
    name: string;
    description: string;
    bullets: string[];
  }[];
  education: {
    school: string;
    degree: string;
    dates: string;
  }[];
};

export function ResumeTemplate({ resume }: { resume: Resume }) {
  return (
    <article className="mx-auto min-h-[11in] max-w-[8.5in] bg-white p-10 shadow-sm ring-1 ring-slate-200">
      <header className="border-b border-slate-300 pb-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          {resume.header.name}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {resume.header.location} · {resume.header.email} ·{" "}
          {resume.header.phone}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {resume.header.links.join(" · ")}
        </p>
      </header>

      <ResumeSection title="Summary">
        <p className="text-sm leading-6">{resume.summary}</p>
      </ResumeSection>

      <ResumeSection title="Skills">
        <p className="text-sm leading-6">{resume.skills.join(" · ")}</p>
      </ResumeSection>

      <ResumeSection title="Experience">
        {resume.experience.map((job) => (
          <div key={`${job.company}-${job.title}`} className="mt-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-semibold">{job.title}</h4>
              <p className="text-sm text-slate-600">{job.dates}</p>
            </div>
            <p className="text-sm italic text-slate-700">
              {job.company} · {job.location}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
              {job.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </ResumeSection>

      <ResumeSection title="Projects">
        {resume.projects.map((project) => (
          <div key={project.name} className="mt-3">
            <h4 className="font-semibold">{project.name}</h4>
            <p className="text-sm leading-6 text-slate-700">
              {project.description}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
              {project.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </ResumeSection>

      <ResumeSection title="Education">
        {resume.education.map((item) => (
          <div
            key={`${item.school}-${item.degree}`}
            className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-sm"
          >
            <p>
              <span className="font-semibold">{item.school}</span> ·{" "}
              {item.degree}
            </p>
            <p className="text-slate-600">{item.dates}</p>
          </div>
        ))}
      </ResumeSection>
    </article>
  );
}