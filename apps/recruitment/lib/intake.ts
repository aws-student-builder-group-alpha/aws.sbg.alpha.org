import { record } from "./drafts.ts";
import { isUuid } from "./staff.ts";
import { evaluationTextLength, isEvaluationPerson } from "./evaluations.ts";
import type { EvaluationPerson } from "./evaluations.ts";
import type { Intake } from "./applications.ts";

export type IntakeStatus = "open" | "paused" | "closed";
export type IntakeAction = "pause" | "resume" | "close";
export type IntakeState = Intake & { version: number; updatedAt: string; canPause: boolean; canResume: boolean; canClose: boolean };
export type IntakeCommand = { action: IntakeAction; expectedVersion: number; reason: string; mutationId: string };
export type IntakeReceipt = { state: IntakeStatus; version: number; updatedAt: string };
export type IntakeEvent = { id: string; action: IntakeAction; previousState: "open" | "paused"; state: IntakeStatus; reason: string; version: number; actor: EvaluationPerson; createdAt: string };
export type IntakeHistory = { items: IntakeEvent[]; nextOffset: number | null };
export type IntakeFailure = { ok: false; code: "AUTH_REQUIRED" | "ACCOUNT_CHANGED" | "MFA_REQUIRED" | "DENIED" | "CONFLICT" | "VALIDATION" | "UNAVAILABLE"; message: string };
export type IntakeResult<T> = { ok: true; data: T } | IntakeFailure;
const version = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0 && Number(v) < 2147483647;
const timestamp = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
const status = (v: unknown): v is IntakeStatus => ["open", "paused", "closed"].includes(String(v));
export const intakeAccessLost = (code: IntakeFailure["code"]) => ["AUTH_REQUIRED", "ACCOUNT_CHANGED", "MFA_REQUIRED", "DENIED"].includes(code);
export function isIntakeCommand(v: unknown): v is IntakeCommand {
  return record(v) && Object.keys(v).sort().join(",") === "action,expectedVersion,mutationId,reason"
    && ["pause", "resume", "close"].includes(String(v.action)) && version(v.expectedVersion) && isUuid(v.mutationId)
    && typeof v.reason === "string" && v.reason.trim().length > 0 && evaluationTextLength(v.reason) <= 500;
}
export function isIntakeReceipt(v: unknown): v is IntakeReceipt {
  return record(v) && status(v.state) && version(v.version) && timestamp(v.updatedAt);
}
export function isIntakeState(v: unknown): v is IntakeState {
  if (!record(v) || !status(v.state) || !version(v.version) || !timestamp(v.updatedAt) || !timestamp(v.opensAt) || !timestamp(v.closesAt) || !timestamp(v.serverNow) || Date.parse(v.opensAt) >= Date.parse(v.closesAt)) return false;
  const beforeClose = Date.parse(v.serverNow) < Date.parse(v.closesAt);
  return v.accepting === (v.state === "open" && beforeClose && Date.parse(v.serverNow) >= Date.parse(v.opensAt))
    && v.canPause === (v.state === "open" && beforeClose) && v.canResume === (v.state === "paused" && beforeClose) && v.canClose === (v.state !== "closed");
}
export function isIntakeHistory(v: unknown): v is IntakeHistory {
  return record(v) && (v.nextOffset === null || Number.isSafeInteger(v.nextOffset) && Number(v.nextOffset) >= 0 && Number(v.nextOffset) <= 100000)
    && Array.isArray(v.items) && v.items.length <= 25 && v.items.every(e => record(e) && isUuid(e.id) && ["pause", "resume", "close"].includes(String(e.action))
      && ["open", "paused"].includes(String(e.previousState)) && status(e.state) && version(e.version) && typeof e.reason === "string" && !!e.reason.trim()
      && evaluationTextLength(e.reason) <= 500 && isEvaluationPerson(e.actor) && timestamp(e.createdAt));
}
export function isIntakeFailure(v: unknown): v is IntakeFailure {
  return record(v) && v.ok === false && ["AUTH_REQUIRED", "ACCOUNT_CHANGED", "MFA_REQUIRED", "DENIED", "CONFLICT", "VALIDATION", "UNAVAILABLE"].includes(String(v.code)) && typeof v.message === "string" && v.message.length <= 500;
}
export function acceptIntakeState(current: IntakeState | null, incoming: IntakeState): IntakeState {
  return current && (incoming.version < current.version || incoming.version === current.version && Date.parse(incoming.serverNow) < Date.parse(current.serverNow)) ? current : incoming;
}
export function intakeAvailability(intake: Intake): string {
  if (intake.state === "closed") return "Intake is closed. You can keep saving and editing your draft.";
  if (Date.parse(intake.serverNow) >= Date.parse(intake.closesAt)) return "The submission deadline has passed. You can keep saving and editing your draft.";
  if (intake.state === "paused") return "Intake is paused. You can keep saving and editing your draft and check availability again later.";
  if (Date.parse(intake.serverNow) < Date.parse(intake.opensAt)) return "Intake has not opened yet. You can keep saving and editing your draft until submissions open.";
  if (!intake.accepting) return "Intake is not accepting submissions. Refresh availability for the latest details. You can keep saving and editing your draft.";
  return "Submit once you have reviewed your answers. Submission locks ordinary editing.";
}
