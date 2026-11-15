import { applicationStatuses } from "./applications.ts";
import type { ApplicationStatus } from "./applications.ts";
import { getOpportunity, questionIds, opportunityLabel } from "./catalog.ts";
import { isDraftInput, record } from "./drafts.ts";
import type { DraftInput } from "./drafts.ts";
import { isQueueFilters } from "./application-queue.ts";
import type { QueueFilters } from "./application-queue.ts";
import { isStaffFailure } from "./staff.ts";
import type { StaffFailure } from "./staff.ts";

export const EXPORT_MAX_BYTES = 64 * 1024 * 1024;
export type ExportRow = Pick<DraftInput, "profile" | "track" | "opportunityId" | "answers" | "accuracy" | "processingConsent" | "updatesConsent"> & {
  formVersion?: 1 | 2;
  reference: string; email: string; status: ApplicationStatus; submittedAt: string; withdrawnAt: string | null;
};
export type ExportSnapshot = { filters: QueueFilters; generatedAt: string; total: number; rows: ExportRow[] };
export type ExportFailure = StaffFailure | { ok: false; code: "TOO_LARGE" | "CANCELLED"; message: string };
export type ExportResult = { ok: true; blob: Blob; filename: string; count: number } | ExportFailure;
const date = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).sort().join(",") === keys.sort().join(",");
export function isExportSnapshot(v: unknown): v is ExportSnapshot {
  return record(v) && exact(v, ["filters", "generatedAt", "total", "rows"]) && isQueueFilters(v.filters) && date(v.generatedAt)
    && Number.isSafeInteger(v.total) && Number(v.total) >= 0 && Array.isArray(v.rows) && v.rows.length === v.total && v.rows.every(row =>
      record(row) && exact(row, ["reference", "email", "status", "submittedAt", "withdrawnAt", "profile", "track", "opportunityId", "answers", "accuracy", "processingConsent", "updatesConsent", ...(row.formVersion === undefined ? [] : ["formVersion"])])
      && (row.formVersion === undefined || row.formVersion === 1 || row.formVersion === 2)
      && typeof row.reference === "string" && /^ALPHA-2026-[A-F0-9]{12}$/.test(row.reference)
      && typeof row.email === "string" && row.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)
      && applicationStatuses.includes(row.status as ApplicationStatus) && date(row.submittedAt)
      && (row.status === "Withdrawn" ? date(row.withdrawnAt) : row.withdrawnAt === null)
      && !!getOpportunity(String(row.opportunityId))
      && isDraftInput({ ...(row.formVersion === 2 ? { formVersion: 2, scenarioReviewedOpportunityId: "" } : {}), profile: row.profile, track: row.track, opportunityId: row.opportunityId, answers: row.answers,
        accuracy: row.accuracy, processingConsent: row.processingConsent, updatesConsent: row.updatesConsent, resumeUrl: "", portfolioUrl: "", stage: 0 }));
}
export function isExportFailure(v: unknown): v is ExportFailure {
  return isStaffFailure(v) || record(v) && v.ok === false && ["TOO_LARGE", "CANCELLED"].includes(String(v.code)) && typeof v.message === "string" && v.message.length <= 500;
}
export const exportHeaders = ["Application reference", "Public status", "Submitted at (Asia/Manila)", "Withdrawn at (Asia/Manila)",
  "Full name", "Preferred name", "Email", "Mobile", "University", "Other university", "Campus", "Degree or program", "Program level", "Academic year", "Academic year explanation", "Currently enrolled",
  "Track", "Opportunity ID", "Opportunity", "Available days", "Experience", "Reason for joining", "Collaboration", "Time commitment", "Pathway answer", "Scenario answer", "Accuracy confirmed", "Recruitment processing consent", "Community updates consent", "Form version"] as const;
export function philippineTimestamp(value: string | null) {
  return value ? new Date(Date.parse(value) + 8 * 60 * 60 * 1000).toISOString().replace("Z", "+08:00") : "";
}
/** Escape the cell boundary first; neutralize formula prefixes without changing stored answers. */
export function csvCell(value: string | boolean) {
  const text = typeof value === "boolean" ? value ? "Yes" : "No" : value;
  const dangerous = /^[\s\p{Cc}\p{Cf}]*[=+\-@＝＋－＠]/u.test(text) || /^[\t\r\n]/.test(text);
  return '"' + (dangerous ? "'" : "") + text.replaceAll('"', '""') + '"';
}
export function exportFilename(generatedAt: string) {
  return "alpha-applications-2026-" + philippineTimestamp(generatedAt).slice(0, 19).replaceAll(/[-:T]/g, "") + "-PHT.csv";
}
export class ExportTooLarge extends Error {}
export function createExportChunks(snapshot: ExportSnapshot, maxBytes = EXPORT_MAX_BYTES, signal?: AbortSignal, deadline = Infinity) {
  const encoder = new TextEncoder(), chunks: Uint8Array[] = [];
  let bytes = 0;
  function add(cells: readonly (string | boolean)[], bom = "") {
    signal?.throwIfAborted();
    if (Date.now() >= deadline) throw new Error("Export deadline passed");
    const chunk = encoder.encode(bom + cells.map(csvCell).join(",") + "\r\n");
    bytes += chunk.byteLength;
    if (bytes > maxBytes) throw new ExportTooLarge("Narrow the applied filters before exporting.");
    chunks.push(chunk);
  }
  add(exportHeaders, "\ufeff");
  for (const row of snapshot.rows) {
    const p = row.profile, opportunity = getOpportunity(row.opportunityId);
    if (!opportunity) throw new Error("Unknown export opportunity");
    add([row.reference, row.status, philippineTimestamp(row.submittedAt), philippineTimestamp(row.withdrawnAt),
      p.fullName, p.preferredName, row.email, p.mobile, p.university, p.otherUniversity, p.campus, p.program, p.programLevel, p.year, p.yearExplanation, p.enrolled,
      row.track === "CORE_TEAM" ? "Core Team" : "Committee", row.opportunityId, opportunityLabel(opportunity), p.availability.join("; "), p.experience,
      ...questionIds.map(id => row.answers[id]), row.accuracy, row.processingConsent, row.updatesConsent, String(row.formVersion ?? 1)]);
  }
  return { chunks, bytes };
}
