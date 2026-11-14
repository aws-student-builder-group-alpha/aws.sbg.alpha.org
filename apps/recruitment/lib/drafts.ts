import { getOpportunity, questionIds } from "./catalog.ts";
import type { Profile, QuestionId, Track } from "./catalog.ts";

export const PRIVACY_VERSION = "2026-10-18";
export const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const profileLimits = { fullName: 120, preferredName: 60, mobile: 32, university: 160, otherUniversity: 160, campus: 120, program: 160, programLevel: 20, year: 10, yearExplanation: 160, experience: 2000 } as const;
export type DraftInput = {
  formVersion?: 2;
  scenarioReviewedOpportunityId?: string;
  profile: Omit<Profile, "email">;
  track: Track;
  opportunityId: string;
  answers: Record<QuestionId, string>;
  resumeUrl: string;
  portfolioUrl: string;
  accuracy: boolean;
  processingConsent: boolean;
  updatesConsent: boolean;
  stage: number;
};
export type Applicant = { id: string; email: string; name: string };
export type Draft = Omit<DraftInput, "profile"> & {
  profile: Profile;
  id: string;
  version: number;
  savedAt: string;
  status: "Draft";
};
export type DraftCode = "VALIDATION" | "UNAUTHENTICATED" | "ACCOUNT_CHANGED" | "STAFF_ACCOUNT" | "CONFLICT" | "SUBMITTED" | "UNAVAILABLE";
export type SaveResult = { ok: true; draft: Draft } | { ok: false; code: DraftCode; message: string; errors?: Record<string, string> };
export type SaveRequest = { accountId: string; payload: DraftInput; expectedVersion: number; mutationId: string };

