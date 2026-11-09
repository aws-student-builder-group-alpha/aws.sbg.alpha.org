import { hasDraftShape, isDraftInput, record, validateDraft } from "./drafts.ts";
import type { DraftInput, DraftCode } from "./drafts.ts";
import { isCoreEligible, normalizePhone, questionsFor, wordCount } from "./catalog.ts";

export type Intake = { opensAt: string; closesAt: string; state: "open" | "paused" | "closed"; serverNow: string; accepting: boolean };
export const applicationStatuses = ["Submitted", "Under Review", "Accepted", "Waitlisted", "Not Selected", "Withdrawn"] as const;
export type ApplicationStatus = typeof applicationStatuses[number];
export type SubmittedApplication = {
  id: string; reference: string; email: string; data: DraftInput;
  status: ApplicationStatus; version: number; submittedAt: string; withdrawnAt: string | null;
  history: { status: ApplicationStatus; createdAt: string }[];
};
export type ApplicationState = { application: SubmittedApplication | null; intake: Intake };
export type ApplicationCode = DraftCode | "INTAKE_CLOSED" | "NOT_FOUND" | "DENIED";
export type ApplicationFailure = { ok: false; code: ApplicationCode; message: string; errors?: Record<string, string> };
export type ApplicationResult<T> = { ok: true; data: T } | ApplicationFailure;
export type ApplicationCommand = { action: "submit" | "withdraw"; accountId: string; expectedVersion: number; mutationId: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const timestamp = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
export function isApplicationCommand(value: unknown): value is ApplicationCommand {
  return record(value) && Object.keys(value).sort().join(",") === "accountId,action,expectedVersion,mutationId"
    && ["submit", "withdraw"].includes(String(value.action)) && typeof value.accountId === "string" && uuid.test(value.accountId)
    && Number.isSafeInteger(value.expectedVersion) && Number(value.expectedVersion) > 0 && Number(value.expectedVersion) < 2147483647
    && typeof value.mutationId === "string" && uuid.test(value.mutationId);
}
export function isIntake(value: unknown): value is Intake {
  return record(value) && timestamp(value.opensAt) && timestamp(value.closesAt) && timestamp(value.serverNow)
    && ["open", "paused", "closed"].includes(String(value.state)) && typeof value.accepting === "boolean"
    && Date.parse(value.closesAt) > Date.parse(value.opensAt);
}
export function isSubmittedApplication(value: unknown): value is SubmittedApplication {
  return record(value) && typeof value.id === "string" && uuid.test(value.id) && typeof value.reference === "string" && /^ALPHA-2026-[A-F0-9]{12}$/.test(value.reference)
    && typeof value.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) && isDraftInput(value.data)
    && applicationStatuses.includes(value.status as ApplicationStatus) && Number.isSafeInteger(value.version) && Number(value.version) > 0
    && timestamp(value.submittedAt) && (value.status !== "Withdrawn" ? value.withdrawnAt === null : timestamp(value.withdrawnAt))
    && Array.isArray(value.history) && value.history.length > 0 && value.history.every(event => record(event)
      && applicationStatuses.includes(event.status as ApplicationStatus) && timestamp(event.createdAt));
}
export function isApplicationState(value: unknown): value is ApplicationState {
  return record(value) && (value.application === null || isSubmittedApplication(value.application)) && isIntake(value.intake);
}
export function isApplicationFailure(value: unknown): value is ApplicationFailure {
  return record(value) && value.ok === false && typeof value.code === "string" && typeof value.message === "string"
    && ["VALIDATION", "UNAUTHENTICATED", "ACCOUNT_CHANGED", "STAFF_ACCOUNT", "CONFLICT", "SUBMITTED", "UNAVAILABLE", "INTAKE_CLOSED", "NOT_FOUND", "DENIED"].includes(value.code)
    && (value.errors === undefined || record(value.errors) && Object.values(value.errors).every(error => typeof error === "string"));
}
export function validateSubmission(value: unknown): Record<string, string> {
  const errors = validateDraft(value);
  if (!hasDraftShape(value)) return errors;
  const p = value.profile;
  if (p.fullName.trim().length < 2) errors.fullName = "Enter your full name (2–120 characters).";
  if (p.mobile && !/^\+?\d{7,15}$/.test(normalizePhone(p.mobile))) errors.mobile = "Use a phone number with 7–15 digits.";
  if (!p.university.trim()) errors.university = "Choose your university.";
  if (p.university === "Other" && !p.otherUniversity.trim()) errors.otherUniversity = "Enter your university name.";
  if (!p.program.trim()) errors.program = "Enter your degree or program.";
  if (!p.programLevel) errors.programLevel = "Choose your program level.";
  if (!p.year) errors.year = "Choose your current academic year.";
  if (p.year === "other" && !p.yearExplanation.trim()) errors.yearExplanation = "Tell us your academic standing.";
  if (!p.enrolled) errors.enrolled = "Confirm that you are currently enrolled.";
  if (value.track === "CORE_TEAM" && !isCoreEligible({ ...p, email: "" })) errors.eligibility = "Core Team requires an enrolled first- or second-year undergraduate.";
  if (!value.opportunityId) errors.opportunityId = "Choose an opportunity in your selected track.";
  if (!p.availability.length) errors.availabilityDays = "Choose at least one available day.";
  if (value.formVersion !== 2 && !p.experience.trim()) errors.experience = "Tell us about your experience or interests. Beginners are welcome.";
  for (const q of questionsFor(value.opportunityId, value.formVersion)) {
    const count = wordCount(value.answers[q.id]);
    if (count < q.min || count > q.max) errors[q.id] = value.formVersion === 2 ? count === 0 ? "Add a response in your own words." : `Keep this response to 150 words or fewer. You currently have ${count}.` : `Write ${q.min}–${q.max} words. You currently have ${count}.`;
  }
  if (value.formVersion === 2 && value.scenarioReviewedOpportunityId !== value.opportunityId) errors.scenarioReviewedOpportunityId = "Confirm that you reviewed your scenario response for this opportunity.";
  if (!value.resumeUrl.trim()) errors.resumeUrl = "Add a resume link before submitting.";
  if (!value.accuracy) errors.accuracy = "Confirm that your application is accurate.";
  return errors;
}
