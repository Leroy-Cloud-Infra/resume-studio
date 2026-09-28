import type {
  ResumeDocument,
  Bullet,
  ExperienceEntry,
  EducationEntry,
  ProjectEntry,
  SkillCategory,
  ResumeSection as ResumeSectionModel,
} from "@/types/resume";
import type { CSSProperties } from "react";

import { ResumeSection } from "./ResumeSection";
import {
  getIncludedBullets,
  getIncludedEducationEntries,
  getIncludedExperienceEntries,
  getIncludedSections,
  getIncludedSkillCategories,
  getEducationIdentityParts,
  getProjectSupportingMetadataParts,
} from "@/lib/resume-rendering";
import { formatClassicDateRange } from "@/lib/classic-formatting";

const DOC_TOKENS = {
  fontFamily: "'Times New Roman', Times, serif",
  nameSize: "15.5pt",
  contactSize: "9.3pt",
  sectionLabelSize: "9.5pt",
  bodySize: "9.5pt",
  jobTitleSize: "10.2pt",
  metadataSize: "9.3pt",
  bulletSize: "9.5pt",
  skillLabelWeight: 700,
} as const;

const CLASSIC_LAYOUT = {
  pageWidth: "612pt",
  pageTopMargin: "22.32pt",
  pageBottomMargin: "13.68pt",
  pageLeftMargin: "44pt",
  pageRightMargin: "44pt",
  contentWidth: "524pt",
  sectionGap: "8pt",
  sectionRule: "0.5pt",
  sectionRuleToContentGap: "4pt",
  entryGap: "5.5pt",
  bodyLeading: 1.18,
  metadataLeading: 1.1,
  titleLeading: 1.16,
  bulletIndent: "11pt",
  bulletGap: "1.2pt",
  firstBulletGap: "1.5pt",
  paragraphGap: "2pt",
  skillsCategoryGap: "3pt",
  headerToSectionsGap: "8pt",
  headerNameContactGap: "4.5pt",
} as const;

const fullWidthStyle: CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const entryHeaderStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  columnGap: "8pt",
  alignItems: "baseline",
  breakAfter: "avoid",
  pageBreakAfter: "avoid",
  ...fullWidthStyle,
};

const identityStyle: CSSProperties = {
  minWidth: 0,
  margin: 0,
  fontSize: DOC_TOKENS.jobTitleSize,
  lineHeight: CLASSIC_LAYOUT.titleLeading,
  fontWeight: 400,
  color: "#111111",
  overflowWrap: "break-word",
  wordBreak: "normal",
  breakAfter: "avoid",
  pageBreakAfter: "avoid",
};

const dateStyle: CSSProperties = {
  margin: 0,
  fontSize: DOC_TOKENS.metadataSize,
  lineHeight: CLASSIC_LAYOUT.metadataLeading,
  fontWeight: 400,
  color: "#111111",
  textAlign: "right",
  whiteSpace: "nowrap",
};

const bodyTextStyle: CSSProperties = {
  margin: 0,
  fontSize: DOC_TOKENS.bodySize,
  lineHeight: CLASSIC_LAYOUT.bodyLeading,
  fontWeight: 400,
  color: "#111111",
  overflowWrap: "break-word",
  wordBreak: "normal",
};

const secondaryTextStyle: CSSProperties = {
  ...bodyTextStyle,
  fontSize: DOC_TOKENS.metadataSize,
  lineHeight: CLASSIC_LAYOUT.metadataLeading,
};

function hasText(value: string | undefined) {
  return Boolean(value?.trim());
}

function getRenderableBullets(bullets: Bullet[]) {
  return getIncludedBullets(bullets).filter((bullet) => hasText(bullet.text));
}

