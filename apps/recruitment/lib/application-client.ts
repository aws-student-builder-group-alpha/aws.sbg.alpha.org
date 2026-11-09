import { isApplicationFailure, isApplicationState, isSubmittedApplication } from "./applications.ts";
import type { ApplicationCommand, ApplicationResult, ApplicationState, SubmittedApplication } from "./applications.ts";
import { draftFromRow, record } from "./drafts.ts";
import type { SaveRequest, SaveResult } from "./drafts.ts";
import { fetchJson, COMMAND_TIMEOUT_MS } from "./http-request.ts";

const unavailable = () => ({ ok: false as const, code: "UNAVAILABLE" as const, message: "The change could not be confirmed and may have completed. Retry the same request or check the latest details." });
export async function saveApplicantDraft(request: SaveRequest): Promise<SaveResult> {
  try {
    const { response, data } = await fetchJson("/api/application", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", request }) }, COMMAND_TIMEOUT_MS);
    if (response.ok && record(data) && data.ok === true && record(data.draft) && record(data.draft.profile) && typeof data.draft.profile.email === "string") {
      const { email, ...profile } = data.draft.profile;
      const { id, version, savedAt, status, ...input } = data.draft;
      const draft = draftFromRow({ id, version, status, data: { ...input, profile }, updated_at: savedAt }, email);
      if (draft) return { ok: true, draft };
    }
    if (!response.ok && isApplicationFailure(data) && ["VALIDATION","UNAUTHENTICATED","ACCOUNT_CHANGED","STAFF_ACCOUNT","CONFLICT","SUBMITTED","UNAVAILABLE"].includes(data.code)) return data as Extract<SaveResult, { ok: false }>;
    return unavailable();
  } catch { return unavailable(); }
}
export async function applicationCommand(request: ApplicationCommand, signal?: AbortSignal): Promise<ApplicationResult<SubmittedApplication>> {
  try {
    const { response, data } = await fetchJson("/api/application", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal }, COMMAND_TIMEOUT_MS);
    if (response.ok && record(data) && data.ok === true && isSubmittedApplication(data.data)) return { ok: true, data: data.data };
    return !response.ok && isApplicationFailure(data) ? data : unavailable();
  } catch { return unavailable(); }
}
export async function applicationState(accountId: string, signal?: AbortSignal): Promise<ApplicationResult<ApplicationState>> {
  try {
    const { response, data } = await fetchJson("/api/application?accountId=" + encodeURIComponent(accountId), { signal });
    if (response.ok && record(data) && data.ok === true && isApplicationState(data.data)) return { ok: true, data: data.data };
    return !response.ok && isApplicationFailure(data) ? data : { ok: false, code: "UNAVAILABLE", message: "The latest application details could not be loaded. Retry shortly." };
  } catch { return { ok: false, code: "UNAVAILABLE", message: "The latest application details could not be loaded. Retry shortly." }; }
}