export function emptyDraftInput(formVersion: 1 | 2 = 1): DraftInput {
  return {
    ...(formVersion === 2 ? { formVersion: 2 as const, scenarioReviewedOpportunityId: "" } : {}),
    profile: { fullName: "", preferredName: "", mobile: "", university: "", otherUniversity: "", campus: "", program: "", programLevel: "", year: "", yearExplanation: "", enrolled: false, availability: [], experience: "" },
    track: "CORE_TEAM", opportunityId: "",
    answers: { motivation: "", collaboration: "", availability: "", pathway: "", scenario: "" },
    resumeUrl: "", portfolioUrl: "", accuracy: false, processingConsent: false, updatesConsent: false, stage: 1,
  };
}
export function editableDraft(draft: Draft): DraftInput {
  const profile = { ...draft.profile };
  const { email: ignoredEmail, ...editableProfile } = profile;
  void ignoredEmail;
  return { ...(draft.formVersion === 2 ? { formVersion: 2 as const, scenarioReviewedOpportunityId: draft.scenarioReviewedOpportunityId } : {}), profile: editableProfile, track: draft.track, opportunityId: draft.opportunityId, answers: { ...draft.answers }, resumeUrl: draft.resumeUrl, portfolioUrl: draft.portfolioUrl, accuracy: draft.accuracy, processingConsent: draft.processingConsent, updatesConsent: draft.updatesConsent, stage: draft.stage };
}
/** Preserve old text; the next ordinary acknowledged save records the upgrade. */
export function upgradeDraft(draft: Draft): Draft {
  if (draft.formVersion === 2) return draft;
  return { ...draft, formVersion: 2, scenarioReviewedOpportunityId: draft.opportunityId,
    stage: draft.stage === 0 ? 1 : draft.stage === 4 ? 5 : draft.stage };
}
export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
}
export function isEvidenceUrl(value: string) {
  if (!value) return true;
  try { const url = new URL(value); return value.length <= 2048 && !/[\s\\]/u.test(value) && url.protocol === "https:" && !!url.hostname && !url.username && !url.password; } catch { return false; }
}
export function validateDraft(value: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  const base = emptyDraftInput(record(value) && value.formVersion === 2 ? 2 : 1);
  if (!record(value) || !exactKeys(value, Object.keys(base))) return { form: "The draft contains unsupported or missing fields. Reload and try again." };
  if (value.formVersion === 2 && (typeof value.scenarioReviewedOpportunityId !== "string" || value.scenarioReviewedOpportunityId !== "" && !getOpportunity(value.scenarioReviewedOpportunityId))) errors.scenarioReviewedOpportunityId = "Review the scenario for your current opportunity.";
  if (new TextEncoder().encode(JSON.stringify(value)).length > 65536) return { form: "This draft is too large to save. Shorten your answers." };
  if (!record(value.profile) || !exactKeys(value.profile, Object.keys(base.profile))) return { form: "The profile contains unsupported or missing fields." };
  for (const [key, limit] of Object.entries(profileLimits)) {
    const field = value.profile[key];
    if (typeof field !== "string" || field.length > limit) errors[key] = `Use no more than ${limit} characters.`;
  }
  if (typeof value.profile.enrolled !== "boolean") errors.enrolled = "Choose your enrollment status.";
  if (!Array.isArray(value.profile.availability) || value.profile.availability.length > 7 || value.profile.availability.some(day => typeof day !== "string" || !days.includes(day)) || new Set(value.profile.availability).size !== value.profile.availability.length) errors.availabilityDays = "Choose valid, distinct days.";
  if (!["", "undergraduate", "postgraduate", "other"].includes(String(value.profile.programLevel))) errors.programLevel = "Choose a supported program level.";
  if (!["", "1", "2", "3", "4", "5", "6+", "other"].includes(String(value.profile.year))) errors.year = "Choose a supported academic year.";
  if (value.track !== "CORE_TEAM" && value.track !== "COMMITTEE" && value.track !== "MEMBER") errors.track = "Choose a supported track.";
  if (typeof value.opportunityId !== "string" || (value.opportunityId !== "" && getOpportunity(value.opportunityId)?.track !== value.track)) errors.opportunityId = "Choose an opportunity in your track.";
  if (!record(value.answers) || !exactKeys(value.answers, [...questionIds])) errors.form = "Use the approved application questions.";
  else for (const id of questionIds) if (typeof value.answers[id] !== "string" || value.answers[id].length > 10000) errors[id] = "Keep this answer under 10,000 characters. You can save an incomplete answer.";
  for (const key of ["resumeUrl", "portfolioUrl"] as const) if (typeof value[key] !== "string" || !isEvidenceUrl(value[key])) errors[key] = "Use a complete HTTPS link without a username or password, up to 2,048 characters.";
  for (const key of ["accuracy", "processingConsent", "updatesConsent"]) if (typeof value[key] !== "boolean") errors[key] = "Choose a valid consent or declaration value.";
  if (value.processingConsent !== true) errors.processingConsent = "Recruitment processing consent is required to save your draft.";
  if (!Number.isInteger(value.stage) || Number(value.stage) < 0 || Number(value.stage) > 5) errors.stage = "Choose a valid form step.";
  return errors;
}
export function isDraftInput(value: unknown): value is DraftInput { return Object.keys(validateDraft(value)).length === 0; }
// Structural safety is separate from field validity: a mistyped URL must not
// suppress required-field feedback elsewhere in an otherwise typed draft.
export function hasDraftShape(value: unknown): value is DraftInput {
  const base = emptyDraftInput(record(value) && value.formVersion === 2 ? 2 : 1);
  if (!record(value) || !exactKeys(value, Object.keys(base)) || !record(value.profile) || !exactKeys(value.profile, Object.keys(base.profile)) || !record(value.answers) || !exactKeys(value.answers, [...questionIds])) return false;
  return Object.keys(profileLimits).every(key => typeof (value.profile as Record<string, unknown>)[key] === "string")
    && typeof value.profile.enrolled === "boolean" && Array.isArray(value.profile.availability) && value.profile.availability.every(day => typeof day === "string")
    && ["", "undergraduate", "postgraduate", "other"].includes(String(value.profile.programLevel))
    && ["", "1", "2", "3", "4", "5", "6+", "other"].includes(String(value.profile.year))
    && (value.track === "CORE_TEAM" || value.track === "COMMITTEE" || value.track === "MEMBER") && typeof value.opportunityId === "string"
    && questionIds.every(key => typeof (value.answers as Record<string, unknown>)[key] === "string")
    && typeof value.resumeUrl === "string" && typeof value.portfolioUrl === "string"
    && typeof value.accuracy === "boolean" && typeof value.processingConsent === "boolean" && typeof value.updatesConsent === "boolean" && typeof value.stage === "number";
}
export function isSaveRequest(value: unknown): value is SaveRequest {
  return record(value) && exactKeys(value, ["accountId", "payload", "expectedVersion", "mutationId"]) && typeof value.accountId === "string" && Number.isSafeInteger(value.expectedVersion) && Number(value.expectedVersion) >= 0 && Number(value.expectedVersion) < 2147483647 && typeof value.mutationId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.mutationId) && isDraftInput(value.payload);
}
export function draftFromRow(value: unknown, email: string): Draft | null {
  if (!record(value) || !isDraftInput(value.data) || typeof value.id !== "string" || !/^[0-9a-f-]{36}$/i.test(value.id) || typeof value.version !== "number" || !Number.isSafeInteger(value.version) || Number(value.version) < 1 || typeof value.updated_at !== "string" || !Number.isFinite(Date.parse(value.updated_at)) || value.status !== "Draft") return null;
  return { ...value.data, profile: { ...value.data.profile, email }, id: value.id, version: value.version, savedAt: value.updated_at, status: "Draft" };
}
