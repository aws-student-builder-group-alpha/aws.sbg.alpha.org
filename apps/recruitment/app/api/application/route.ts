import { NextResponse } from "next/server";
import { changeApplication, readApplication } from "@/lib/server/applications";
import { saveApplicantDraft } from "@/app/apply/actions";
import { isSaveRequest, record } from "@/lib/drafts";
import { getAppOrigin } from "@/lib/supabase/config";
import type { ApplicationResult } from "@/lib/applications";
import type { SaveResult } from "@/lib/drafts";

function respond(result: ApplicationResult<unknown> | SaveResult) {
  const status = result.ok ? 200 : result.code === "UNAUTHENTICATED" ? 401 : ["DENIED","STAFF_ACCOUNT","ACCOUNT_CHANGED"].includes(result.code) ? 403 : result.code === "CONFLICT" ? 409 : result.code === "SUBMITTED" ? 410 : result.code === "INTAKE_CLOSED" ? 423 : result.code === "NOT_FOUND" ? 404 : result.code === "VALIDATION" ? 422 : 503;
  return NextResponse.json(result, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}
export async function GET(request: Request) {
  const accountId = new URL(request.url).searchParams.get("accountId");
  if (!accountId || !/^[0-9a-f-]{36}$/i.test(accountId)) return respond({ ok: false, code: "VALIDATION", message: "Invalid application request." });
  return respond(await readApplication(accountId));
}
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== getAppOrigin()) return respond({ ok: false, code: "DENIED", message: "Use the application from its original website." });
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return respond({ ok: false, code: "VALIDATION", message: "Send a JSON application request." });
    const reader = request.body?.getReader();
    if (!reader) return respond({ ok: false, code: "VALIDATION", message: "Invalid application request." });
    let text = "", length = 0;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 73728) { await reader.cancel(); return respond({ ok: false, code: "VALIDATION", message: "The application request is too large." }); }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    let body: unknown;
    try { body = JSON.parse(text); } catch { return respond({ ok: false, code: "VALIDATION", message: "Invalid JSON application request." }); }
    if (record(body) && body.action === "save") {
      if (Object.keys(body).sort().join(",") !== "action,request" || !isSaveRequest(body.request)) return respond({ ok: false, code: "VALIDATION", message: "Check the draft fields before saving." });
      return respond(await saveApplicantDraft(body.request));
    }
    return respond(await changeApplication(body));
  } catch { return respond({ ok: false, code: "UNAVAILABLE", message: "The change could not be confirmed. Retry the same request." }); }
}
