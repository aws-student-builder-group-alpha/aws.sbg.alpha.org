import { fetchJson, COMMAND_TIMEOUT_MS } from "./http-request.ts";
import { record } from "./drafts.ts";
import { isDecisionFailure, isDecisionHistory, isDecisionReceipt, isDecisionState } from "./decisions.ts";
import type { DecisionCommand, DecisionHistory, DecisionReceipt, DecisionResult, DecisionState } from "./decisions.ts";

const unavailable = () => ({ ok: false as const, code: "UNAVAILABLE" as const, message: "The result could not be confirmed. Retry the same confirmation or check the latest decision details." });
async function read<T>(accountId: string, applicationId: string, mode: string, offset: number, guard: (v: unknown) => v is T, signal?: AbortSignal): Promise<DecisionResult<T>> {
  try {
    const { response, data } = await fetchJson("/api/decisions?" + new URLSearchParams({ accountId, applicationId, mode, offset: String(offset) }), { signal });
    return response.ok && record(data) && data.ok === true && guard(data.data) ? { ok: true, data: data.data } : !response.ok && isDecisionFailure(data) ? data : unavailable();
  } catch { return unavailable(); }
}
export const decisionState = (accountId: string, applicationId: string, signal?: AbortSignal): Promise<DecisionResult<DecisionState>> => read(accountId, applicationId, "state", 0, isDecisionState, signal);
export const decisionHistory = (accountId: string, applicationId: string, offset = 0, signal?: AbortSignal): Promise<DecisionResult<DecisionHistory>> => read(accountId, applicationId, "history", offset, isDecisionHistory, signal);
export async function decisionCommand(accountId: string, request: DecisionCommand, signal?: AbortSignal): Promise<DecisionResult<DecisionReceipt>> {
  try {
    const { response, data } = await fetchJson("/api/decisions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, request }), signal }, COMMAND_TIMEOUT_MS);
    return response.ok && record(data) && data.ok === true && isDecisionReceipt(data.data) ? { ok: true, data: data.data } : !response.ok && isDecisionFailure(data) ? data : unavailable();
  } catch { return unavailable(); }
}
