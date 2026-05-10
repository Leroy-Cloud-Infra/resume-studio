export function ResumeSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-3">
      <h3 className="border-t-2 border-slate-900 pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-900">
        {title}
      </h3>

      <div className="mt-1.5">{children}</div>
    </section>
  );
}
