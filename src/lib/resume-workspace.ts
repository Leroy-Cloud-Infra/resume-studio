import type { ResumeDocument, ResumeLibrary } from "../types/resume.ts";
import { applyDocumentAction, type DocumentAction } from "./resume-actions.ts";
import { emptyHistory, pushHistory, redoHistory, undoHistory, type DocumentHistory } from "./resume-history.ts";

export type WorkspaceState = {
  library: ResumeLibrary;
  histories: Record<string, DocumentHistory>;
  pendingText?: { resumeId: string; key: string; before: ResumeDocument };
};

export type WorkspaceAction =
  | { type: "hydrate-library"; library: ResumeLibrary }
  | { type: "select-resume"; resumeId: string }
  | { type: "document-action"; action: DocumentAction; historyMode?: "record" | "text"; coalesceKey?: string }
  | { type: "commit-text-history" }
  | { type: "undo" }
  | { type: "redo" };

export function createWorkspaceState(library: ResumeLibrary): WorkspaceState {
  return { library, histories: Object.fromEntries(library.resumes.map((resume) => [resume.id, emptyHistory()])) };
}

function activeDocument(state: WorkspaceState) {
  return state.library.resumes.find((resume) => resume.id === state.library.activeResumeId);
}

function replaceActiveDocument(state: WorkspaceState, document: ResumeDocument) {
  return { ...state, library: { ...state.library, resumes: state.library.resumes.map((resume) => resume.id === document.id ? document : resume) } };
}

function commitPending(state: WorkspaceState) {
  if (!state.pendingText) return state;
  const current = activeDocument(state);
  if (!current || current.id !== state.pendingText.resumeId) return { ...state, pendingText: undefined };
  const history = state.histories[current.id] ?? emptyHistory();
  return { ...state, pendingText: undefined, histories: { ...state.histories, [current.id]: pushHistory(history, state.pendingText.before, current) } };
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  if (action.type === "hydrate-library") return createWorkspaceState(action.library);
  if (action.type === "select-resume") {
    if (!state.library.resumes.some((resume) => resume.id === action.resumeId)) return state;
    const committed = commitPending(state);
    return { ...committed, library: { ...committed.library, activeResumeId: action.resumeId } };
  }
  if (action.type === "commit-text-history") return commitPending(state);
  if (action.type === "undo" || action.type === "redo") {
    const committed = commitPending(state);
    const current = activeDocument(committed);
    if (!current) return committed;
    const history = committed.histories[current.id] ?? emptyHistory();
    const result = action.type === "undo" ? undoHistory(history, current) : redoHistory(history, current);
    if (result.document === current) return committed;
    return { ...replaceActiveDocument(committed, result.document), histories: { ...committed.histories, [current.id]: result.history } };
  }
  const current = activeDocument(state);
  if (!current) return state;
  const mode = action.historyMode ?? "record";
  let nextState = state;
  if (mode === "record") nextState = commitPending(state);
  const before = activeDocument(nextState) ?? current;
  const nextDocument = applyDocumentAction(before, action.action);
  if (nextDocument === before) return nextState;
  if (mode === "text") {
    const sameGroup = nextState.pendingText?.resumeId === before.id && nextState.pendingText.key === action.coalesceKey;
    return { ...replaceActiveDocument(nextState, nextDocument), pendingText: sameGroup ? nextState.pendingText : { resumeId: before.id, key: action.coalesceKey ?? "text", before } };
  }
  const history = nextState.histories[before.id] ?? emptyHistory();
  return { ...replaceActiveDocument(nextState, nextDocument), histories: { ...nextState.histories, [before.id]: pushHistory(history, before, nextDocument) } };
}