function BulletList({ bullets }: { bullets: Bullet[] }) {
  const renderableBullets = getRenderableBullets(bullets);
  if (renderableBullets.length === 0) return null;

  return (
    <ul
      className="resume-row-bullets list-disc"
      style={{
        ...fullWidthStyle,
        marginTop: CLASSIC_LAYOUT.firstBulletGap,
        marginBottom: 0,
        paddingLeft: CLASSIC_LAYOUT.bulletIndent,
        paddingRight: 0,
        listStylePosition: "outside",
        listStyleType: "disc",
        fontSize: DOC_TOKENS.bulletSize,
        lineHeight: CLASSIC_LAYOUT.bodyLeading,
        fontWeight: 400,
        color: "#111111",
        overflowWrap: "break-word",
        wordBreak: "normal",
        breakBefore: "avoid",
        pageBreakBefore: "avoid",
      }}
    >
      {renderableBullets.map((bullet, index) => (
        <li
          key={bullet.id}
          style={{
            display: "list-item",
            marginBottom: index === renderableBullets.length - 1 ? 0 : CLASSIC_LAYOUT.bulletGap,
            breakInside: "avoid",
            pageBreakInside: "avoid",
          }}
        >
          {bullet.text}
        </li>
      ))}
    </ul>
  );
}

function InlineSkillSection({ categories }: { categories: SkillCategory[] }) {
  const renderableCategories = getIncludedSkillCategories(categories)
    .map((category) => ({ ...category, skills: category.skills.filter((skill) => hasText(skill.name)) }))
    .filter((category) => category.skills.length > 0);

  if (renderableCategories.length === 0) return null;

  return (
    <ResumeSection title="Technical Skills">
      <div className="resume-skills-content" style={fullWidthStyle}>
        {renderableCategories.map((category, index) => (
          <p
            key={category.id}
            className="resume-skill-line"
            style={{
              ...bodyTextStyle,
              marginBottom: index === renderableCategories.length - 1 ? 0 : CLASSIC_LAYOUT.skillsCategoryGap,
            }}
          >
            <span className="resume-skill-label" style={{ fontWeight: DOC_TOKENS.skillLabelWeight }}>
              {category.label}:
            </span>{" "}
            <span className="resume-skill-value" style={{ fontWeight: 400 }}>
              {category.skills.map((skill) => skill.name).join(", ")}
            </span>
          </p>
        ))}
      </div>
    </ResumeSection>
  );
}

function ExperienceRow({ item }: { item: ExperienceEntry }) {
  const hasTitle = hasText(item.title);
  const hasCompany = hasText(item.company);
  const hasLocation = hasText(item.location);

  return (
    <article className="resume-row" style={{ marginTop: CLASSIC_LAYOUT.entryGap }}>
      <div className="resume-entry-header" style={entryHeaderStyle}>
        <h4 className="resume-entry-identity" style={identityStyle}>
          {hasTitle ? <strong style={{ fontWeight: 700 }}>{item.title}</strong> : null}
          {hasTitle && hasCompany ? ", " : null}
          {hasCompany ? item.company : null}
          {(hasTitle || hasCompany) && hasLocation ? " — " : null}
          {hasLocation ? item.location : null}
        </h4>
        <p className="resume-row-date" style={dateStyle}>{formatClassicDateRange(item.dateRange)}</p>
      </div>
      <BulletList bullets={item.bullets} />
    </article>
  );
}

function EducationRow({ item }: { item: EducationEntry }) {
  const identity = getEducationIdentityParts(item);
  const location = hasText(item.location) ? item.location : "";

  return (
    <article className="resume-row" style={{ marginTop: CLASSIC_LAYOUT.entryGap }}>
      <div className="resume-entry-header" style={entryHeaderStyle}>
        <p className="resume-entry-identity" style={identityStyle}>
          {hasText(identity.degree) ? <strong style={{ fontWeight: 700 }}>{identity.degree}</strong> : null}
          {identity.showSeparator ? ", " : null}
          {hasText(identity.school) ? identity.school : null}
        </p>
        <p className="resume-row-date" style={dateStyle}>{formatClassicDateRange(item.dateRange)}</p>
      </div>
      {location ? <p className="resume-entry-secondary" style={{ ...secondaryTextStyle, marginTop: "1pt", breakBefore: "avoid", pageBreakBefore: "avoid" }}>{location}</p> : null}
      {item.coursework && item.coursework.some(hasText) ? (
        <p className="resume-row-coursework" style={{ ...bodyTextStyle, marginTop: "3pt", breakBefore: "avoid", pageBreakBefore: "avoid" }}>
          <strong>Relevant Coursework:</strong> {item.coursework.filter(hasText).join(", ")}
        </p>
      ) : null}
    </article>
  );
}

