import type {
  ResumeDateRange,
  Resume,
  ResumeEducationItem,
  ResumeExperienceItem,
} from "@/types/resume";
import type { CSSProperties } from "react";

import { ResumeSection } from "./ResumeSection";

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

function getRenderableBullets(bullets: string[]) {
  return bullets.filter((bullet) => bullet.trim().length > 0);
}

function InlineSkillSection({
  title,
  categories,
}: {
  title: string;
  categories: Resume["technicalSkills"]["categories"];
}) {
  return (
    <div style={{ marginTop: "1pt" }}>
      <ResumeSection title={title || "Technical Skills"}>
        <div
          className="resume-skills-content"
          style={{
            ...flowContentStyle,
            marginTop: "1pt",
            paddingBottom: "1pt",
          }}
        >
          {categories.map((category, index) => (
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
                {category.value}
              </span>
            </p>
          ))}
        </div>
      </ResumeSection>
    </div>
  );
}

function ExperienceRow({ item }: { item: ResumeExperienceItem }) {
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
              key={`${index}-${bullet}`}
              style={{
                display: "list-item",
                marginBottom:
                  index === bullets.length - 1 ? "0pt" : experienceBulletGap,
              }}
            >
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function EducationRow({ item, isFirst }: { item: ResumeEducationItem; isFirst: boolean }) {
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
          {item.degree},{" "}
          <span style={{ fontSize: DOC_TOKENS.companySize }}>{item.school}</span>
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

export function ClassicTemplate({ resume }: { resume: Resume }) {
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
          {resume.header.name}
        </h2>
        <p
          style={{
            fontSize: DOC_TOKENS.contactSize,
            lineHeight: HEADER_LAYOUT.contactLineHeight,
            marginTop: HEADER_LAYOUT.nameToContactGap,
          }}
        >
          {[resume.header.location, resume.header.email, resume.header.phone]
            .filter(Boolean)
            .join(" | ")}
        </p>
        {resume.header.links.length > 0 ? (
          <p
            style={{
              fontSize: DOC_TOKENS.contactSize,
              lineHeight: HEADER_LAYOUT.contactLineHeight,
              marginTop: HEADER_LAYOUT.nameToContactGap,
            }}
          >
            {resume.header.links.join(" | ")}
          </p>
        ) : null}
      </header>

      <div
        className="resume-summary-section"
        style={{
          marginTop: `calc(${HEADER_LAYOUT.ruleToSummaryGap} + ${DOC_LAYOUT.summaryBlockSeparationFromHeaderRule})`,
          marginBottom: DOC_LAYOUT.summaryToWorkExperienceGap,
        }}
      >
        <section className="resume-section mt-[0pt]">
          <div
            className="resume-summary-row"
            style={{
              display: "grid",
              gridTemplateColumns: `${DOC_LAYOUT.dateColumnWidth} ${DOC_LAYOUT.summaryTextWidth}`,
              columnGap: DOC_LAYOUT.summaryColumnGap,
              width: DOC_LAYOUT.flowTextRail,
              maxWidth: DOC_LAYOUT.flowTextRail,
              boxSizing: "border-box",
              alignItems: "start",
            }}
          >
            <h3
              className="font-semibold uppercase tracking-[0.04em] text-black"
              style={{
                fontSize: DOC_TOKENS.sectionLabelSize,
                fontWeight: 600,
                lineHeight: 1.05,
                paddingTop: DOC_LAYOUT.sectionLabelTopPadding,
              }}
            >
              Summary
            </h3>
            <p className="resume-summary-content" style={summaryTextStyle}>
              {resume.summary}
            </p>
          </div>
        </section>
      </div>

      <ResumeSection title="Work Experience">
        {resume.experience.map((job) => (
          <ExperienceRow
            key={`${job.company}-${job.title}-${job.dateRange.startYear}`}
            item={job}
          />
        ))}
      </ResumeSection>

      {resume.projects.length > 0 ? (
        <ResumeSection title="Projects">
          {resume.projects.map((project) => (
            <div key={project.name} className="mt-[4pt]">
              <h4 style={{ ...flowContentStyle, fontSize: DOC_TOKENS.jobTitleSize, fontWeight: 500, lineHeight: 1.14, color: "#111111" }}>
                {project.name}
              </h4>
              <p style={{ ...flowContentStyle, fontSize: DOC_TOKENS.bodySize, lineHeight: 1.08, color: "#111111", fontWeight: 400 }}>
                {project.description}
              </p>
              {getRenderableBullets(project.bullets).length > 0 ? (
                <ul
                  className="mt-[1pt] list-disc"
                  style={{
                    marginLeft: DOC_LAYOUT.bulletLeftRail,
                    width: DOC_LAYOUT.flowTextWidthFromBullet,
                    maxWidth: DOC_LAYOUT.flowTextWidthFromBullet,
                    boxSizing: "border-box",
                    fontSize: DOC_TOKENS.bulletSize,
                    lineHeight: 1.12,
                    paddingLeft: DOC_LAYOUT.bulletIndent,
                    listStylePosition: "outside",
                    listStyleType: "disc",
                    color: "#111111",
                    fontWeight: 400,
                    overflowWrap: "break-word",
                    wordBreak: "normal",
                  }}
                >
                  {getRenderableBullets(project.bullets).map((bullet, index, bullets) => (
                    <li
                      key={`${index}-${bullet}`}
                      style={{
                        display: "list-item",
                        marginBottom:
                          index === bullets.length - 1 ? "0pt" : DOC_LAYOUT.paragraphAfter,
                      }}
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </ResumeSection>
      ) : null}

      <div>
        <ResumeSection title="Education">
          {resume.education.map((item, index) => (
            <EducationRow
              key={`${item.school}-${item.degree}`}
              item={item}
              isFirst={index === 0}
            />
          ))}
        </ResumeSection>
      </div>

      <InlineSkillSection
        title={resume.technicalSkills.title}
        categories={resume.technicalSkills.categories}
      />

      {resume.customSections.map((section) => (
        <ResumeSection key={section.id} title={section.title}>
          {section.lines.map((line, lineIndex) => (
            <p
              key={`${section.id}-${lineIndex}`}
              style={{
                ...flowContentStyle,
                fontSize: DOC_TOKENS.bodySize,
                lineHeight: 1.08,
                marginBottom: DOC_LAYOUT.paragraphAfter,
                color: "#111111",
                fontWeight: 400,
              }}
            >
              {line}
            </p>
          ))}
        </ResumeSection>
      ))}
    </article>
  );
}
