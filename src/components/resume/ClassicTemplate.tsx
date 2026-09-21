import type {
  ResumeDateRange,
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
  getIncludedSectionRenderPlan,
  getIncludedSkillCategories,
  getCertificationMetadataParts,
  getEducationIdentityParts,
  getProjectSupportingMetadataParts,
} from "@/lib/resume-rendering";

function formatDateRange(dateRange: ResumeDateRange) {
  const start = `${dateRange.startMonth} ${dateRange.startYear}`.trim();
  const end = dateRange.current
    ? "Present"
    : `${dateRange.endMonth ?? ""} ${dateRange.endYear ?? ""}`.trim();

  return `${start} — ${end}`.replace(/\s([—-])\s/g, "\u00A0$1\u00A0");
}

const DOC_TOKENS = {
  fontFamily: "'Times New Roman', Times, serif",
  nameSize: "15.5pt",
  contactSize: "9.3pt",
  sectionLabelSize: "9pt",
  bodySize: "9.5pt",
  summarySize: "9.5pt",
  jobTitleSize: "10.3pt",
  companySize: "9.8pt",
  bulletSize: "9.5pt",
  skillSize: "9.4pt",
  courseworkSize: "9.3pt",
  dateSize: "9pt",
  locationSize: "9pt",
  skillLabelWeight: 600,
} as const;

const CLASSIC_OUTER_RAIL = "535.68pt";
const CLASSIC_INNER_FLOW_RAIL = "522pt";
const CLASSIC_DATE_COLUMN_WIDTH = "84pt";
const CLASSIC_LOCATION_COLUMN_WIDTH = "98pt";
const CLASSIC_ROW_GAP = "11pt";
const CLASSIC_DOUBLE_ROW_GAP = "22pt";
const CLASSIC_CONTENT_RAIL_INSET = "3.5pt";
const CLASSIC_BULLET_LEFT_OFFSET = "4pt";
const CLASSIC_SUMMARY_COLUMN_GAP = "17pt";
const CLASSIC_SECTION_LABEL_TOP_PADDING = "3.5pt";

export const CLASSIC_RESUME_LAYOUT = {
  pageWidth: "612pt",
  pageTopMargin: "22.32pt",
  pageBottomMargin: "13.68pt",
  pageLeftMargin: "41.04pt",
  pageRightMargin: "35.28pt",
  outerRail: CLASSIC_OUTER_RAIL,
  sectionRightEdge: CLASSIC_OUTER_RAIL,
  sectionDividerWidth: CLASSIC_OUTER_RAIL,
  locationRail: CLASSIC_OUTER_RAIL,
  innerFlowRail: CLASSIC_INNER_FLOW_RAIL,
  flowTextRail: CLASSIC_INNER_FLOW_RAIL,
  dateColumnWidth: CLASSIC_DATE_COLUMN_WIDTH,
  locationColumnWidth: CLASSIC_LOCATION_COLUMN_WIDTH,
  contentColumnWidth: `calc(${CLASSIC_OUTER_RAIL} - ${CLASSIC_DATE_COLUMN_WIDTH} - ${CLASSIC_LOCATION_COLUMN_WIDTH} - ${CLASSIC_DOUBLE_ROW_GAP})`,
  rowGap: CLASSIC_ROW_GAP,
  contentRailInset: CLASSIC_CONTENT_RAIL_INSET,
  contentStartRail: `calc(${CLASSIC_DATE_COLUMN_WIDTH} + ${CLASSIC_ROW_GAP} + ${CLASSIC_CONTENT_RAIL_INSET})`,
  flowTextWidthFromContent: `calc(${CLASSIC_INNER_FLOW_RAIL} - ${CLASSIC_DATE_COLUMN_WIDTH} - ${CLASSIC_ROW_GAP} - ${CLASSIC_CONTENT_RAIL_INSET})`,
  bulletLeftRail: `calc(${CLASSIC_DATE_COLUMN_WIDTH} + ${CLASSIC_ROW_GAP} + ${CLASSIC_BULLET_LEFT_OFFSET})`,
  flowTextWidthFromBullet: `calc(${CLASSIC_INNER_FLOW_RAIL} - ${CLASSIC_DATE_COLUMN_WIDTH} - ${CLASSIC_ROW_GAP} - ${CLASSIC_BULLET_LEFT_OFFSET})`,
  bulletIndent: "8pt",
  paragraphAfter: "2pt",
  skillRowGap: "4pt",
  sectionLabelTopPadding: CLASSIC_SECTION_LABEL_TOP_PADDING,
  summaryTopMargin: "2pt",
  summaryColumnGap: CLASSIC_SUMMARY_COLUMN_GAP,
  summaryTextWidth: `calc(${CLASSIC_INNER_FLOW_RAIL} - ${CLASSIC_DATE_COLUMN_WIDTH} - ${CLASSIC_SUMMARY_COLUMN_GAP})`,
  summaryBlockSeparationFromHeaderRule: "0pt",
  summaryToWorkExperienceGap: "3pt",
} as const;

