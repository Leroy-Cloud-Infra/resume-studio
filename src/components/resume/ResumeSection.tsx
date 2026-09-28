export function ResumeSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="resume-section"
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        marginTop: "8pt",
      }}
    >
      <h3
        className="resume-section-heading"
        style={{
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          margin: 0,
          padding: 0,
          paddingBottom: "2pt",
          borderBottom: "0.5pt solid #000000",
          fontSize: "9.5pt",
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#111111",
          breakAfter: "avoid",
          pageBreakAfter: "avoid",
        }}
      >
        {title}
      </h3>

      <div
        className="resume-section-content"
        style={{
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          marginTop: "4pt",
          breakBefore: "avoid",
          pageBreakBefore: "avoid",
        }}
      >
        {children}
      </div>
    </section>
  );
}