function SummarySection({ section }: { section: Extract<ResumeSectionModel, { type: "summary" }> }) {
  if (!hasText(section.content.text)) return null;
  return <ResumeSection title="Summary"><p className="resume-summary-content" style={bodyTextStyle}>{section.content.text}</p></ResumeSection>;
}

function ExperienceSection({ section }: { section: Extract<ResumeSectionModel, { type: "experience" }> }) {
  const entries = getIncludedExperienceEntries(section.content.entries).filter((entry) => hasText(entry.company) || hasText(entry.title) || hasText(entry.location) || getRenderableBullets(entry.bullets).length > 0);
  if (entries.length === 0) return null;
  return <ResumeSection title="Work Experience">{entries.map((entry) => <ExperienceRow key={entry.id} item={entry} />)}</ResumeSection>;
}

function ProjectRow({ project }: { project: ProjectEntry }) {
  const bullets = getRenderableBullets(project.bullets);
  const supportingMetadata = getProjectSupportingMetadataParts(project);
  const date = hasText(project.date) ? project.date : "";

  return (
    <article className="resume-row" style={{ marginTop: CLASSIC_LAYOUT.entryGap }}>
      <div className="resume-entry-header" style={entryHeaderStyle}>
        <h4 className="resume-entry-identity" style={{ ...identityStyle, fontWeight: 700 }}>
          {hasText(project.name) ? project.name : ""}
        </h4>
        {date ? <p className="resume-row-date" style={dateStyle}>{date}</p> : null}
      </div>
      {supportingMetadata.length > 0 ? (
        <p className="resume-project-metadata" style={{ ...secondaryTextStyle, marginTop: "1pt", breakBefore: "avoid", pageBreakBefore: "avoid" }}>
          {supportingMetadata.join(" · ")}
        </p>
      ) : null}
      {hasText(project.description) ? (
        <p className="resume-project-description" style={{ ...bodyTextStyle, marginTop: "3pt", breakBefore: "avoid", pageBreakBefore: "avoid" }}>
          {project.description}
        </p>
      ) : null}
      <BulletList bullets={bullets} />
    </article>
  );
}

function ProjectsSection({ section }: { section: Extract<ResumeSectionModel, { type: "projects" }> }) {
  const entries = section.content.entries.filter((entry) => entry.included && (hasText(entry.name) || hasText(entry.description) || hasText(entry.date) || hasText(entry.technologies) || hasText(entry.url) || getRenderableBullets(entry.bullets).length > 0));
  if (entries.length === 0) return null;
  return <ResumeSection title="Projects">{entries.map((project) => <ProjectRow key={project.id} project={project} />)}</ResumeSection>;
}

function EducationSection({ section }: { section: Extract<ResumeSectionModel, { type: "education" }> }) {
  const entries = getIncludedEducationEntries(section.content.entries).filter((entry) => hasText(entry.school) || hasText(entry.degree) || hasText(entry.location) || Boolean(entry.coursework?.some(hasText)));
  if (entries.length === 0) return null;
  return <ResumeSection title="Education">{entries.map((entry) => <EducationRow key={entry.id} item={entry} />)}</ResumeSection>;
}

