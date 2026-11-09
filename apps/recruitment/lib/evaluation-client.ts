import { fetchJson, COMMAND_TIMEOUT_MS } from "./http-request.ts";
import { record } from "./drafts.ts";
import { isEvaluationDetail, isEvaluationFailure, isEvaluationHistory, isEvaluationList, isEvaluationReceipt } from "./evaluations.ts";
import type { EvaluationCommand, EvaluationDetail, EvaluationHistory, EvaluationList, EvaluationReceipt, EvaluationResult } from "./evaluations.ts";
import { sameQueueFilters } from "./application-queue.ts";
import type { QueueFilters } from "./application-queue.ts";

const unavailable = () => ({ ok: false as const, code: "UNAVAILABLE" as const, message: "The result could not be confirmed. Retry the same request or check the latest details." });
async function read<T>(accountId: string, values: Record<string, string>, guard: (v: unknown) => v is T, signal?: AbortSignal): Promise<EvaluationResult<T>> {
  try {
    const query = new URLSearchParams({ accountId, ...values });
    const { response, data } = await fetchJson("/api/evaluations?" + query, { signal });
    if (response.ok && record(data) && data.ok === true && guard(data.data)) return { ok: true, data: data.data };
    return !response.ok && isEvaluationFailure(data) ? data : unavailable();
  } catch { return unavailable(); }
}
export async function evaluationList(accountId: string, offset = 0, search = "", signal?: AbortSignal, filters?: QueueFilters): Promise<EvaluationResult<EvaluationList>> {
  const result = await read(accountId, { mode: "list", offset: String(offset), search, ...(filters ? { status: filters.status, track: filters.track, opportunityId: filters.opportunityId, assignment: filters.assignment, review: filters.review } : {}) }, isEvaluationList, signal);
  if (result.ok && filters && (!result.data.queue || !sameQueueFilters(result.data.queue.filters, { ...filters, search }))) return unavailable();
  return result;
}
export const evaluationDetail = (accountId: string, applicationId: string, signal?: AbortSignal): Promise<EvaluationResult<EvaluationDetail>> => read(accountId, { mode: "detail", applicationId }, isEvaluationDetail, signal);
export const evaluationHistory = (accountId: string, applicationId: string, offset = 0, signal?: AbortSignal): Promise<EvaluationResult<EvaluationHistory>> => read(accountId, { mode: "history", applicationId, offset: String(offset) }, isEvaluationHistory, signal);
export async function evaluationCommand(accountId: string, request: EvaluationCommand, signal?: AbortSignal): Promise<EvaluationResult<EvaluationReceipt>> {
  try {
    const { response, data } = await fetchJson("/api/evaluations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, request }), signal }, COMMAND_TIMEOUT_MS);
    if (response.ok && record(data) && data.ok === true && isEvaluationReceipt(data.data)) return { ok: true, data: data.data };
    return !response.ok && isEvaluationFailure(data) ? data : unavailable();
  } catch { return unavailable(); }
}
