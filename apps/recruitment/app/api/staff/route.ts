import { NextResponse } from "next/server";
import { changeStaffAccess, listStaff, staffHistory } from "@/lib/server/staff";
import { isUuid } from "@/lib/staff";
import { record } from "@/lib/drafts";
import { getAppOrigin } from "@/lib/supabase/config";
import type { StaffResult } from "@/lib/staff";

function staffResponse(result: StaffResult<unknown>) {
  const status = result.ok ? 200 : result.code === "AUTH_REQUIRED" ? 401 : ["DENIED", "MFA_REQUIRED", "ACCOUNT_CHANGED"].includes(result.code) ? 403 : result.code === "CONFLICT" ? 409 : result.code === "NOT_FOUND" ? 404 : result.code === "VALIDATION" ? 422 : 503;
  return NextResponse.json(result, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== getAppOrigin()) return staffResponse({ ok: false, code: "DENIED", message: "Use Staff management from this application's origin." });
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return staffResponse({ ok: false, code: "VALIDATION", message: "Send a JSON staff request." });
    const reader = request.body?.getReader();
    if (!reader) return staffResponse({ ok: false, code: "VALIDATION", message: "Invalid staff request." });
    let text = "", length = 0;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 8192) { await reader.cancel(); return staffResponse({ ok: false, code: "VALIDATION", message: "The staff request is too large." }); }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    let body: unknown;
    try { body = JSON.parse(text); } catch { return staffResponse({ ok: false, code: "VALIDATION", message: "Invalid JSON staff request." }); }
    if (!record(body) || Object.keys(body).sort().join(",") !== "accountId,request") return staffResponse({ ok: false, code: "VALIDATION", message: "Invalid staff request." });
    return staffResponse(await changeStaffAccess(body.accountId, body.request));
  } catch { return staffResponse({ ok: false, code: "UNAVAILABLE", message: "The change could not be confirmed. Retry the same confirmation." }); }
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const accountId = query.get("accountId");
  const targetId = query.get("targetId");
  const before = query.get("beforeVersion");
  let result: StaffResult<unknown>;
  if (!isUuid(accountId) || (targetId && !isUuid(targetId)) || (before && (!targetId || !/^[1-9][0-9]{0,8}$/.test(before)))) {
    result = { ok: false, code: "VALIDATION", message: "Invalid staff request." };
  } else {
    result = targetId ? await staffHistory(accountId, targetId, before ? Number(before) : undefined) : await listStaff(accountId);
  }
  return staffResponse(result);
}
