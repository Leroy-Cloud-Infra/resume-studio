"use client";

import { useMemo, useState } from "react";

import { getResumeTemplate, type ResumeTemplateId } from "@/templates/resume-templates";
import type { Resume } from "@/types/resume";

type ResumeEditorProps = {
  initialResume: Resume;
  templateId: ResumeTemplateId;
};

function parseTextareaItems(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function ResumeEditor({ initialResume, templateId }: ResumeEditorProps) {
  const [resume, setResume] = useState<Resume>(initialResume);

  const selectedTemplate = useMemo(() => getResumeTemplate(templateId), [templateId]);

  if (!selectedTemplate) {
    return null;
  }

  const SelectedTemplate = selectedTemplate.component;

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[380px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Resume Editor
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Live resume editor
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Edit core fields on the left. The preview updates instantly on the right.
          </p>

          <div className="mt-6 space-y-5">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-700">
                Header
              </h2>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Name</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                  value={resume.header.name}
                  onChange={(event) =>
                    setResume((current) => ({
                      ...current,
                      header: { ...current.header, name: event.target.value },
                    }))
                  }
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Email</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                  value={resume.header.email}
                  onChange={(event) =>
                    setResume((current) => ({
                      ...current,
                      header: { ...current.header, email: event.target.value },
                    }))
                  }
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Phone</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                  value={resume.header.phone}
                  onChange={(event) =>
                    setResume((current) => ({
                      ...current,
                      header: { ...current.header, phone: event.target.value },
                    }))
                  }
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Location</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                  value={resume.header.location}
                  onChange={(event) =>
                    setResume((current) => ({
                      ...current,
                      header: { ...current.header, location: event.target.value },
                    }))
                  }
                />
              </label>
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-700">
                Summary
              </h2>
              <label className="mt-2 block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Text</span>
                <textarea
                  className="h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                  value={resume.summary}
                  onChange={(event) =>
                    setResume((current) => ({ ...current, summary: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-700">
                Skill Groups
              </h2>
              {resume.skills.map((group, groupIndex) => (
                <label key={group.category} className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">
                    {group.category}
                  </span>
                  <textarea
                    className="h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                    value={group.items.join("\n")}
                    onChange={(event) =>
                      setResume((current) => ({
                        ...current,
                        skills: current.skills.map((currentGroup, currentIndex) =>
                          currentIndex === groupIndex
                            ? {
                                ...currentGroup,
                                items: parseTextareaItems(event.target.value),
                              }
                            : currentGroup,
                        ),
                      }))
                    }
                  />
                </label>
              ))}
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-700">
                Experience Bullets
              </h2>
              {resume.experience.map((job, jobIndex) => (
                <label key={`${job.company}-${job.title}`} className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">
                    {job.title} - {job.company}
                  </span>
                  <textarea
                    className="h-36 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 transition focus:ring-2"
                    value={job.bullets.join("\n")}
                    onChange={(event) =>
                      setResume((current) => ({
                        ...current,
                        experience: current.experience.map((currentJob, currentIndex) =>
                          currentIndex === jobIndex
                            ? {
                                ...currentJob,
                                bullets: parseTextareaItems(event.target.value),
                              }
                            : currentJob,
                        ),
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <SelectedTemplate resume={resume} />
        </section>
      </div>
    </main>
  );
}
