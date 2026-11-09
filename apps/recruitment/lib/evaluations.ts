import { applicationStatuses, isSubmittedApplication } from "./applications.ts";
import type { SubmittedApplication } from "./applications.ts";
import { record } from "./drafts.ts";
import { isUuid } from "./staff.ts";
import { isApplicationQueue } from "./application-queue.ts";
import type { ApplicationQueue } from "./application-queue.ts";

export const recommendations = ["Accepted", "Waitlisted", "Not Selected"] as const;
export type Recommendation = typeof recommendations[number];
export type EvaluationRole = "administrator" | "evaluator";
export type EvaluationPerson = { id: string; email: string };
export type EvaluationAssignment = { id: string; generation: number; evaluator: EvaluationPerson; assignedAt: string };
export type EvaluationReview = { version: number; recommendation: Recommendation; notes: string; updatedAt: string };
export type EvaluationSummary = {
  id: string; reference: string; name: string; opportunityId: string; status: SubmittedApplication["status"];
  version: number; submittedAt: string; assignment: EvaluationAssignment | null; recommendation: Recommendation | null; reviewVersion: number;
};
export type EvaluationList = { role: EvaluationRole; items: EvaluationSummary[]; evaluators: EvaluationPerson[]; nextOffset: number | null; queue?: ApplicationQueue };
export type EvaluationDetail = { role: EvaluationRole; application: SubmittedApplication; assignment: EvaluationAssignment | null; review: EvaluationReview | null; canEdit: boolean };
export type EvaluationEvent = {
  id: string; kind: "assignment" | "review"; generation: number; evaluator: EvaluationPerson; actor: EvaluationPerson;
  createdAt: string; reason: string | null; recommendation: Recommendation | null; notes: string | null; reviewVersion: number | null;
};
export type EvaluationHistory = { items: EvaluationEvent[]; nextOffset: number | null };
export type AssignEvaluation = {
  action: "assign"; applicationId: string; evaluatorId: string; expectedApplicationVersion: number;
  expectedAssignmentId: string | null; mutationId: string; reason: string;
};
export type SaveEvaluationReview = {
  action: "save_review"; applicationId: string; assignmentId: string; expectedVersion: number;
  mutationId: string; recommendation: Recommendation; notes: string;
};
export type EvaluationCommand = AssignEvaluation | SaveEvaluationReview;
export type EvaluationReceipt = {
  applicationId: string; applicationVersion: number; status: SubmittedApplication["status"];
  assignmentId: string; generation: number; reviewVersion: number; updatedAt: string;
};
export type EvaluationFailure = { ok: false; code: "AUTH_REQUIRED" | "ACCOUNT_CHANGED" | "MFA_REQUIRED" | "DENIED" | "CONFLICT" | "NOT_FOUND" | "VALIDATION" | "UNAVAILABLE"; message: string };
export type EvaluationResult<T> = { ok: true; data: T } | EvaluationFailure;
const integer = (n: unknown, min = 0): n is number => Number.isSafeInteger(n) && Number(n) >= min && Number(n) < 2147483647;
const timestamp = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
const role = (v: unknown): v is EvaluationRole => v === "administrator" || v === "evaluator";
const status = (v: unknown) => applicationStatuses.includes(v as SubmittedApplication["status"]);
export const evaluationTextLength = (v: string) => Array.from(v).length;
export const isRecommendation = (v: unknown): v is Recommendation => recommendations.includes(v as Recommendation);
export const isEvaluationPerson = (v: unknown): v is EvaluationPerson => record(v) && isUuid(v.id) && typeof v.email === "string" && v.email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email);
export const isEvaluationAssignment = (v: unknown): v is EvaluationAssignment => record(v) && isUuid(v.id) && integer(v.generation, 1) && isEvaluationPerson(v.evaluator) && timestamp(v.assignedAt);
const review = (v: unknown): v is EvaluationReview => record(v) && integer(v.version, 1) && isRecommendation(v.recommendation) && typeof v.notes === "string" && evaluationTextLength(v.notes) <= 5000 && timestamp(v.updatedAt);
const nextOffset = (v: unknown) => v === null || integer(v) && v <= 100000;
export function isEvaluationList(v: unknown): v is EvaluationList {
  return record(v) && role(v.role) && nextOffset(v.nextOffset) && Array.isArray(v.evaluators) && v.evaluators.every(isEvaluationPerson)
    && (v.queue === undefined || v.role === "administrator" && isApplicationQueue(v.queue))
    && Array.isArray(v.items) && v.items.length <= 25 && v.items.every(i => record(i) && isUuid(i.id) && typeof i.reference === "string"
      && /^ALPHA-2026-[A-F0-9]{12}$/.test(i.reference) && typeof i.name === "string" && typeof i.opportunityId === "string"
      && status(i.status) && integer(i.version, 1) && timestamp(i.submittedAt) && (i.assignment === null || isEvaluationAssignment(i.assignment))
      && (i.recommendation === null || isRecommendation(i.recommendation)) && integer(i.reviewVersion));
}
export function isEvaluationDetail(v: unknown): v is EvaluationDetail {
  return record(v) && role(v.role) && isSubmittedApplication(v.application) && (v.assignment === null || isEvaluationAssignment(v.assignment))
    && (v.review === null || review(v.review)) && typeof v.canEdit === "boolean";
}
export function isEvaluationHistory(v: unknown): v is EvaluationHistory {
  return record(v) && nextOffset(v.nextOffset) && Array.isArray(v.items) && v.items.length <= 25 && v.items.every(e => record(e)
    && isUuid(e.id) && ["assignment", "review"].includes(String(e.kind)) && integer(e.generation, 1)
    && isEvaluationPerson(e.evaluator) && isEvaluationPerson(e.actor) && timestamp(e.createdAt)
    && (e.kind === "assignment" ? typeof e.reason === "string" && evaluationTextLength(e.reason) <= 500 && e.recommendation === null && e.notes === null && e.reviewVersion === null
      : e.reason === null && isRecommendation(e.recommendation) && typeof e.notes === "string" && evaluationTextLength(e.notes) <= 5000 && integer(e.reviewVersion, 1)));
}
export function isEvaluationReceipt(v: unknown): v is EvaluationReceipt {
  return record(v) && isUuid(v.applicationId) && integer(v.applicationVersion, 1) && status(v.status) && isUuid(v.assignmentId)
    && integer(v.generation, 1) && integer(v.reviewVersion) && timestamp(v.updatedAt);
}
export function isEvaluationCommand(v: unknown): v is EvaluationCommand {
  if (!record(v) || !isUuid(v.applicationId) || !isUuid(v.mutationId)) return false;
  if (v.action === "assign") return Object.keys(v).sort().join(",") === "action,applicationId,evaluatorId,expectedApplicationVersion,expectedAssignmentId,mutationId,reason"
    && isUuid(v.evaluatorId) && integer(v.expectedApplicationVersion, 1) && (v.expectedAssignmentId === null || isUuid(v.expectedAssignmentId)) && typeof v.reason === "string" && evaluationTextLength(v.reason) <= 500;
  return v.action === "save_review" && Object.keys(v).sort().join(",") === "action,applicationId,assignmentId,expectedVersion,mutationId,notes,recommendation"
    && isUuid(v.assignmentId) && integer(v.expectedVersion) && isRecommendation(v.recommendation) && typeof v.notes === "string" && evaluationTextLength(v.notes) <= 5000;
}
export function isEvaluationFailure(v: unknown): v is EvaluationFailure {
  return record(v) && v.ok === false && ["AUTH_REQUIRED", "ACCOUNT_CHANGED", "MFA_REQUIRED", "DENIED", "CONFLICT", "NOT_FOUND", "VALIDATION", "UNAVAILABLE"].includes(String(v.code)) && typeof v.message === "string" && v.message.length <= 500;
}
/** A late read/retry cannot replace a newer public revision, assignment generation, or review. */
export function acceptEvaluationDetail(current: EvaluationDetail | null, incoming: EvaluationDetail): EvaluationDetail {
  if (!current || current.application.id !== incoming.application.id) return incoming;
  if (incoming.application.version < current.application.version || (incoming.assignment?.generation ?? 0) < (current.assignment?.generation ?? 0)) return current;
  if (incoming.assignment?.id === current.assignment?.id && (incoming.review?.version ?? 0) < (current.review?.version ?? 0)) return current;
  return incoming;
}
