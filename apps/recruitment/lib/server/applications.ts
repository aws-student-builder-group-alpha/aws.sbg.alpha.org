import "server-only";
import { isApplicationCommand, isApplicationState, isSubmittedApplication } from "@/lib/applications";
import type { ApplicationResult, ApplicationState, SubmittedApplication } from "@/lib/applications";
import { record } from "@/lib/drafts";
import { applicantSession } from "./session";

export async function readApplication(accountId: string): Promise<ApplicationResult<ApplicationState>> {
  const session = await applicantSession();
  if (session.kind === "staff") return { ok: false, code: "STAFF_ACCOUNT", message: "Use a separate applicant account. This account has staff access." };
  if (session.kind !== "authenticated") return { ok: false, code: session.kind === "anonymous" ? "UNAUTHENTICATED" : "UNAVAILABLE", message: "Your application could not be loaded. Check your sign-in and retry." };
  if (session.applicant.id !== accountId) return { ok: false, code: "ACCOUNT_CHANGED", message: "Sign back in to the original account to view this application." };
  try {
    const { data, error } = await session.client.rpc("get_application_state");
    return !error && isApplicationState(data) ? { ok: true, data } : { ok: false, code: error?.code === "42501" ? "DENIED" : "UNAVAILABLE", message: "Your application could not be loaded. Check your access and retry." };
  } catch { return { ok: false, code: "UNAVAILABLE", message: "Your application could not be loaded. Retry shortly." }; }
}

export async function changeApplication(request: unknown): Promise<ApplicationResult<SubmittedApplication>> {
  const session = await applicantSession();
  if (session.kind === "staff") return { ok: false, code: "STAFF_ACCOUNT", message: "This account has staff access and cannot use applicant workflows." };
  if (session.kind !== "authenticated") return { ok: false, code: session.kind === "anonymous" ? "UNAUTHENTICATED" : "UNAVAILABLE", message: "Check your sign-in in another tab, then retry this same confirmation." };
  if (!isApplicationCommand(request)) return { ok: false, code: "VALIDATION", message: "Invalid application request. Reload the latest details." };
  if (request.accountId !== session.applicant.id) return { ok: false, code: "ACCOUNT_CHANGED", message: "Sign back in to the original account before retrying." };
  try {
    const { data, error } = await session.client.rpc(request.action === "submit" ? "submit_applicant_application" : "withdraw_applicant_application", { p_expected_version: request.expectedVersion, p_mutation_id: request.mutationId });
    if (error) {
      if (error.code === "PT422") {
        let errors: Record<string, string> | undefined;
        try { const detail: unknown = JSON.parse(error.details); if (record(detail) && Object.keys(detail).length <= 32 && Object.values(detail).every(value => typeof value === "string" && value.length <= 300)) errors = detail as Record<string, string>; } catch {}
        return { ok: false, code: "VALIDATION", message: "Check your application before submitting.", errors };
      }
      if (error.code === "PT409") return { ok: false, code: "CONFLICT", message: "This application changed in another session. Reload the latest details before making another change." };
      if (error.code === "PT423") return { ok: false, code: "INTAKE_CLOSED", message: "Intake is currently unavailable. You can keep saving your draft. Recruitment runs 1–30 November 2026, Philippine time." };
      if (error.code === "42501") return { ok: false, code: "DENIED", message: "Applicant access is no longer available. Check your account before continuing." };
      if (error.code === "P0002") return { ok: false, code: "NOT_FOUND", message: "No submitted application was found. Reload the latest details." };
      if (["22023", "23514"].includes(error.code)) return { ok: false, code: "VALIDATION", message: "This confirmation is invalid. Reload the latest details." };
      return { ok: false, code: "UNAVAILABLE", message: "The change could not be confirmed and may have completed. Retry this same confirmation or check the latest details." };
    }
    return isSubmittedApplication(data) ? { ok: true, data } : { ok: false, code: "UNAVAILABLE", message: "The change could not be confirmed. Retry this same confirmation." };
  } catch { return { ok: false, code: "UNAVAILABLE", message: "The change could not be confirmed and may have completed. Retry this same confirmation." }; }
}
