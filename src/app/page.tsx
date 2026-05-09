const sampleResume = {
  title: "Software Engineering Resume",
  header: {
    name: "Cesar Hernandez",
    email: "cesar@example.com",
    phone: "(555) 555-5555",
    location: "Portland, OR",
    links: ["github.com/cesar", "linkedin.com/in/cesar"],
  },
  summary:
    "Computer science student and emerging software developer with experience building self hosted tools, support workflows, and structured technical projects. Focused on practical systems, clean documentation, and reliable user centered software.",
  skills: [
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "Docker",
    "Linux",
    "Git",
    "Technical Support",
    "Documentation",
  ],
  experience: [
    {
      company: "Boes Media & Marketing Lab",
      title: "Help Desk and Systems Simulation Builder",
      location: "Self Hosted Lab",
      dates: "2025 to Present",
      bullets: [
        "Built and documented simulated help desk workflows for ticket intake, triage, escalation, and knowledge base improvement.",
        "Designed structured support scenarios to practice troubleshooting, user communication, and technical documentation.",
        "Maintained self hosted services using Docker, Linux, and internal project documentation.",
      ],
    },
  ],
  projects: [
    {
      name: "Resume Studio",
      description:
        "Open source, self hosted resume editing and formatting tool focused on structured templates and PDF export.",
      bullets: [
        "Defined product, technical, roadmap, schema, and architecture documentation before implementation.",
        "Established a local first architecture focused on privacy, controlled rendering, and maintainable resume templates.",
      ],
    },
  ],
  education: [
    {
      school: "Western Governors University",
      degree: "B.S. Computer Science",
      dates: "In Progress",
    },
  ],
};

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Resume Studio
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Structured resume preview
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Phase 1 starts with static resume data rendered through one controlled
            template. This proves the core rendering path before adding forms,
            persistence, or PDF export.
          </p>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Current slice</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Static resume data object</li>
              <li>Single template renderer</li>
              <li>Homepage preview</li>
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <article className="mx-auto min-h-[11in] max-w-[8.5in] bg-white p-10 shadow-sm ring-1 ring-slate-200">
            <header className="border-b border-slate-300 pb-4 text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                {sampleResume.header.name}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {sampleResume.header.location} · {sampleResume.header.email} ·{" "}
                {sampleResume.header.phone}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {sampleResume.header.links.join(" · ")}
              </p>
            </header>

            <ResumeSection title="Summary">
              <p className="text-sm leading-6">{sampleResume.summary}</p>
            </ResumeSection>

            <ResumeSection title="Skills">
              <p className="text-sm leading-6">{sampleResume.skills.join(" · ")}</p>
            </ResumeSection>

            <ResumeSection title="Experience">
              {sampleResume.experience.map((job) => (
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
              {sampleResume.projects.map((project) => (
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
              {sampleResume.education.map((item) => (
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
        </section>
      </div>
    </main>
  );
}

function ResumeSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h3 className="border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-[0.16em] text-slate-700">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}