export function ResumeSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-2">
      <h3 className="border-t-2 border-slate-900 pt-[2px] text-[10px] font-bold uppercase tracking-[0.05em] text-slate-900">
        {title}
      </h3>

      <div className="mt-[3px]">{children}</div>
    </section>
  );
}
