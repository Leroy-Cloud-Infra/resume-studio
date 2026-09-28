import type { ResumeDateRange } from "../types/resume.ts";

const MONTH_ABBREVIATIONS: Record<string, string> = {
  jan: "Jan", january: "Jan",
  feb: "Feb", february: "Feb",
  mar: "Mar", march: "Mar",
  apr: "Apr", april: "Apr",
  may: "May",
  jun: "Jun", june: "Jun",
  jul: "Jul", july: "Jul",
  aug: "Aug", august: "Aug",
  sep: "Sep", sept: "Sep", september: "Sep",
  oct: "Oct", october: "Oct",
  nov: "Nov", november: "Nov",
  dec: "Dec", december: "Dec",
};

function formatMonth(value: string | undefined) {
  if (!value) return "";
  return MONTH_ABBREVIATIONS[value.trim().toLowerCase()] ?? value;
}

export function formatClassicDateRange(dateRange: ResumeDateRange) {
  const start = `${formatMonth(dateRange.startMonth)} ${dateRange.startYear}`.trim();
  const end = dateRange.current
    ? "Present"
    : `${formatMonth(dateRange.endMonth)} ${dateRange.endYear ?? ""}`.trim();

  if (!start) return end;
  if (!end) return start;
  return `${start} — ${end}`.replace(/\s([—-])\s/g, "\u00A0$1\u00A0");
}
