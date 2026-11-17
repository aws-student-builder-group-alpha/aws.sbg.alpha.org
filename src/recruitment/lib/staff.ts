import { record } from "./drafts.ts";

export const staffRoles = ["administrator", "evaluator"] as const;
export const staffStatuses = ["active", "suspended", "revoked"] as const;
export const staffActions = ["grant", "change_role", "suspend", "reactivate", "revoke", "restore"] as const;
export type StaffRole = typeof staffRoles[number];
export type StaffStatus = typeof staffStatuses[number];
export type StaffAction = typeof staffActions[number];
export type Membership = { userId: string; role: StaffRole; status: StaffStatus; version: number };
export type StaffMember = Membership & { email: string; createdAt: string; updatedAt: string };
export type StaffHistory = {
  id: string; actorId: string | null; actorEmail: string | null;
  action: StaffAction | "bootstrap"; previousRole: StaffRole | null;
  previousStatus: StaffStatus | null; newRole: StaffRole; newStatus: StaffStatus;
  reason: string; targetVersion: number; createdAt: string;
};
export type StaffRequest = {
  action: StaffAction; email: string; targetId: string; role: StaffRole;
  expectedVersion: number; mutationId: string; reason: string;
};
export type StaffErrorCode = "VALIDATION" | "AUTH_REQUIRED" | "DENIED" | "ACCOUNT_CHANGED" | "MFA_REQUIRED" | "NOT_FOUND" | "CONFLICT" | "UNAVAILABLE";
export type StaffFailure = { ok: false; code: StaffErrorCode; message: string };
export type StaffResult<T> = { ok: true; data: T } | StaffFailure;
export function isStaffFailure(value: unknown): value is StaffFailure {
  return record(value) && value.ok === false && typeof value.message === "string" && typeof value.code === "string"
    && ["VALIDATION", "AUTH_REQUIRED", "DENIED", "ACCOUNT_CHANGED", "MFA_REQUIRED", "NOT_FOUND", "CONFLICT", "UNAVAILABLE"].includes(value.code);
}
export const roleLabel = (role: StaffRole) => role === "administrator" ? "System Admin" : "Organization Head";
export const statusLabel = (status: StaffStatus) => status[0].toUpperCase() + status.slice(1);
export const actionLabel: Record<StaffAction | "bootstrap", string> = {
  grant: "Add staff access", change_role: "Change role", suspend: "Suspend access",
  reactivate: "Reactivate access", revoke: "Revoke access", restore: "Restore access", bootstrap: "First administrator setup",
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string { return typeof value === "string" && uuid.test(value); }
export function membershipFromRow(value: unknown): Membership | null {
  if (!record(value) || !isUuid(value.user_id) || !staffRoles.includes(value.role as StaffRole) || !staffStatuses.includes(value.status as StaffStatus) || !Number.isSafeInteger(value.version) || Number(value.version) < 1) return null;
  return { userId: value.user_id, role: value.role as StaffRole, status: value.status as StaffStatus, version: Number(value.version) };
}
export function isStaffMember(value: unknown): value is StaffMember {
  return record(value) && isUuid(value.userId) && !!membershipFromRow({ user_id: value.userId, role: value.role, status: value.status, version: value.version }) && typeof value.email === "string" && typeof value.createdAt === "string" && typeof value.updatedAt === "string";
}
export function isStaffHistory(value: unknown): value is StaffHistory {
  return record(value) && isUuid(value.id) && (value.actorId === null || isUuid(value.actorId)) && (value.actorEmail === null || typeof value.actorEmail === "string")
    && [...staffActions, "bootstrap"].includes(String(value.action)) && (value.previousRole === null || staffRoles.includes(value.previousRole as StaffRole))
    && (value.previousStatus === null || staffStatuses.includes(value.previousStatus as StaffStatus)) && staffRoles.includes(value.newRole as StaffRole)
    && staffStatuses.includes(value.newStatus as StaffStatus) && typeof value.reason === "string" && Number.isSafeInteger(value.targetVersion) && Number(value.targetVersion) > 0 && typeof value.createdAt === "string";
}
export function validateStaffRequest(value: unknown): value is StaffRequest {
  if (!record(value) || Object.keys(value).sort().join(",") !== "action,email,expectedVersion,mutationId,reason,role,targetId") return false;
  if (!staffActions.includes(value.action as StaffAction) || !staffRoles.includes(value.role as StaffRole) || typeof value.email !== "string" || typeof value.targetId !== "string"
    || typeof value.reason !== "string" || value.reason.trim().length < 1 || value.reason.trim().length > 500 || !Number.isSafeInteger(value.expectedVersion) || Number(value.expectedVersion) < 0 || Number(value.expectedVersion) > 999999999
    || typeof value.mutationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.mutationId)) return false;
  return value.action === "grant"
    ? value.expectedVersion === 0 && value.targetId === "" && value.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)
    : value.email === "" && isUuid(value.targetId) && Number(value.expectedVersion) > 0;
}
