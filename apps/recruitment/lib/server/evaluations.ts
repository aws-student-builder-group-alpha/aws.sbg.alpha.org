import "server-only";
import { accountSession } from "./session";
import { isUuid } from "@/lib/staff";
import { isEvaluationCommand, isEvaluationDetail, isEvaluationHistory, isEvaluationList, isEvaluationReceipt } from "@/lib/evaluations";
import type { EvaluationDetail, EvaluationFailure, EvaluationHistory, EvaluationList, EvaluationReceipt, EvaluationResult } from "@/lib/evaluations";
import { defaultQueueFilters, isQueueFilters, sameQueueFilters } from "@/lib/application-queue";
import type { QueueFilters } from "@/lib/application-queue";

async function evaluationSession(accountId: string) {
  if (!isUuid(accountId)) return { ok: false, code: "VALIDATION", message: "Reload to verify your account." } as const;
  const session = await accountSession();
  if (session.kind === "anonymous") return { ok: false, code: "AUTH_REQUIRED", message: "Sign in again to continue." } as const;
  if (session.kind === "unavailable" || session.kind === "unconfigured") return { ok: false, code: "UNAVAILABLE", message: "Staff access could not be verified. Retry shortly." } as const;
  if (session.identity.id !== accountId) return { ok: false, code: "ACCOUNT_CHANGED", message: "A different account is signed in. Reload before continuing." } as const;
  if (session.kind !== "staff" || session.membership.status !== "active") return { ok: false, code: "DENIED", message: "Active staff access is required." } as const;
  if (session.membership.role === "administrator" && session.needsMfa) return { ok: false, code: "MFA_REQUIRED", message: "Verify your authenticator before continuing." } as const;
  return { ok: true, session } as const;
}
export function evaluationDatabaseError(code?: string): EvaluationFailure {
  if (code === "42501") return { ok: false, code: "DENIED", message: "This assignment is no longer available to your account. Reload your applications." };
  if (code === "PT409") return { ok: false, code: "CONFLICT", message: "This application or recommendation changed in another session. Reload the latest details before making another change." };
  if (code === "P0002") return { ok: false, code: "NOT_FOUND", message: "This application is unavailable. Reload your applications." };
  if (["22023", "22P02", "22003", "23514"].includes(code ?? "")) return { ok: false, code: "VALIDATION", message: "Check the evaluator, reassignment reason, recommendation, and note limits." };
  return { ok: false, code: "UNAVAILABLE", message: "The result could not be confirmed. Retry the same request or check the latest details." };
}
export async function listEvaluations(accountId: string, offset = 0, search = "", filters?: QueueFilters): Promise<EvaluationResult<EvaluationList>> {
  const access = await evaluationSession(accountId);
  if (!access.ok) return access;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000 || search.length > 100) return { ok: false, code: "VALIDATION", message: "Invalid application list request." };
  const queueFilters = { ...(filters ?? defaultQueueFilters), search };
  if (!isQueueFilters(queueFilters)) return { ok: false, code: "VALIDATION", message: "Check the application queue filters." };
  if (filters && access.session.membership.role !== "administrator") return { ok: false, code: "DENIED", message: "Application queue filters require administrator access." };
  try {
    if (access.session.membership.role === "administrator") {
      const { data, error } = await access.session.client.rpc("admin_application_queue", { p_offset: offset, p_filters: queueFilters });
      return !error && isEvaluationList(data) && data.role === "administrator" && data.queue && sameQueueFilters(data.queue.filters, queueFilters) ? { ok: true, data } : evaluationDatabaseError(error?.code);
    }
    const { data, error } = await access.session.client.rpc("evaluation_list", { p_offset: offset, p_search: search });
    return !error && isEvaluationList(data) ? { ok: true, data } : evaluationDatabaseError(error?.code);
  } catch { return evaluationDatabaseError(); }
}
export async function readEvaluation(accountId: string, applicationId: string): Promise<EvaluationResult<EvaluationDetail>> {
  const access = await evaluationSession(accountId);
  if (!access.ok) return access;
  if (!isUuid(applicationId)) return { ok: false, code: "VALIDATION", message: "Invalid application." };
  try {
    const { data, error } = await access.session.client.rpc("evaluation_detail", { p_application_id: applicationId });
    return !error && isEvaluationDetail(data) ? { ok: true, data } : evaluationDatabaseError(error?.code);
  } catch { return evaluationDatabaseError(); }
}
export async function readEvaluationHistory(accountId: string, applicationId: string, offset = 0): Promise<EvaluationResult<EvaluationHistory>> {
  const access = await evaluationSession(accountId);
  if (!access.ok) return access;
  if (!isUuid(applicationId) || !Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return { ok: false, code: "VALIDATION", message: "Invalid history request." };
  try {
    const { data, error } = await access.session.client.rpc("evaluation_history", { p_application_id: applicationId, p_offset: offset });
    return !error && isEvaluationHistory(data) ? { ok: true, data } : evaluationDatabaseError(error?.code);
  } catch { return evaluationDatabaseError(); }
}
export async function changeEvaluation(accountId: string, request: unknown): Promise<EvaluationResult<EvaluationReceipt>> {
  const access = await evaluationSession(accountId);
  if (!access.ok) return access;
  if (!isEvaluationCommand(request)) return { ok: false, code: "VALIDATION", message: "Invalid evaluation request. Check your fields and reload if needed." };
  if ((request.action === "assign") !== (access.session.membership.role === "administrator")) return { ok: false, code: "DENIED", message: "This operation is unavailable for your staff role." };
  try {
    const { data, error } = await access.session.client.rpc("manage_evaluation", { p_request: request });
    return !error && isEvaluationReceipt(data) ? { ok: true, data } : evaluationDatabaseError(error?.code);
  } catch { return evaluationDatabaseError(); }
}
