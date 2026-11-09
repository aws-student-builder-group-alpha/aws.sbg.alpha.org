import { record } from "./drafts.ts";
import { fetchJson, STAFF_COMMAND_TIMEOUT_MS } from "./http-request.ts";
import { isStaffFailure, isStaffMember } from "./staff.ts";
import type { StaffMember, StaffRequest, StaffResult } from "./staff.ts";

export async function getStaffData<T>(accountId: string, extra: string, validate: (value: unknown) => value is T, signal?: AbortSignal): Promise<StaffResult<T[]>> {
  try {
    const { response, data } = await fetchJson(`/api/staff?accountId=${encodeURIComponent(accountId)}${extra}`, { signal });
    if (isStaffFailure(data)) return data;
    if (!response.ok || !record(data) || data.ok !== true || !Array.isArray(data.data) || !data.data.every(validate)) throw new Error("Invalid response");
    return { ok: true, data: data.data };
  } catch { return { ok: false, code: "UNAVAILABLE", message: "Staff details could not be loaded. Please retry." }; }
}

export async function postStaffChange(accountId: string, request: StaffRequest, signal?: AbortSignal): Promise<StaffResult<StaffMember>> {
  try {
    const { response, data } = await fetchJson("/api/staff", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", body: JSON.stringify({ accountId, request }), signal,
    }, STAFF_COMMAND_TIMEOUT_MS);
    if (isStaffFailure(data)) return data;
    if (!response.ok || !record(data) || data.ok !== true || !isStaffMember(data.data)) throw new Error("Invalid response");
    return { ok: true, data: data.data };
  } catch {
    return { ok: false, code: "UNAVAILABLE", message: "The change could not be confirmed and may have completed. Retry this same confirmation, or reload the latest details before making another change." };
  }
}

/** Delayed reads and recorded retries must not replace a newer known revision. */
export function mergeStaffMembers(current: StaffMember[], incoming: StaffMember[]): StaffMember[] {
  const members = new Map(current.map(member => [member.userId, member]));
  for (const member of incoming) {
    const previous = members.get(member.userId);
    if (!previous || previous.version <= member.version) members.set(member.userId, member);
  }
  return [...members.values()];
}
