import { applicationStatuses } from "./applications.ts";
import type { ApplicationStatus } from "./applications.ts";
import { record } from "./drafts.ts";
import { evaluationTextLength, isEvaluationPerson, isRecommendation } from "./evaluations.ts";
import type { EvaluationFailure, EvaluationPerson, Recommendation } from "./evaluations.ts";
import { isUuid } from "./staff.ts";

export type DecisionState = {
  applicationId: string; applicationVersion: number; status: ApplicationStatus;
  assignmentId: string | null; assignmentGeneration: number; reviewVersion: number; recommendation: Recommendation | null;
  capacity: number | null; accepted: number; canPublish: boolean; canAmend: boolean;
};
export type DecisionCommand = {
  action: "publish" | "amend"; applicationId: string; assignmentId: string;
  expectedApplicationVersion: number; expectedReviewVersion: number;
  outcome: Recommendation; reason: string; mutationId: string;
};
export type DecisionReceipt = { applicationId: string; applicationVersion: number; status: Recommendation; updatedAt: string };
export type DecisionEvent = {
  id: string; action: "publish" | "amend"; previousStatus: "Under Review" | Recommendation; outcome: Recommendation;
  reason: string; applicationVersion: number; assignmentId: string; reviewVersion: number; actor: EvaluationPerson; createdAt: string;
};
export type DecisionHistory = { items: DecisionEvent[]; nextOffset: number | null };
export type DecisionFailure = Omit<EvaluationFailure, "code"> & { code: EvaluationFailure["code"] | "CAPACITY_FULL" };
export type DecisionResult<T> = { ok: true; data: T } | DecisionFailure;
const integer = (v: unknown, min = 0): v is number => Number.isSafeInteger(v) && Number(v) >= min && Number(v) < 2147483647;
const timestamp = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
export const decisionAccessLost = (code: DecisionFailure["code"]) => ["AUTH_REQUIRED", "ACCOUNT_CHANGED", "MFA_REQUIRED", "DENIED", "NOT_FOUND"].includes(code);
export function isDecisionState(v: unknown): v is DecisionState {
  return record(v) && isUuid(v.applicationId) && integer(v.applicationVersion, 1) && applicationStatuses.includes(v.status as ApplicationStatus)
    && (v.assignmentId === null || isUuid(v.assignmentId)) && integer(v.assignmentGeneration) && integer(v.reviewVersion) && (v.recommendation === null || isRecommendation(v.recommendation))
    && (v.capacity === null || integer(v.capacity, 1)) && integer(v.accepted) && typeof v.canPublish === "boolean" && typeof v.canAmend === "boolean";
}
export function isDecisionCommand(v: unknown): v is DecisionCommand {
  return record(v) && Object.keys(v).sort().join(",") === "action,applicationId,assignmentId,expectedApplicationVersion,expectedReviewVersion,mutationId,outcome,reason"
    && isUuid(v.applicationId) && isUuid(v.assignmentId) && isUuid(v.mutationId) && integer(v.expectedApplicationVersion, 1) && integer(v.expectedReviewVersion, 1)
    && isRecommendation(v.outcome) && typeof v.reason === "string" && evaluationTextLength(v.reason) <= 500
    && (v.action === "publish" && v.reason === "" || v.action === "amend" && v.reason.trim().length > 0);
}
export function isDecisionReceipt(v: unknown): v is DecisionReceipt {
  return record(v) && isUuid(v.applicationId) && integer(v.applicationVersion, 1) && isRecommendation(v.status) && timestamp(v.updatedAt);
}
export function isDecisionHistory(v: unknown): v is DecisionHistory {
  return record(v) && (v.nextOffset === null || integer(v.nextOffset) && v.nextOffset <= 100000) && Array.isArray(v.items) && v.items.length <= 25
    && v.items.every(e => record(e) && isUuid(e.id) && ["publish", "amend"].includes(String(e.action)) && (e.previousStatus === "Under Review" || isRecommendation(e.previousStatus))
      && isRecommendation(e.outcome) && typeof e.reason === "string" && evaluationTextLength(e.reason) <= 500 && integer(e.applicationVersion, 1)
      && isUuid(e.assignmentId) && integer(e.reviewVersion, 1) && isEvaluationPerson(e.actor) && timestamp(e.createdAt));
}
export function isDecisionFailure(v: unknown): v is DecisionFailure {
  return record(v) && v.ok === false && ["AUTH_REQUIRED", "ACCOUNT_CHANGED", "MFA_REQUIRED", "DENIED", "CONFLICT", "NOT_FOUND", "VALIDATION", "UNAVAILABLE", "CAPACITY_FULL"].includes(String(v.code)) && typeof v.message === "string" && v.message.length <= 500;
}
export function acceptDecisionState(current: DecisionState | null, incoming: DecisionState): DecisionState {
  if (!current || current.applicationId !== incoming.applicationId) return incoming;
  return incoming.applicationVersion < current.applicationVersion || incoming.assignmentGeneration < current.assignmentGeneration || incoming.applicationVersion === current.applicationVersion && incoming.reviewVersion < current.reviewVersion && incoming.assignmentId === current.assignmentId ? current : incoming;
}
