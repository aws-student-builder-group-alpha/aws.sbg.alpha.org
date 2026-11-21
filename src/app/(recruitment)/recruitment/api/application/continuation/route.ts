import { loadApplicantDraft } from "@/recruitment/lib/server/drafts";

export async function GET() {
  const entry = await loadApplicantDraft();
  const continuation = entry.kind === "ready" && (entry.draft || entry.application)
    ? { canContinue: true, name: entry.applicant.name.trim() }
    : { canContinue: false };
  return Response.json(continuation, {
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}
