import { NextResponse } from "next/server";
import { changeIntake, readIntake, readIntakeHistory } from "@/lib/server/intake";
import type { IntakeResult } from "@/lib/intake";
import { record } from "@/lib/drafts";
import { isUuid } from "@/lib/staff";
import { getAppOrigin } from "@/lib/supabase/config";

function response(result: IntakeResult<unknown>) {
  const status = result.ok ? 200 : result.code === "AUTH_REQUIRED" ? 401 : ["ACCOUNT_CHANGED", "DENIED", "MFA_REQUIRED"].includes(result.code) ? 403 : result.code === "CONFLICT" ? 409 : result.code === "VALIDATION" ? 422 : 503;
  return NextResponse.json(result, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}
const invalid = () => response({ ok: false, code: "VALIDATION", message: "Invalid intake request." });
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  if ([...query.keys()].some(key => !["accountId", "mode", "offset"].includes(key)) || [...new Set(query.keys())].some(key => query.getAll(key).length !== 1)) return invalid();
  const accountId = query.get("accountId"), mode = query.get("mode") ?? "state", rawOffset = query.get("offset") ?? "0";
  if (!isUuid(accountId) || !/^(0|[1-9]\d{0,5})$/.test(rawOffset) || Number(rawOffset) > 100000 || !["state", "history"].includes(mode) || mode === "state" && rawOffset !== "0") return invalid();
  return response(mode === "state" ? await readIntake(accountId) : await readIntakeHistory(accountId, Number(rawOffset)));
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== getAppOrigin()) return response({ ok: false, code: "DENIED", message: "Use this application's intake workspace." });
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return invalid();
  try {
    const reader = request.body?.getReader();
    if (!reader) return invalid();
    let text = "", length = 0;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 8192) { await reader.cancel(); return invalid(); }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    const body: unknown = JSON.parse(text);
    if (!record(body) || Object.keys(body).sort().join(",") !== "accountId,request" || !isUuid(body.accountId)) return invalid();
    return response(await changeIntake(body.accountId, body.request));
  } catch { return invalid(); }
}
