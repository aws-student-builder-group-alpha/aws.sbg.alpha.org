import { EXPORT_MAX_BYTES, isExportFailure } from "./application-export.ts";
import type { ExportResult } from "./application-export.ts";
import type { QueueFilters } from "./application-queue.ts";
import { recruitmentPath } from "./site-paths.ts";

export async function downloadApplicationExport(accountId: string, filters: QueueFilters, signal?: AbortSignal): Promise<ExportResult> {
  const controller = new AbortController(), abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 15000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cancel = () => { void reader?.cancel().catch(() => {}); };
  controller.signal.addEventListener("abort", cancel, { once: true });
  try {
    const response = await fetch(recruitmentPath("/api/applications/export"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, filters }), signal: controller.signal, cache: "no-store" });
    if (!response.ok) { const error: unknown = await response.json(); if (isExportFailure(error)) return error; throw new Error("Invalid export failure"); }
    const filename = /^attachment; filename="(alpha-applications-2026-\d{14}-PHT\.csv)"$/.exec(response.headers.get("content-disposition") ?? "")?.[1];
    const rawBytes = response.headers.get("x-export-bytes") ?? "", rawCount = response.headers.get("x-export-rows") ?? "";
    if (!filename || response.headers.get("content-type")?.split(";")[0] !== "text/csv" || !/^\d+$/.test(rawBytes) || !/^\d+$/.test(rawCount)) throw new Error("Invalid CSV headers");
    const expected = Number(rawBytes), count = Number(rawCount);
    if (!Number.isSafeInteger(expected) || expected < 1 || expected > EXPORT_MAX_BYTES || !Number.isSafeInteger(count)) throw new Error("Invalid CSV size");
    reader = response.body?.getReader();
    if (!reader) throw new Error("Missing CSV body");
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let bytes = 0;
    while (true) {
      controller.signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > EXPORT_MAX_BYTES || bytes > expected) throw new Error("CSV too large");
      chunks.push(new Uint8Array(value));
    }
    controller.signal.throwIfAborted();
    if (bytes !== expected) throw new Error("Incomplete CSV");
    return { ok: true, blob: new Blob(chunks, { type: "text/csv;charset=utf-8" }), filename, count };
  } catch {
    return signal?.aborted ? { ok: false, code: "CANCELLED", message: "CSV export canceled. Your edits are preserved." } : { ok: false, code: "UNAVAILABLE", message: "The CSV could not be downloaded. Retry the export; your edits are preserved." };
  } finally {
    clearTimeout(timer); signal?.removeEventListener("abort", abort); controller.signal.removeEventListener("abort", cancel);
    if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
}
