import { acceptDecisionState, decisionAccessLost } from "./decisions.ts";
import type { DecisionCommand, DecisionFailure, DecisionReceipt, DecisionState } from "./decisions.ts";
import type { Recommendation } from "./evaluations.ts";

export type DecisionEditor = {
  data: DecisionState | null; base: DecisionState | null; loading: boolean; verified: boolean; blocked: boolean; busy: boolean;
  outcome: Recommendation | ""; reason: string; dirty: boolean; conflict: boolean; notice: string;
  pending: DecisionCommand | null; confirmation: DecisionCommand | null;
};
export const initialDecisionEditor: DecisionEditor = { data: null, base: null, loading: true, verified: false, blocked: false, busy: false, outcome: "", reason: "", dirty: false, conflict: false, notice: "", pending: null, confirmation: null };
type Action =
  | { type: "read"; data: DecisionState; discard?: boolean }
  | { type: "edit"; field: "outcome" | "reason"; value: string }
  | { type: "confirm"; command: DecisionCommand | null }
  | { type: "start"; command: DecisionCommand }
  | { type: "failure"; failure: DecisionFailure; command?: boolean }
  | { type: "saved"; receipt: DecisionReceipt }
  | { type: "notice"; message: string };
export function decisionEditorReducer(state: DecisionEditor, action: Action): DecisionEditor {
  if (action.type === "read") {
    if (state.blocked && !action.discard) return state;
    const data = acceptDecisionState(state.data, action.data);
    const reset = !state.data || action.discard || data.status === "Withdrawn" || !state.dirty && !state.pending && !state.confirmation;
    const changed = !!state.base && (data.applicationVersion !== state.base.applicationVersion || data.assignmentId !== state.base.assignmentId || data.reviewVersion !== state.base.reviewVersion);
    return { ...state, data, loading: false, verified: true, blocked: false,
      ...(reset ? { base: data, outcome: "" as const, reason: "", dirty: false, conflict: false, pending: null, confirmation: null } : { conflict: changed || state.conflict }),
      notice: action.discard ? "Latest decision details loaded." : state.notice };
  }
  if (action.type === "failure") {
    if (decisionAccessLost(action.failure.code)) return { ...initialDecisionEditor, loading: false, blocked: true, notice: action.failure.message };
    if (!action.command) return { ...state, verified: false, loading: false, notice: action.failure.message };
    const uncertain = action.failure.code === "UNAVAILABLE";
    return { ...state, busy: false, pending: uncertain ? state.pending : null,
      confirmation: uncertain || action.failure.code === "CONFLICT" ? state.confirmation : null,
      conflict: state.conflict || action.failure.code === "CONFLICT", notice: action.failure.message };
  }
  if (action.type === "edit") {
    if (state.pending || state.busy || state.confirmation || state.conflict || !state.verified) return state;
    return { ...state, [action.field]: action.value, dirty: true, notice: "" };
  }
  if (action.type === "confirm") return { ...state, confirmation: action.command, notice: "" };
  if (action.type === "start") return { ...state, busy: true, pending: state.pending ?? action.command, notice: "" };
  if (action.type === "notice") return { ...state, notice: action.message };
  if (!state.data || action.receipt.applicationId !== state.data.applicationId) return state;
  const result = action.receipt;
  const data = result.applicationVersion >= state.data.applicationVersion ? { ...state.data, applicationVersion: result.applicationVersion, status: result.status,
    canPublish: false, canAmend: true,
    accepted: state.data.accepted + (result.status === "Accepted" && state.data.status !== "Accepted" ? 1 : result.status !== "Accepted" && state.data.status === "Accepted" ? -1 : 0) } : state.data;
  return { ...state, data, base: data, busy: false, pending: null, confirmation: null, dirty: false, conflict: false, reason: "", outcome: "", notice: "Decision confirmed in the applicant portal." };
}
