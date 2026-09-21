export type PreviewSaveStatus = "saving" | "saved" | "error";

export function getPreviewStatusLabel({
  saveStatus,
  isOverflowing,
  isNearLimit,
  pageFillPercent,
}: {
  saveStatus: PreviewSaveStatus;
  isOverflowing: boolean;
  isNearLimit: boolean;
  pageFillPercent: number;
}) {
  if (saveStatus === "error") {
    return "Unable to save locally";
  }

  if (saveStatus === "saving") {
    return "Saving…";
  }

  if (!isOverflowing && isNearLimit) {
    return `Saved locally · ${pageFillPercent}% used`;
  }

  return "Saved locally";
}
