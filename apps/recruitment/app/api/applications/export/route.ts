import { readApplicationExport, exportTooLarge, exportUnavailable } from "@/lib/server/application-export";
import { createExportChunks, ExportTooLarge, exportFilename } from "@/lib/application-export";
import type { ExportFailure } from "@/lib/application-export";
import { record } from "@/lib/drafts";
import { isUuid } from "@/lib/staff";
import { getAppOrigin } from "@/lib/supabase/config";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
function failure(result: ExportFailure) {
  const status = result.code === "AUTH_REQUIRED" ? 401 : ["ACCOUNT_CHANGED", "DENIED", "MFA_REQUIRED"].includes(result.code) ? 403 : result.code === "VALIDATION" ? 422 : result.code === "TOO_LARGE" ? 413 : 503;
  return Response.json(result, { status, headers });
}
const invalid = () => failure({ ok: false, code: "VALIDATION", message: "Invalid CSV export request." });
export async function POST(request: Request) {
  if (request.headers.get("origin") !== getAppOrigin()) return failure({ ok: false, code: "DENIED", message: "Use the application's Export CSV control." });
  if (new URL(request.url).search || request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return invalid();
  const controller = new AbortController(), abort = () => controller.abort();
  const deadline = Date.now() + 15000;
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) controller.abort();
  const timer = setTimeout(abort, 15000);
  const reader = request.body?.getReader();
  const cancel = () => { void reader?.cancel().catch(() => {}); };
  controller.signal.addEventListener("abort", cancel, { once: true });
  try {
    if (!reader) return invalid();
    let text = "", length = 0;
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (controller.signal.aborted) return failure(exportUnavailable());
      if (done) break;
      length += value.byteLength;
      if (length > 8192) { void reader.cancel().catch(() => {}); return invalid(); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    let body: unknown;
    try { body = JSON.parse(text); } catch { return invalid(); }
    if (!record(body) || Object.keys(body).sort().join(",") !== "accountId,filters" || !isUuid(body.accountId)) return invalid();
    const result = await readApplicationExport(body.accountId, body.filters, controller.signal);
    if (!result.ok) return failure(result);
    if (controller.signal.aborted) return failure(exportUnavailable());
    const { chunks, bytes } = createExportChunks(result.data, undefined, controller.signal, deadline);
    let index = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(target) { if (request.signal.aborted) target.error(new Error("Download cancelled")); else if (index < chunks.length) target.enqueue(chunks[index++]); else { chunks.length = 0; target.close(); } },
      cancel() { chunks.length = 0; },
    });
    return new Response(stream, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${exportFilename(result.data.generatedAt)}"`, "X-Export-Rows": String(result.data.total), "X-Export-Bytes": String(bytes) } });
  } catch (error) { return failure(error instanceof ExportTooLarge ? exportTooLarge() : exportUnavailable()); }
  finally { clearTimeout(timer); controller.signal.removeEventListener("abort", cancel); request.signal.removeEventListener("abort", abort); reader?.releaseLock(); }
}
