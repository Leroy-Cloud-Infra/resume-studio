import {
  CONTINUATION_PAGE_TOP_MARGIN_PT,
  FIRST_PAGE_TOP_MARGIN_PT,
} from "./resume-print-layout.ts";

/** PDF-only page furniture; the continuous browser preview has no page headers. */

function cssString(value: string) {
  // Hex-escape every code point so a resume name cannot terminate a CSS string
  // or inject a rule into the print stylesheet.
  return `"${Array.from(value, (character) => `\\${character.codePointAt(0)!.toString(16)} `).join("")}"`;
}

export function createContinuationPageCss(candidateName: string) {
  // The margin box is taller than the header; bottom padding keeps its text
  // baseline near 30pt while page content begins below the metadata.
  return `
      @page {
        size: Letter;
        margin: ${CONTINUATION_PAGE_TOP_MARGIN_PT}pt 0 0;

        @top-left {
          content: ${cssString(candidateName)};
          font: 400 9.3pt/11pt "Continuation Serif";
          vertical-align: bottom;
          padding-left: 44pt;
          padding-bottom: 18.5pt;
        }

        @top-right {
          content: "Page " counter(page);
          font: 400 9.3pt/11pt "Continuation Serif";
          vertical-align: bottom;
          padding-right: 44pt;
          padding-bottom: 18.5pt;
        }
      }

      @page:first {
        margin-top: ${FIRST_PAGE_TOP_MARGIN_PT}pt;

        @top-left { content: none; }
        @top-right { content: none; }
      }
  `;
}
