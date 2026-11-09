import { NextResponse } from "next/server";
import { changeEvaluation, listEvaluations, readEvaluation, readEvaluationHistory } from "@/lib/server/evaluations";
import type { EvaluationResult } from "@/lib/evaluations";
import { record } from "@/lib/drafts";
import { isUuid } from "@/lib/staff";
import { getAppOrigin } from "@/lib/supabase/config";
import { defaultQueueFilters, isQueueFilters } from "@/lib/application-queue";

function response(result: EvaluationResult<unknown>) {
  const status = result.ok ? 200 : result.code === "AUTH_REQUIRED" ? 401 : ["ACCOUNT_CHANGED", "DENIED", "MFA_REQUIRED"].includes(result.code) ? 403 : result.code === "CONFLICT" ? 409 : result.code === "NOT_FOUND" ? 404 : result.code === "VALIDATION" ? 422 : 503;
  return NextResponse.json(result, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}
const invalid = () => response({ ok: false, code: "VALIDATION", message: "Invalid evaluation request." });
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const filterKeys = ["status", "track", "opportunityId", "assignment", "review"];
  if ([...query.keys()].some(key => !["accountId", "mode", "applicationId", "offset", "search", ...filterKeys].includes(key)) || [...new Set(query.keys())].some(key => query.getAll(key).length !== 1)) return invalid();
  const accountId = query.get("accountId"), mode = query.get("mode") ?? "list", id = query.get("applicationId"), rawOffset = query.get("offset") ?? "0", search = query.get("search") ?? "";
  if (!isUuid(accountId) || !/^(0|[1-9]\d{0,5})$/.test(rawOffset) || Number(rawOffset) > 100000 || search.length > 100) return invalid();
  const filtered = filterKeys.some(key => query.has(key));
  const filters = { ...defaultQueueFilters, search, ...Object.fromEntries(filterKeys.filter(key => query.has(key)).map(key => [key, query.get(key)])) };
  if (mode === "list" && !id) {
    if (!isQueueFilters(filters)) return invalid();
    return response(await listEvaluations(accountId, Number(rawOffset), search, filtered ? filters : undefined));
  }
  if (filtered) return invalid();
  if (!isUuid(id) || search || !["detail", "history"].includes(mode) || mode === "detail" && rawOffset !== "0") return invalid();
  return response(mode === "detail" ? await readEvaluation(accountId, id) : await readEvaluationHistory(accountId, id, Number(rawOffset)));
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== getAppOrigin()) return response({ ok: false, code: "DENIED", message: "Use this application's evaluation workspace." });
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
        if (length > 32768) { await reader.cancel(); return invalid(); }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    const body: unknown = JSON.parse(text);
    if (!record(body) || Object.keys(body).sort().join(",") !== "accountId,request" || !isUuid(body.accountId)) return invalid();
    return response(await changeEvaluation(body.accountId, body.request));
  } catch { return invalid(); }
}
