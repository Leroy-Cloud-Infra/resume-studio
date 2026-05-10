import { sampleResume } from "@/data/sample-resume";
import { getResumeTemplate } from "@/templates/resume-templates";

export default function Home() {
const selectedTemplate = getResumeTemplate("classic");

if (!selectedTemplate) {
  return null;
}
const SelectedTemplate = selectedTemplate.component;
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
          <SelectedTemplate resume={sampleResume} />
        </section>
      </div>
    </main>
  );
}