const DOC_LAYOUT = CLASSIC_RESUME_LAYOUT;

const HEADER_LAYOUT = {
  headerClusterOffset: "-2.5pt",
  nameToContactGap: "4.5pt",
  contactToRuleGap: "6.5pt",
  ruleToSummaryGap: "0pt",
  nameLineHeight: 1,
  contactLineHeight: 1,
} as const;

const summaryTextStyle: CSSProperties = {
  fontSize: DOC_TOKENS.summarySize,
  lineHeight: 1.17,
  fontWeight: 400,
  marginTop: DOC_LAYOUT.summaryTopMargin,
  marginBottom: "2pt",
  marginLeft: 0,
  marginRight: 0,
  textIndent: 0,
  paddingLeft: "5pt",
  paddingRight: 0,
  width: DOC_LAYOUT.summaryTextWidth,
  maxWidth: DOC_LAYOUT.summaryTextWidth,
  boxSizing: "border-box",
  overflowWrap: "break-word",
  wordBreak: "normal",
  color: "#111111",
};

const skillsLineStyle: CSSProperties = {
  fontSize: DOC_TOKENS.skillSize,
  lineHeight: 1.1,
  margin: 0,
  color: "#111111",
  fontWeight: 400,
};

const rowHeadStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: `${DOC_LAYOUT.dateColumnWidth} ${DOC_LAYOUT.contentColumnWidth} ${DOC_LAYOUT.locationColumnWidth}`,
  columnGap: DOC_LAYOUT.rowGap,
  width: DOC_LAYOUT.locationRail,
  maxWidth: DOC_LAYOUT.locationRail,
  boxSizing: "border-box",
  alignItems: "baseline",
};

const flowContentStyle: CSSProperties = {
  marginLeft: DOC_LAYOUT.contentStartRail,
  width: DOC_LAYOUT.flowTextWidthFromContent,
  maxWidth: DOC_LAYOUT.flowTextWidthFromContent,
  boxSizing: "border-box",
  overflowWrap: "break-word",
  wordBreak: "normal",
};

const locationTextStyle: CSSProperties = {
  fontSize: DOC_TOKENS.locationSize,
  lineHeight: 1.12,
  paddingLeft: "2pt",
  paddingRight: 0,
  textAlign: "right",
  whiteSpace: "nowrap",
  color: "#111111",
};

function getRenderableBullets(bullets: Bullet[]) {
  return getIncludedBullets(bullets).filter((bullet) => bullet.text.trim().length > 0);
}

function hasText(value: string | undefined) {
  return Boolean(value?.trim());
}

function InlineSkillSection({
  categories,
  showTopRule,
}: {
  categories: SkillCategory[];
  showTopRule: boolean;
}) {
  const renderableCategories = getIncludedSkillCategories(categories)
    .map((category) => ({ ...category, skills: category.skills.filter((skill) => hasText(skill.name)) }))
    .filter((category) => category.skills.length > 0);

  if (renderableCategories.length === 0) return null;

  return (
    <div style={{ marginTop: showTopRule ? "1pt" : "0pt" }}>
      <ResumeSection title="Technical Skills" showTopRule={showTopRule}>
        <div
          className="resume-skills-content"
          style={{
            ...flowContentStyle,
            marginTop: "1pt",
            paddingBottom: "1pt",
          }}
        >
          {renderableCategories.map((category, index) => (
            <p
              key={category.id}
              className="resume-skill-line"
              style={{
                ...skillsLineStyle,
                marginBottom:
                  index === categories.length - 1 ? 0 : DOC_LAYOUT.skillRowGap,
              }}
            >
              <span
                className="resume-skill-label"
                style={{
                  display: "inline",
                  marginRight: "1.5pt",
                  whiteSpace: "nowrap",
                  verticalAlign: "baseline",
                  fontWeight: DOC_TOKENS.skillLabelWeight,
                }}
              >
                {category.label}:
              </span>
              <span className="resume-skill-value" style={{ fontWeight: 400 }}>
                {category.skills.map((skill) => skill.name).join(", ")}
              </span>
            </p>
          ))}
        </div>
      </ResumeSection>
    </div>
  );
}

