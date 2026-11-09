import "server-only";
import { accountSession } from "./session";
import { isUuid } from "@/lib/staff";
import { isDecisionCommand, isDecisionHistory, isDecisionReceipt, isDecisionState } from "@/lib/decisions";
import type { DecisionFailure, DecisionHistory, DecisionReceipt, DecisionResult, DecisionState } from "@/lib/decisions";

async function decisionSession(accountId: string) {
  if (!isUuid(accountId)) return { ok: false, code: "VALIDATION", message: "Reload to verify your account." } as const;
  const session = await accountSession();
  if (session.kind === "anonymous") return { ok: false, code: "AUTH_REQUIRED", message: "Sign in again to continue." } as const;
  if (session.kind === "unavailable" || session.kind === "unconfigured") return { ok: false, code: "UNAVAILABLE", message: "Administrator access could not be verified. Retry shortly." } as const;
  if (session.identity.id !== accountId) return { ok: false, code: "ACCOUNT_CHANGED", message: "A different account is signed in. Reload before continuing." } as const;
  if (session.kind !== "staff" || session.membership.role !== "administrator" || session.membership.status !== "active") return { ok: false, code: "DENIED", message: "Active administrator access is required." } as const;
  if (session.needsMfa) return { ok: false, code: "MFA_REQUIRED", message: "Verify your authenticator before continuing." } as const;
  return { ok: true, session } as const;
}
export function decisionDatabaseError(code?: string, details?: string): DecisionFailure {
  if (code === "42501") return { ok: false, code: "DENIED", message: "Administrator access is no longer available. Check staff access." };
  if (code === "PT409" && details === "CAPACITY_FULL") return { ok: false, code: "CAPACITY_FULL", message: "No accepted places remain for this opportunity. Choose another outcome or refresh capacity before trying again." };
  if (code === "PT409") return { ok: false, code: "CONFLICT", message: "The application, assignment or recommendation changed. Reload the latest details before another confirmation." };
  if (code === "P0002") return { ok: false, code: "NOT_FOUND", message: "This application is unavailable." };
  if (["22023", "22P02", "22003", "23514"].includes(code ?? "")) return { ok: false, code: "VALIDATION", message: "Choose a different outcome and provide a reason of up to 500 characters when amending." };
  return { ok: false, code: "UNAVAILABLE", message: "The result could not be confirmed. Retry the same confirmation or check the latest details." };
}
export async function readDecision(accountId: string, applicationId: string): Promise<DecisionResult<DecisionState>> {
  const access = await decisionSession(accountId);
  if (!access.ok) return access;
  if (!isUuid(applicationId)) return { ok: false, code: "VALIDATION", message: "Invalid application." };
  try {
    const { data, error } = await access.session.client.rpc("decision_state", { p_application_id: applicationId });
    return !error && isDecisionState(data) ? { ok: true, data } : decisionDatabaseError(error?.code, error?.details);
  } catch { return decisionDatabaseError(); }
}
export async function readDecisionHistory(accountId: string, applicationId: string, offset = 0): Promise<DecisionResult<DecisionHistory>> {
  const access = await decisionSession(accountId);
  if (!access.ok) return access;
  if (!isUuid(applicationId) || !Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return { ok: false, code: "VALIDATION", message: "Invalid history request." };
  try {
    const { data, error } = await access.session.client.rpc("decision_history_page", { p_application_id: applicationId, p_offset: offset });
    return !error && isDecisionHistory(data) ? { ok: true, data } : decisionDatabaseError(error?.code, error?.details);
  } catch { return decisionDatabaseError(); }
}
export async function changeDecision(accountId: string, request: unknown): Promise<DecisionResult<DecisionReceipt>> {
  const access = await decisionSession(accountId);
  if (!access.ok) return access;
  if (!isDecisionCommand(request)) return { ok: false, code: "VALIDATION", message: "Invalid decision confirmation. Check the outcome and amendment reason." };
  try {
    const { data, error } = await access.session.client.rpc("manage_decision", { p_request: request });
    return !error && isDecisionReceipt(data) ? { ok: true, data } : decisionDatabaseError(error?.code, error?.details);
  } catch { return decisionDatabaseError(); }
}
