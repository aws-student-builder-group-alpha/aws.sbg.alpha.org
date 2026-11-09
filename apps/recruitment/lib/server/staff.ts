import "server-only";
import { accountSession } from "./session";
import { isStaffHistory, isStaffMember, isUuid, validateStaffRequest } from "@/lib/staff";
import type { StaffFailure, StaffResult, StaffMember, StaffHistory } from "@/lib/staff";

export async function staffAdminSession(accountId?: string) {
  const session = await accountSession();
  if (session.kind === "anonymous") return { ok: false, code: "AUTH_REQUIRED", message: "Sign in again to continue." } as const;
  if (session.kind === "unconfigured" || session.kind === "unavailable") return { ok: false, code: "UNAVAILABLE", message: "Staff access could not be verified. Please retry." } as const;
  if (accountId && session.identity.id !== accountId) return { ok: false, code: "ACCOUNT_CHANGED", message: "A different account is signed in. Reload before continuing." } as const;
  if (session.kind !== "staff" || session.membership.role !== "administrator" || session.membership.status !== "active") return { ok: false, code: "DENIED", message: "Administrator access is no longer available for this account." } as const;
  if (session.needsMfa) return { ok: false, code: "MFA_REQUIRED", message: "Verify your authenticator code before continuing." } as const;
  return { ok: true, session } as const;
}

export function staffDatabaseError(code?: string): StaffFailure {
  if (code === "42501") return { ok: false, code: "DENIED", message: "This operation is no longer permitted. Reload to check your access." };
  if (code === "PT409" || code === "40001") return { ok: false, code: "CONFLICT", message: "Staff access changed in another session. Reload the latest details before making another change." };
  if (code === "P0002") return { ok: false, code: "NOT_FOUND", message: "That Google account has not signed in yet. Ask them to use Staff sign-in once, then try again." };
  if (code === "22023") return { ok: false, code: "VALIDATION", message: "Check the account, role, access state, and reason. This change could not be applied." };
  if (code === "23514") return { ok: false, code: "VALIDATION", message: "At least one active administrator must remain." };
  return { ok: false, code: "UNAVAILABLE", message: "The change could not be confirmed. Keep the same confirmation open and retry." };
}

export async function changeStaffAccess(accountId: unknown, request: unknown): Promise<StaffResult<StaffMember>> {
  if (!isUuid(accountId)) return { ok: false, code: "VALIDATION", message: "Reload to verify the signed-in account." };
  const access = await staffAdminSession(accountId);
  if (!access.ok) return access;
  if (!validateStaffRequest(request)) return { ok: false, code: "VALIDATION", message: "Check the email, role, and reason before confirming this change." };
  try {
    const { data, error } = await access.session.client.rpc("manage_staff_access", { p_request: request });
    if (error) return staffDatabaseError(error.code);
    return isStaffMember(data) ? { ok: true, data } : staffDatabaseError();
  } catch { return staffDatabaseError(); }
}

export async function listStaff(accountId?: string): Promise<StaffResult<StaffMember[]>> {
  const access = await staffAdminSession(accountId);
  if (!access.ok) return access;
  try {
    const { data, error } = await access.session.client.rpc("list_staff_members");
    if (error) return staffDatabaseError(error.code);
    if (!Array.isArray(data) || !data.every(isStaffMember)) return staffDatabaseError();
    return { ok: true, data };
  } catch { return staffDatabaseError(); }
}

export async function staffHistory(accountId: string, targetId: string, beforeVersion?: number): Promise<StaffResult<StaffHistory[]>> {
  const access = await staffAdminSession(accountId);
  if (!access.ok) return access;
  try {
    const { data, error } = await access.session.client.rpc("list_staff_history", { p_target_id: targetId, ...(beforeVersion ? { p_before_version: beforeVersion } : {}) });
    if (error) return staffDatabaseError(error.code);
    if (!Array.isArray(data) || !data.every(isStaffHistory)) return staffDatabaseError();
    return { ok: true, data };
  } catch { return staffDatabaseError(); }
}
