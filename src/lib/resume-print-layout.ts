/**
 * Print geometry shared by the browser measurement and the PDF exporter.
 * These values are expressed in CSS pixels at 96 DPI, which is the coordinate
 * system used by the export browser viewport.
 */
export const LETTER_PAGE_WIDTH_PX = 816;
export const LETTER_PAGE_HEIGHT_PX = 1056;
export const LETTER_PAGE_ASPECT_RATIO = LETTER_PAGE_HEIGHT_PX / LETTER_PAGE_WIDTH_PX;
export const PDF_EXPORT_SCALE = 0.96;
export const FIRST_PAGE_TOP_MARGIN_PT = 22.32 * PDF_EXPORT_SCALE;
export const CONTINUATION_CONTENT_SHIFT_PT = 15;
// The accepted no-header continuation prototype starts its content 15pt below
// the first-page content rail. The header treatment adds a further locked 15pt.
export const CONTINUATION_BASE_TOP_MARGIN_PT =
  FIRST_PAGE_TOP_MARGIN_PT + 15;
export const CONTINUATION_PAGE_TOP_MARGIN_PT =
  CONTINUATION_BASE_TOP_MARGIN_PT + CONTINUATION_CONTENT_SHIFT_PT;
const CONTINUATION_PAGE_TOP_MARGIN_PX = CONTINUATION_PAGE_TOP_MARGIN_PT * (96 / 72);

/**
 * A small rounding allowance prevents fractional layout noise from turning an
 * otherwise fitting print layout into a second page. This is intentionally
 * much smaller than the old 12px browser-layout tolerance.
 */
export const PRINT_OVERFLOW_TOLERANCE_PX = 0.5;

export type PrintedPageMetrics = {
  printedContentHeight: number;
  printedPageHeight: number;
  overflowHeight: number;
  isOverflowing: boolean;
  pageCount: number;
  pageFillRatio: number;
};

export function calculatePrintedPageMetrics(
  naturalContentHeight: number,
  naturalPageHeight: number,
): PrintedPageMetrics {
  const printedContentHeight = naturalContentHeight * PDF_EXPORT_SCALE;
  const printedPageHeight = naturalPageHeight;
  const overflowHeight = printedContentHeight - printedPageHeight;
  const isOverflowing = overflowHeight > PRINT_OVERFLOW_TOLERANCE_PX;

  return {
    printedContentHeight,
    printedPageHeight,
    overflowHeight: isOverflowing ? overflowHeight : 0,
    isOverflowing,
    pageCount: isOverflowing
      ? 1 + Math.ceil(
          (printedContentHeight - printedPageHeight - PRINT_OVERFLOW_TOLERANCE_PX) /
            (printedPageHeight - CONTINUATION_PAGE_TOP_MARGIN_PX),
        )
      : 1,
    pageFillRatio: printedContentHeight / printedPageHeight,
  };
}
