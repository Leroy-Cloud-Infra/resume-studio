export function ResumeSection({
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