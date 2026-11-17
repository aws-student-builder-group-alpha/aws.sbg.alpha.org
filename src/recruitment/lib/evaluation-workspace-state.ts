import { acceptEvaluationDetail } from "./evaluations.ts";
import type { EvaluationCommand, EvaluationDetail, EvaluationFailure, EvaluationPerson, EvaluationReceipt, Recommendation } from "./evaluations.ts";
import type { DecisionReceipt } from "./decisions.ts";

export type EvaluationEditorState = {
  detail: EvaluationDetail | null; verified: boolean; loading: boolean; blocked: boolean; busy: boolean;
  notes: string; recommendation: Recommendation | ""; evaluatorId: string; reason: string; baseReviewVersion: number;
  dirty: boolean; conflict: boolean; notice: string; pending: EvaluationCommand | null; confirmation: EvaluationCommand | null;
};
export const initialEvaluationEditor: EvaluationEditorState = {
  detail: null, verified: false, loading: true, blocked: false, busy: false, notes: "", recommendation: "", evaluatorId: "", reason: "", baseReviewVersion: 0,
  dirty: false, conflict: false, notice: "", pending: null, confirmation: null,
};
export type EvaluationEditorAction =
  | { type: "read"; detail: EvaluationDetail; discard?: boolean }
  | { type: "failure"; failure: EvaluationFailure; command?: boolean }
  | { type: "edit"; field: "notes" | "recommendation" | "evaluatorId" | "reason"; value: string }
  | { type: "confirm"; command: EvaluationCommand | null }
  | { type: "start"; command: EvaluationCommand }
  | { type: "saved"; command: EvaluationCommand; receipt: EvaluationReceipt; evaluator?: EvaluationPerson }
  | { type: "notice"; notice: string }
  | { type: "decision"; receipt: DecisionReceipt };
function fields(detail: EvaluationDetail) {
  return { notes: detail.review?.notes ?? "", recommendation: detail.review?.recommendation ?? "" as const,
    evaluatorId: detail.assignment?.evaluator.id ?? "", reason: "", baseReviewVersion: detail.review?.version ?? 0 };
}
export function evaluationEditorReducer(state: EvaluationEditorState, action: EvaluationEditorAction): EvaluationEditorState {
  if (action.type === "decision") {
    if (!state.detail || action.receipt.applicationId !== state.detail.application.id || action.receipt.applicationVersion <= state.detail.application.version) return state;
    return { ...state, detail: { ...state.detail, canEdit: false, application: { ...state.detail.application, status: action.receipt.status, version: action.receipt.applicationVersion,
      history: [...state.detail.application.history, { status: action.receipt.status, createdAt: action.receipt.updatedAt }] } }, dirty: false, conflict: false, pending: null, confirmation: null, busy: false };
  }
  if (action.type === "read") {
    if (state.blocked && !action.discard) return state;
    const detail = acceptEvaluationDetail(state.detail, action.detail);
    if (detail === state.detail && detail !== action.detail) return { ...state, verified: true, loading: false };
    const assignmentChanged = !!state.detail && state.detail.assignment?.id !== detail.assignment?.id;
    const freshAssignment = detail.role === "evaluator" && assignmentChanged;
    const reset = !state.detail || action.discard || freshAssignment || !state.dirty && !state.pending && !state.confirmation;
    const terminal = !detail.canEdit;
    return { ...state, detail, verified: true, loading: false, blocked: false,
      ...(reset ? fields(detail) : {}),
      dirty: reset || terminal ? false : state.dirty,
      conflict: !reset && state.dirty && (assignmentChanged || detail.application.version !== state.detail?.application.version || (detail.review?.version ?? 0) !== state.baseReviewVersion),
      pending: action.discard || freshAssignment || terminal ? null : state.pending,
      confirmation: action.discard || freshAssignment || terminal ? null : state.confirmation,
      notice: freshAssignment ? "Your assignment changed. Save a fresh recommendation for this assignment." : action.discard ? "Latest details loaded." : terminal && state.pending ? "This application is now read-only. Latest details loaded." : state.notice,
    };
  }
  if (action.type === "failure") {
    if (["AUTH_REQUIRED", "ACCOUNT_CHANGED", "MFA_REQUIRED", "DENIED", "NOT_FOUND"].includes(action.failure.code)) {
      return { ...initialEvaluationEditor, loading: false, blocked: true, notice: action.failure.message };
    }
    if (!action.command) return { ...state, verified: false, loading: false, notice: action.failure.message };
    return { ...state, busy: false, pending: action.failure.code === "UNAVAILABLE" ? state.pending : null,
      conflict: action.failure.code === "CONFLICT" || state.conflict, notice: action.failure.message };
  }
  if (action.type === "edit") {
    if (state.pending || state.busy || !state.verified || state.conflict || !state.detail?.canEdit) return state;
    return { ...state, [action.field]: action.value, dirty: true, notice: "" };
  }
  if (action.type === "confirm") return { ...state, confirmation: action.command, notice: "" };
  if (action.type === "start") return { ...state, pending: state.pending ?? action.command, busy: true, notice: "" };
  if (action.type === "notice") return { ...state, notice: action.notice };
  if (!state.detail || action.receipt.applicationId !== state.detail.application.id) return state;
  const current = state.detail, result = action.receipt;
  let detail = current;
  if (result.applicationVersion >= current.application.version && result.generation >= (current.assignment?.generation ?? 0)
    && (current.assignment?.id !== result.assignmentId || result.reviewVersion >= (current.review?.version ?? 0))) {
    if (action.command.action === "assign" && action.evaluator) {
      const same = current.assignment?.id === result.assignmentId;
      detail = { ...current, application: { ...current.application, status: result.status, version: result.applicationVersion,
        history: current.application.status === "Submitted" && result.status === "Under Review" ? [...current.application.history, { status: "Under Review", createdAt: result.updatedAt }] : current.application.history },
        assignment: same ? current.assignment : { id: result.assignmentId, generation: result.generation, evaluator: action.evaluator, assignedAt: result.updatedAt }, review: same ? current.review : null };
    } else if (action.command.action === "save_review" && current.assignment?.id === result.assignmentId) {
      detail = { ...current, review: { version: result.reviewVersion, recommendation: action.command.recommendation, notes: action.command.notes, updatedAt: result.updatedAt } };
    }
  }
  return { ...state, detail, ...fields(detail), busy: false, pending: null, confirmation: null, dirty: false, conflict: false,
    notice: action.command.action === "assign" ? "Evaluator assignment confirmed." : "Recommendation saved." };
}