function CertificationsSection({ section }: { section: Extract<ResumeSectionModel, { type: "certifications" }> }) {
  const entries = section.content.entries.filter((entry) => entry.included && [entry.name, entry.issuer, entry.date, entry.expirationDate, entry.credentialId, entry.credentialUrl].some(hasText));
  if (entries.length === 0) return null;
  return (
    <ResumeSection title="Certifications">
      {entries.map((entry) => {
        const metadata = [entry.issuer, entry.expirationDate, entry.credentialId, entry.credentialUrl].filter(hasText);
        return (
          <article key={entry.id} className="resume-row" style={{ marginTop: CLASSIC_LAYOUT.entryGap }}>
            <div className="resume-entry-header" style={entryHeaderStyle}>
              <h4 className="resume-entry-identity" style={{ ...identityStyle, fontWeight: 700 }}>{entry.name}</h4>
              {hasText(entry.date) ? <p className="resume-row-date" style={dateStyle}>{entry.date}</p> : null}
            </div>
            {metadata.length > 0 ? <p className="resume-entry-secondary" style={{ ...secondaryTextStyle, marginTop: "1pt", breakBefore: "avoid", pageBreakBefore: "avoid" }}>{metadata.join(" · ")}</p> : null}
          </article>
        );
      })}
    </ResumeSection>
  );
}

function CustomSectionRenderer({ section }: { section: Extract<ResumeSectionModel, { type: "custom" }> }) {
  const lines = section.content.lines.filter(hasText);
  if (lines.length === 0 || !hasText(section.content.title)) return null;
  return (
    <ResumeSection title={section.content.title}>
      {lines.map((line, index) => <p key={`${section.id}-${index}`} style={{ ...bodyTextStyle, marginBottom: index === lines.length - 1 ? 0 : CLASSIC_LAYOUT.paragraphGap }}>{line}</p>)}
    </ResumeSection>
  );
}

function renderSection(section: ResumeSectionModel) {
  if (!section.included) return null;
  switch (section.type) {
    case "summary": return <SummarySection key={section.id} section={section} />;
    case "experience": return <ExperienceSection key={section.id} section={section} />;
    case "projects": return <ProjectsSection key={section.id} section={section} />;
    case "technicalSkills": return <InlineSkillSection key={section.id} categories={section.content.categories} />;
    case "education": return <EducationSection key={section.id} section={section} />;
    case "certifications": return <CertificationsSection key={section.id} section={section} />;
    case "custom": return <CustomSectionRenderer key={section.id} section={section} />;
  }
}

export function ClassicTemplate({ document }: { document: ResumeDocument }) {
  const documentStyle: CSSProperties = {
    fontFamily: DOC_TOKENS.fontFamily,
    fontSize: DOC_TOKENS.bodySize,
    lineHeight: CLASSIC_LAYOUT.bodyLeading,
    width: CLASSIC_LAYOUT.pageWidth,
    maxWidth: CLASSIC_LAYOUT.pageWidth,
    boxSizing: "border-box",
    paddingTop: CLASSIC_LAYOUT.pageTopMargin,
    paddingBottom: CLASSIC_LAYOUT.pageBottomMargin,
    paddingLeft: CLASSIC_LAYOUT.pageLeftMargin,
    paddingRight: CLASSIC_LAYOUT.pageRightMargin,
  };

  return (
    <article className="resume-document mx-auto w-full max-w-[8.5in] bg-white text-black" style={documentStyle}>
      <header
        className="resume-document-header text-center"
        style={{
          paddingBottom: CLASSIC_LAYOUT.headerToSectionsGap,
          breakInside: "avoid",
          pageBreakInside: "avoid",
          breakAfter: "avoid",
          pageBreakAfter: "avoid",
        }}
      >
        <h2 style={{ fontSize: DOC_TOKENS.nameSize, fontWeight: 700, lineHeight: 1 }}>
          {document.header.name}
        </h2>
        <p style={{ ...secondaryTextStyle, marginTop: CLASSIC_LAYOUT.headerNameContactGap, textAlign: "center" }}>
          {[document.header.location, document.header.email, document.header.phone].filter(Boolean).join(" | ")}
        </p>
        {document.header.links.length > 0 ? (
          <p style={{ ...secondaryTextStyle, marginTop: CLASSIC_LAYOUT.headerNameContactGap, textAlign: "center" }}>
            {document.header.links.join(" | ")}
          </p>
        ) : null}
      </header>

      {getIncludedSections(document).map(renderSection)}
    </article>
  );
}
