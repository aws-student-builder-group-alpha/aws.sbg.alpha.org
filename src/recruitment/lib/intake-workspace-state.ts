import { acceptIntakeState, intakeAccessLost } from "./intake.ts";
import type { IntakeAction, IntakeCommand, IntakeFailure, IntakeReceipt, IntakeState } from "./intake.ts";

export type IntakeEditor = {
  data: IntakeState | null; base: IntakeState | null; verified: boolean; blocked: boolean; busy: boolean;
  action: IntakeAction | ""; reason: string; dirty: boolean; conflict: boolean; notice: string;
  pending: IntakeCommand | null; confirmation: IntakeCommand | null;
};
export const initialIntakeEditor: IntakeEditor = { data: null, base: null, verified: false, blocked: false, busy: false, action: "", reason: "", dirty: false, conflict: false, notice: "", pending: null, confirmation: null };
type Action =
  | { type: "refresh" }
  | { type: "read"; data: IntakeState; discard?: boolean }
  | { type: "edit"; field: "action" | "reason"; value: string }
  | { type: "confirm"; command: IntakeCommand | null }
  | { type: "start"; command: IntakeCommand }
  | { type: "failure"; failure: IntakeFailure; command?: boolean }
  | { type: "saved"; receipt: IntakeReceipt }
  | { type: "notice"; message: string };
export function intakeEditorReducer(state: IntakeEditor, action: Action): IntakeEditor {
  if (state.blocked) return state;
  if (action.type === "refresh") return state.pending || state.busy ? state : { ...state, verified: false, notice: "Loading latest intake details..." };
  if (action.type === "read") {
    const data = acceptIntakeState(state.data, action.data);
    const reset = !state.data || !state.pending && (action.discard || !state.dirty && !state.confirmation);
    const changed = !!state.base && (data.version !== state.base.version || state.action !== "close" && Date.parse(data.serverNow) >= Date.parse(data.closesAt));
    return { ...state, data, verified: true,
      ...(reset ? { base: data, action: "" as const, reason: "", dirty: false, conflict: false, confirmation: null } : { conflict: state.conflict || changed }),
      notice: action.discard && !state.pending ? "Latest intake details loaded." : state.notice };
  }
  if (action.type === "failure") {
    if (intakeAccessLost(action.failure.code)) return { ...initialIntakeEditor, blocked: true, notice: action.failure.message };
    if (!action.command) return { ...state, verified: false, notice: action.failure.message };
    const uncertain = action.failure.code === "UNAVAILABLE";
    return { ...state, busy: false, pending: uncertain ? state.pending : null,
      confirmation: uncertain || action.failure.code === "CONFLICT" ? state.confirmation : null,
      conflict: state.conflict || action.failure.code === "CONFLICT", notice: action.failure.message };
  }
  if (action.type === "edit") {
    if (state.pending || state.busy || state.confirmation || state.conflict || !state.verified) return state;
    if (action.field === "action" && !["", "pause", "resume", "close"].includes(action.value)) return state;
    return { ...state, [action.field]: action.value, dirty: true, notice: "" };
  }
  if (action.type === "confirm") return state.pending || state.busy ? state : { ...state, confirmation: action.command, notice: "" };
  if (action.type === "start") return { ...state, busy: true, pending: state.pending ?? action.command, notice: "" };
  if (action.type === "notice") return { ...state, notice: action.message };
  if (!state.data) return state;
  const r = action.receipt;
  const serverNow = Date.parse(r.updatedAt) > Date.parse(state.data.serverNow) ? r.updatedAt : state.data.serverNow;
  const beforeClose = Date.parse(serverNow) < Date.parse(state.data.closesAt);
  const data = r.version >= state.data.version ? { ...state.data, ...r, serverNow,
    accepting: r.state === "open" && beforeClose && Date.parse(serverNow) >= Date.parse(state.data.opensAt),
    canPause: r.state === "open" && beforeClose, canResume: r.state === "paused" && beforeClose, canClose: r.state !== "closed" } : state.data;
  return { ...state, data, base: data, busy: false, pending: null, confirmation: null, dirty: false, conflict: false, reason: "", action: "", notice: "Intake change confirmed." };
}
