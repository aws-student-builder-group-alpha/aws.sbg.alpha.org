import "server-only";
import { staffAdminSession } from "./staff";
import { isUuid } from "@/lib/staff";
import { isQueueFilters, sameQueueFilters } from "@/lib/application-queue";
import { isExportSnapshot } from "@/lib/application-export";
import type { ExportFailure, ExportSnapshot } from "@/lib/application-export";

export const exportUnavailable = (): ExportFailure => ({ ok: false, code: "UNAVAILABLE", message: "The CSV could not be downloaded. Retry the export; your application edits are preserved." });
export const exportTooLarge = (): ExportFailure => ({ ok: false, code: "TOO_LARGE", message: "This export exceeds the 64 MiB limit. Apply narrower filters and export again." });
export async function readApplicationExport(accountId: string, filters: unknown, signal: AbortSignal): Promise<{ ok: true; data: ExportSnapshot } | ExportFailure> {
  if (!isUuid(accountId) || !isQueueFilters(filters)) return { ok: false, code: "VALIDATION", message: "Check the applied application filters and reload your account." };
  const access = await staffAdminSession(accountId);
  if (!access.ok) return access;
  const controller = new AbortController(), abort = () => controller.abort();
  if (signal.aborted) controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 8000);
  try {
    const { data, error } = await access.session.client.rpc("admin_application_export", { p_filters: filters }).abortSignal(controller.signal);
    if (controller.signal.aborted) return exportUnavailable();
    if (error?.code === "PT413") return exportTooLarge();
    if (error?.code === "42501") return { ok: false, code: "DENIED", message: "Active administrator access and authenticator verification are required." };
    if (error?.code === "22023") return { ok: false, code: "VALIDATION", message: "Check the applied application filters." };
    return !error && isExportSnapshot(data) && sameQueueFilters(data.filters, filters) ? { ok: true, data } : exportUnavailable();
  } catch { return exportUnavailable(); }
  finally { clearTimeout(timer); signal.removeEventListener("abort", abort); }
}