function ExperienceRow({ item }: { item: ExperienceEntry }) {
  const experienceBulletIndent = "7.4pt";
  const experienceBulletGap = "3.3pt";
  const bullets = getRenderableBullets(item.bullets);

  return (
    <article
      className="resume-row mt-[7pt] break-inside-avoid"
      style={{ pageBreakInside: "avoid" }}
    >
      <div
        className="resume-row-head"
        style={rowHeadStyle}
      >
        <p
          className="resume-row-date whitespace-nowrap"
          style={{
            fontSize: DOC_TOKENS.dateSize,
            lineHeight: 1.12,
            paddingRight: "2pt",
            paddingTop: "0.8pt",
            color: "#111111",
          }}
        >
          {formatDateRange(item.dateRange)}
        </p>
        <h4
          className="resume-row-main min-w-0"
          style={{
            fontSize: DOC_TOKENS.jobTitleSize,
            lineHeight: 1.16,
            paddingLeft: DOC_LAYOUT.contentRailInset,
            paddingRight: 0,
            fontWeight: 500,
            color: "#111111",
          }}
        >
          {item.title},{" "}
          <span
            className="uppercase tracking-[0.01em]"
            style={{ fontSize: DOC_TOKENS.companySize }}
          >
            {item.company}
          </span>
        </h4>
        <p
          className="resume-row-location"
          style={{
            ...locationTextStyle,
            paddingTop: "0.6pt",
          }}
        >
          {item.location}
        </p>
      </div>
      {bullets.length > 0 ? (
        <ul
          className="resume-row-bullets mt-[3pt] list-disc"
          style={{
            marginLeft: DOC_LAYOUT.bulletLeftRail,
            width: DOC_LAYOUT.flowTextWidthFromBullet,
            maxWidth: DOC_LAYOUT.flowTextWidthFromBullet,
            boxSizing: "border-box",
            paddingLeft: experienceBulletIndent,
            paddingRight: 0,
            listStylePosition: "outside",
            listStyleType: "disc",
            fontSize: DOC_TOKENS.bulletSize,
            lineHeight: 1.18,
            fontWeight: 400,
            color: "#111111",
            overflowWrap: "break-word",
            wordBreak: "normal",
          }}
        >
          {bullets.map((bullet, index) => (
            <li
              key={bullet.id}
              style={{
                display: "list-item",
                marginBottom:
                  index === bullets.length - 1 ? "0pt" : experienceBulletGap,
              }}
            >
              {bullet.text}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function EducationRow({ item, isFirst }: { item: EducationEntry; isFirst: boolean }) {
  const identity = getEducationIdentityParts(item);

  return (
    <article
      className={`resume-row ${isFirst ? "mt-[4pt]" : "mt-[5pt]"} break-inside-avoid`}
      style={{ pageBreakInside: "avoid" }}
    >
      <div
        className="resume-row-head"
        style={rowHeadStyle}
      >
        <p
          className="resume-row-date whitespace-nowrap"
          style={{
            fontSize: DOC_TOKENS.dateSize,
            lineHeight: 1.1,
            paddingRight: "2pt",
            paddingTop: "0.5pt",
            color: "#111111",
          }}
        >
          {formatDateRange(item.dateRange)}
        </p>
        <p
          className="resume-row-main min-w-0"
          style={{
            fontSize: DOC_TOKENS.jobTitleSize,
            lineHeight: 1.14,
            paddingLeft: DOC_LAYOUT.contentRailInset,
            paddingRight: 0,
            fontWeight: 500,
            color: "#111111",
          }}
        >
          {identity.degree}
          {identity.showSeparator ? ", " : null}
          <span style={{ fontSize: DOC_TOKENS.companySize }}>{identity.school}</span>
        </p>
        <p
          className="resume-row-location"
          style={{
            ...locationTextStyle,
            lineHeight: 1.1,
            paddingLeft: "1pt",
          }}
        >
          {item.location ?? ""}
        </p>
      </div>
      {item.coursework && item.coursework.length > 0 ? (
        <p
          className="resume-row-coursework"
          style={{
            ...flowContentStyle,
            marginTop: "6.2pt",
            marginBottom: "0.5pt",
            fontSize: DOC_TOKENS.courseworkSize,
            lineHeight: 1.18,
            overflowWrap: "break-word",
            wordBreak: "normal",
            color: "#111111",
          }}
        >
          <span style={{ fontWeight: 500 }}>Relevant Coursework:</span> {item.coursework.join(", ")}
        </p>
      ) : null}
    </article>
  );
}

function SummarySection({ section, showTopRule }: { section: Extract<ResumeSectionModel, { type: "summary" }>; showTopRule: boolean }) {
  if (!hasText(section.content.text)) return null;
  return (
    <div
      className="resume-summary-section"
      style={{
        marginTop: showTopRule ? "6pt" : `calc(${HEADER_LAYOUT.ruleToSummaryGap} + ${DOC_LAYOUT.summaryBlockSeparationFromHeaderRule})`,
        marginBottom: DOC_LAYOUT.summaryToWorkExperienceGap,
        borderTop: showTopRule ? "0.5pt solid #000000" : undefined,
        width: DOC_LAYOUT.sectionDividerWidth,
        maxWidth: DOC_LAYOUT.sectionDividerWidth,
        boxSizing: "border-box",
      }}
    >
      <section className="resume-section mt-[0pt]">
        <div className="resume-summary-row" style={{ display: "grid", gridTemplateColumns: `${DOC_LAYOUT.dateColumnWidth} ${DOC_LAYOUT.summaryTextWidth}`, columnGap: DOC_LAYOUT.summaryColumnGap, width: DOC_LAYOUT.flowTextRail, maxWidth: DOC_LAYOUT.flowTextRail, boxSizing: "border-box", alignItems: "start" }}>
          <h3 className="font-semibold uppercase tracking-[0.04em] text-black" style={{ fontSize: DOC_TOKENS.sectionLabelSize, fontWeight: 600, lineHeight: 1.05, paddingTop: DOC_LAYOUT.sectionLabelTopPadding }}>Summary</h3>
          <p className="resume-summary-content" style={summaryTextStyle}>{section.content.text}</p>
        </div>
      </section>
    </div>
  );
}

function ExperienceSection({ section, showTopRule }: { section: Extract<ResumeSectionModel, { type: "experience" }>; showTopRule: boolean }) {
  const entries = getIncludedExperienceEntries(section.content.entries).filter((entry) => hasText(entry.company) || hasText(entry.title) || hasText(entry.location) || getRenderableBullets(entry.bullets).length > 0);
  if (entries.length === 0) return null;
  return <ResumeSection title="Work Experience" showTopRule={showTopRule}>{entries.map((entry) => <ExperienceRow key={entry.id} item={entry} />)}</ResumeSection>;
}

function ProjectRow({ project }: { project: ProjectEntry }) {
  const bullets = getRenderableBullets(project.bullets);
  const supportingMetadata = getProjectSupportingMetadataParts(project);

  return (
    <article
      className="resume-row mt-[7pt] break-inside-avoid"
      style={{ pageBreakInside: "avoid" }}
    >
      <div className="resume-row-head" style={rowHeadStyle}>
        <p
          className="resume-row-date whitespace-nowrap"
          style={{
            fontSize: DOC_TOKENS.dateSize,
            lineHeight: 1.12,
            paddingRight: "2pt",
            paddingTop: "0.8pt",
            color: "#111111",
          }}
        >
          {hasText(project.date) ? project.date : null}
        </p>
        <div
          className="resume-row-main min-w-0"
          style={{
            paddingLeft: DOC_LAYOUT.contentRailInset,
            paddingRight: 0,
            color: "#111111",
            overflowWrap: "break-word",
            wordBreak: "normal",
          }}
        >
          {hasText(project.name) ? (
            <h4
              style={{
                fontSize: DOC_TOKENS.jobTitleSize,
                lineHeight: 1.16,
                fontWeight: 500,
                color: "#111111",
              }}
            >
              {project.name}
            </h4>
          ) : null}
          {supportingMetadata.length > 0 ? (
            <p
              className="resume-project-metadata"
              style={{
                marginTop: hasText(project.name) ? "1pt" : 0,
                fontSize: DOC_TOKENS.bodySize,
                lineHeight: 1.08,
                color: "#111111",
                fontWeight: 400,
                overflowWrap: "break-word",
                wordBreak: "normal",
              }}
            >
              {supportingMetadata.join(" · ")}
            </p>
          ) : null}
        </div>
        <p className="resume-row-location" style={locationTextStyle} />
      </div>

      {hasText(project.description) ? (
        <p
          className="resume-project-description"
          style={{
            ...flowContentStyle,
            marginTop: "3pt",
            marginBottom: 0,
            fontSize: DOC_TOKENS.bodySize,
            lineHeight: 1.12,
            color: "#111111",
            fontWeight: 400,
            overflowWrap: "break-word",
            wordBreak: "normal",
          }}
        >
          {project.description}
        </p>
      ) : null}

      {bullets.length > 0 ? (
        <ul
          className="resume-row-bullets mt-[3pt] list-disc"
          style={{
            marginLeft: DOC_LAYOUT.bulletLeftRail,
            width: DOC_LAYOUT.flowTextWidthFromBullet,
            maxWidth: DOC_LAYOUT.flowTextWidthFromBullet,
            boxSizing: "border-box",
            paddingLeft: "7.4pt",
            paddingRight: 0,
            listStylePosition: "outside",
            listStyleType: "disc",
            fontSize: DOC_TOKENS.bulletSize,
            lineHeight: 1.18,
            fontWeight: 400,
            color: "#111111",
            overflowWrap: "break-word",
            wordBreak: "normal",
          }}
        >
          {bullets.map((bullet, index) => (
            <li
              key={bullet.id}
              style={{
                display: "list-item",
                marginBottom: index === bullets.length - 1 ? "0pt" : "3.3pt",
              }}
            >
              {bullet.text}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function ProjectsSection({ section, showTopRule }: { section: Extract<ResumeSectionModel, { type: "projects" }>; showTopRule: boolean }) {
  const entries = section.content.entries.filter((entry) => entry.included && (hasText(entry.name) || hasText(entry.description) || hasText(entry.date) || hasText(entry.technologies) || hasText(entry.url) || getRenderableBullets(entry.bullets).length > 0));
  if (entries.length === 0) return null;
  return (
    <ResumeSection title="Projects" showTopRule={showTopRule}>
      {entries.map((project) => <ProjectRow key={project.id} project={project} />)}
    </ResumeSection>
  );
}

function EducationSection({ section, showTopRule }: { section: Extract<ResumeSectionModel, { type: "education" }>; showTopRule: boolean }) {
  const entries = getIncludedEducationEntries(section.content.entries).filter((entry) => hasText(entry.school) || hasText(entry.degree) || hasText(entry.location) || Boolean(entry.coursework?.some(hasText)));
  if (entries.length === 0) return null;
  return <div><ResumeSection title="Education" showTopRule={showTopRule}>{entries.map((entry) => <EducationRow key={entry.id} item={entry} isFirst={entries[0] === entry} />)}</ResumeSection></div>;
}

function CertificationsSection({ section, showTopRule }: { section: Extract<ResumeSectionModel, { type: "certifications" }>; showTopRule: boolean }) {
  const entries = section.content.entries.filter((entry) => entry.included && [entry.name, entry.issuer, entry.date, entry.expirationDate, entry.credentialId, entry.credentialUrl].some(hasText));
  if (entries.length === 0) return null;
  return (
    <ResumeSection title="Certifications" showTopRule={showTopRule}>
      {entries.map((entry) => (
        <div key={entry.id} className="mt-[4pt]" style={flowContentStyle}>
          {hasText(entry.name) ? <p style={{ fontSize: DOC_TOKENS.bodySize, lineHeight: 1.08, fontWeight: 500, color: "#111111" }}>{entry.name}</p> : null}
          {getCertificationMetadataParts(entry).length > 0 ? <p style={{ fontSize: DOC_TOKENS.bodySize, lineHeight: 1.08, color: "#111111" }}>{getCertificationMetadataParts(entry).join(" · ")}</p> : null}
        </div>
      ))}
    </ResumeSection>
  );
}

function CustomSectionRenderer({ section, showTopRule }: { section: Extract<ResumeSectionModel, { type: "custom" }>; showTopRule: boolean }) {
  const lines = section.content.lines.filter((line) => hasText(line));
  if (lines.length === 0 || !hasText(section.content.title)) return null;
  return <ResumeSection title={section.content.title} showTopRule={showTopRule}>{lines.map((line, index) => <p key={`${section.id}-${index}`} style={{ ...flowContentStyle, fontSize: DOC_TOKENS.bodySize, lineHeight: 1.08, marginBottom: DOC_LAYOUT.paragraphAfter, color: "#111111", fontWeight: 400 }}>{line}</p>)}</ResumeSection>;
}

function renderSection(section: ResumeSectionModel, showTopRule: boolean) {
  if (!section.included) return null;
  switch (section.type) {
    case "summary": return <SummarySection key={section.id} section={section} showTopRule={showTopRule} />;
    case "experience": return <ExperienceSection key={section.id} section={section} showTopRule={showTopRule} />;
    case "projects": return <ProjectsSection key={section.id} section={section} showTopRule={showTopRule} />;
    case "technicalSkills": return <InlineSkillSection key={section.id} categories={section.content.categories} showTopRule={showTopRule} />;
    case "education": return <EducationSection key={section.id} section={section} showTopRule={showTopRule} />;
    case "certifications": return <CertificationsSection key={section.id} section={section} showTopRule={showTopRule} />;
    case "custom": return <CustomSectionRenderer key={section.id} section={section} showTopRule={showTopRule} />;
  }
}

export function ClassicTemplate({ document }: { document: ResumeDocument }) {
  const documentStyle: CSSProperties & Record<`--${string}`, string> = {
    "--rs-section-right-edge": DOC_LAYOUT.sectionRightEdge,
    "--rs-section-divider-width": DOC_LAYOUT.sectionDividerWidth,
    "--rs-location-rail": DOC_LAYOUT.locationRail,
    "--rs-flow-text-rail": DOC_LAYOUT.flowTextRail,
    "--rs-date-column-width": DOC_LAYOUT.dateColumnWidth,
    "--rs-location-column-width": DOC_LAYOUT.locationColumnWidth,
    "--rs-content-column-width": DOC_LAYOUT.contentColumnWidth,
    "--rs-section-label-top-padding": DOC_LAYOUT.sectionLabelTopPadding,
    fontFamily: DOC_TOKENS.fontFamily,
    fontSize: DOC_TOKENS.bodySize,
    lineHeight: 1.08,
    width: DOC_LAYOUT.pageWidth,
    maxWidth: DOC_LAYOUT.pageWidth,
    boxSizing: "border-box",
    paddingTop: DOC_LAYOUT.pageTopMargin,
    paddingBottom: DOC_LAYOUT.pageBottomMargin,
    paddingLeft: DOC_LAYOUT.pageLeftMargin,
    paddingRight: DOC_LAYOUT.pageRightMargin,
  };

  return (
    <article
      className="resume-document mx-auto w-full max-w-[8.5in] bg-white text-black"
      style={documentStyle}
    >
      <header
        className="border-b border-black text-center"
        style={{
          position: "relative",
          top: HEADER_LAYOUT.headerClusterOffset,
          paddingBottom: HEADER_LAYOUT.contactToRuleGap,
          borderBottomWidth: "0.5pt",
        }}
      >
        <h2
          style={{
            fontSize: DOC_TOKENS.nameSize,
            fontWeight: 700,
            lineHeight: HEADER_LAYOUT.nameLineHeight,
          }}
        >
          {document.header.name}
        </h2>
        <p
          style={{
            fontSize: DOC_TOKENS.contactSize,
            lineHeight: HEADER_LAYOUT.contactLineHeight,
            marginTop: HEADER_LAYOUT.nameToContactGap,
          }}
        >
          {[document.header.location, document.header.email, document.header.phone]
            .filter(Boolean)
            .join(" | ")}
        </p>
        {document.header.links.length > 0 ? (
          <p
            style={{
              fontSize: DOC_TOKENS.contactSize,
              lineHeight: HEADER_LAYOUT.contactLineHeight,
              marginTop: HEADER_LAYOUT.nameToContactGap,
            }}
          >
            {document.header.links.join(" | ")}
          </p>
        ) : null}
      </header>

      {getIncludedSectionRenderPlan(document).map(({ section, showTopRule }) => renderSection(section, showTopRule))}
    </article>
  );
}
