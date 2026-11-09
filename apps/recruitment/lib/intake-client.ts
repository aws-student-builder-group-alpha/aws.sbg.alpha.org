import { fetchJson, COMMAND_TIMEOUT_MS } from "./http-request.ts";
import { record } from "./drafts.ts";
import { isIntakeFailure, isIntakeHistory, isIntakeReceipt, isIntakeState } from "./intake.ts";
import type { IntakeCommand, IntakeHistory, IntakeReceipt, IntakeResult, IntakeState } from "./intake.ts";
const unavailable = () => ({ ok: false as const, code: "UNAVAILABLE" as const, message: "The change could not be confirmed and may have completed. Retry the same confirmation or check the latest intake details." });
async function read<T>(accountId: string, mode: string, offset: number, guard: (v: unknown) => v is T, signal?: AbortSignal): Promise<IntakeResult<T>> {
  try {
    const { response, data } = await fetchJson("/api/intake?" + new URLSearchParams({ accountId, mode, offset: String(offset) }), { signal });
    return response.ok && record(data) && data.ok === true && guard(data.data) ? { ok: true, data: data.data } : !response.ok && isIntakeFailure(data) ? data : unavailable();
  } catch { return unavailable(); }
}
export const intakeState = (accountId: string, signal?: AbortSignal): Promise<IntakeResult<IntakeState>> => read(accountId, "state", 0, isIntakeState, signal);
export const intakeHistory = (accountId: string, offset = 0, signal?: AbortSignal): Promise<IntakeResult<IntakeHistory>> => read(accountId, "history", offset, isIntakeHistory, signal);
export async function intakeCommand(accountId: string, request: IntakeCommand, signal?: AbortSignal): Promise<IntakeResult<IntakeReceipt>> {
  try {
    const { response, data } = await fetchJson("/api/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, request }), signal }, COMMAND_TIMEOUT_MS);
    return response.ok && record(data) && data.ok === true && isIntakeReceipt(data.data) ? { ok: true, data: data.data } : !response.ok && isIntakeFailure(data) ? data : unavailable();
  } catch { return unavailable(); }
}
