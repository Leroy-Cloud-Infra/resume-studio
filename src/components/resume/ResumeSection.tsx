export function ResumeSection({
  title,
  children,
  showTopRule = true,
  headingTopPadding = "var(--rs-section-label-top-padding)",
}: {
  title: string;
  children: React.ReactNode;
  showTopRule?: boolean;
  headingTopPadding?: string;
}) {
  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: "9pt",
    fontWeight: 600,
    lineHeight: 1.05,
    borderTopWidth: showTopRule ? "0.5pt" : undefined,
    paddingTop: headingTopPadding,
    width: "var(--rs-section-divider-width)",
    maxWidth: "var(--rs-section-divider-width)",
    boxSizing: "border-box",
  };

  return (
    <section
      className={`resume-section ${showTopRule ? "mt-[6pt]" : "mt-[0pt]"}`}
      style={{
        width: "var(--rs-section-divider-width)",
        maxWidth: "var(--rs-section-divider-width)",
        boxSizing: "border-box",
      }}
    >
      <h3
        className={`${showTopRule ? "border-t border-black" : ""} font-semibold uppercase tracking-[0.04em] text-black`}
        style={sectionHeadingStyle}
      >
        {title}
      </h3>

      <div
        className="mt-[2pt]"
        style={{
          width: "var(--rs-section-divider-width)",
          maxWidth: "var(--rs-section-divider-width)",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </section>
  );
}
