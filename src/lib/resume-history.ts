import type { ResumeDocument } from "../types/resume.ts";

export const MAX_HISTORY_DEPTH = 100;

export type DocumentHistory = {
  past: ResumeDocument[];
  future: ResumeDocument[];
};

export const emptyHistory = (): DocumentHistory => ({ past: [], future: [] });

export function pushHistory(history: DocumentHistory, before: ResumeDocument, after: ResumeDocument): DocumentHistory {
  if (before === after) return history;
  return { past: [...history.past, before].slice(-MAX_HISTORY_DEPTH), future: [] };
}

export function undoHistory(history: DocumentHistory, current: ResumeDocument) {
  const previous = history.past.at(-1);
  if (!previous) return { document: current, history };
  return { document: previous, history: { past: history.past.slice(0, -1), future: [current, ...history.future].slice(0, MAX_HISTORY_DEPTH) } };
}

export function redoHistory(history: DocumentHistory, current: ResumeDocument) {
  const next = history.future[0];
  if (!next) return { document: current, history };
  return { document: next, history: { past: [...history.past, current].slice(-MAX_HISTORY_DEPTH), future: history.future.slice(1) } };
}
