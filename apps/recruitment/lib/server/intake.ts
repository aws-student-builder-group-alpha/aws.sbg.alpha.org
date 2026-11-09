import "server-only";
import { accountSession } from "./session";
import { isUuid } from "@/lib/staff";
import { isIntakeCommand, isIntakeHistory, isIntakeReceipt, isIntakeState } from "@/lib/intake";
import type { IntakeFailure, IntakeHistory, IntakeReceipt, IntakeResult, IntakeState } from "@/lib/intake";

async function intakeSession(accountId: string) {
  if (!isUuid(accountId)) return { ok: false, code: "VALIDATION", message: "Reload to verify your account." } as const;
  const session = await accountSession();
  if (session.kind === "anonymous") return { ok: false, code: "AUTH_REQUIRED", message: "Sign in again to continue." } as const;
  if (session.kind === "unavailable" || session.kind === "unconfigured") return { ok: false, code: "UNAVAILABLE", message: "Administrator access could not be verified. Retry shortly." } as const;
  if (session.identity.id !== accountId) return { ok: false, code: "ACCOUNT_CHANGED", message: "A different account is signed in. Reload before continuing." } as const;
  if (session.kind !== "staff" || session.membership.role !== "administrator" || session.membership.status !== "active") return { ok: false, code: "DENIED", message: "Active administrator access is required." } as const;
  if (session.needsMfa) return { ok: false, code: "MFA_REQUIRED", message: "Verify your authenticator before continuing." } as const;
  return { ok: true, session } as const;
}
export function intakeDatabaseError(code?: string): IntakeFailure {
  if (code === "42501") return { ok: false, code: "DENIED", message: "Administrator access is no longer available. Check staff access." };
  if (code === "PT409") return { ok: false, code: "CONFLICT", message: "Intake changed in another session or the deadline passed. Reload the latest details before another confirmation." };
  if (["22023", "22P02", "22003", "23514"].includes(code ?? "")) return { ok: false, code: "VALIDATION", message: "Choose an available intake change and provide a private reason of up to 500 characters." };
  return { ok: false, code: "UNAVAILABLE", message: "The result could not be confirmed. Retry the same confirmation or check the latest details." };
}
export async function readIntake(accountId: string): Promise<IntakeResult<IntakeState>> {
  const access = await intakeSession(accountId);
  if (!access.ok) return access;
  try {
    const { data, error } = await access.session.client.rpc("intake_state");
    return !error && isIntakeState(data) ? { ok: true, data } : intakeDatabaseError(error?.code);
  } catch { return intakeDatabaseError(); }
}
export async function readIntakeHistory(accountId: string, offset = 0): Promise<IntakeResult<IntakeHistory>> {
  const access = await intakeSession(accountId);
  if (!access.ok) return access;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return { ok: false, code: "VALIDATION", message: "Invalid history request." };
  try {
    const { data, error } = await access.session.client.rpc("intake_history_page", { p_offset: offset });
    return !error && isIntakeHistory(data) ? { ok: true, data } : intakeDatabaseError(error?.code);
  } catch { return intakeDatabaseError(); }
}
export async function changeIntake(accountId: string, request: unknown): Promise<IntakeResult<IntakeReceipt>> {
  const access = await intakeSession(accountId);
  if (!access.ok) return access;
  if (!isIntakeCommand(request)) return { ok: false, code: "VALIDATION", message: "Invalid intake confirmation. Check the action and private reason." };
  try {
    const { data, error } = await access.session.client.rpc("manage_intake", { p_request: request });
    return !error && isIntakeReceipt(data) ? { ok: true, data } : intakeDatabaseError(error?.code);
  } catch { return intakeDatabaseError(); }
}
