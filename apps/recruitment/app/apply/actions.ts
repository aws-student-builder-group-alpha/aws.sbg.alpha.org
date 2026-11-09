"use server";

import { draftFromRow, isSaveRequest, record, validateDraft } from "@/lib/drafts";
import type { SaveResult } from "@/lib/drafts";
import { applicantSession } from "@/lib/server/session";

export async function saveApplicantDraft(request: unknown): Promise<SaveResult> {
  const session = await applicantSession();
  if (session.kind === "staff") return { ok: false, code: "STAFF_ACCOUNT", message: "This account has staff access and cannot use applicant drafts. Open Staff sign-in, or use a separate Google account to apply." };
  if (session.kind !== "authenticated") return { ok: false, code: session.kind === "anonymous" ? "UNAUTHENTICATED" : "UNAVAILABLE", message: session.kind === "anonymous" ? "Sign in again in another tab, then retry saving. Your unsaved input is still here." : "Saving is unavailable. Your unsaved input is still here; retry shortly." };
  if (!isSaveRequest(request)) return { ok: false, code: "VALIDATION", message: "Check the highlighted fields before saving.", errors: record(request) ? validateDraft(request.payload) : { form: "Invalid draft request." } };
  if (request.accountId !== session.applicant.id) return { ok: false, code: "ACCOUNT_CHANGED", message: "A different account is signed in. Sign back in to the original account before saving this draft." };
  try {
    const { data, error } = await session.client.rpc("save_applicant_draft", { p_data: request.payload, p_expected_version: request.expectedVersion, p_mutation_id: request.mutationId });
    if (error) {
      if (error.code === "PT410") return { ok: false, code: "SUBMITTED", message: "This application has already been submitted. Open My application to view its current status." };
      if (error.code === "PT409" || error.code === "40001") return { ok: false, code: "CONFLICT", message: "This draft was saved in another tab or session. Your input is preserved. Reload the saved draft only when you are ready to discard these edits." };
      if (["22023", "23514"].includes(error.code)) return { ok: false, code: "VALIDATION", message: "The draft could not be saved. Check the field values and try again." };
      return { ok: false, code: "UNAVAILABLE", message: "Saving failed. Your input is preserved; retry when the connection is available." };
    }
    const draft = draftFromRow(data, session.applicant.email);
    return draft ? { ok: true, draft } : { ok: false, code: "UNAVAILABLE", message: "The save could not be confirmed. Keep this page open and retry." };
  } catch { return { ok: false, code: "UNAVAILABLE", message: "Saving failed. Keep this page open and retry; your input is preserved." }; }
}
