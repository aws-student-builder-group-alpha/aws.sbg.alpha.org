import { Suspense } from "react";
import { redirect } from "next/navigation";
import { loadApplicantDraft } from "@/lib/server/drafts";
import { getOpportunity } from "@/lib/catalog";
import { emptyDraftInput, type Draft } from "@/lib/drafts";
import { recruitmentBasePath } from "@/lib/site-paths";
import { applicationLandingPath } from "@/lib/auth-return";
import { ApplicantAccess } from "@/app/components/applicant-access";
import { DraftEditor } from "./draft-editor";
import { AccessGuard } from "@/app/components/access-guard";
import { ApplyAccessChanged, ApplyLoading } from "./apply-entry";
export default function ApplyPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  return <Suspense fallback={<ApplyLoading />}><ApplyContent searchParams={searchParams} /></Suspense>;
}
async function ApplyContent({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams;
  const opportunity = typeof params.opportunity === "string" ? getOpportunity(params.opportunity) : undefined;
  if (recruitmentBasePath && process.env.ALPHA_PRACTICE_FORM === "1") {
    const applicant = { id: "practice-applicant", email: "applicant@example.test", name: "Alex Rivera" };
    const input = emptyDraftInput(2);
    const draft: Draft = {
      ...input, id: "practice-draft", version: 1, savedAt: "", status: "Draft",
      profile: { ...input.profile, email: applicant.email, fullName: applicant.name, university: "Rizal Technological University", program: "BS Information Technology", programLevel: "undergraduate", year: "1", enrolled: true },
      processingConsent: true,
      ...(opportunity && { track: opportunity.track, opportunityId: opportunity.id, scenarioReviewedOpportunityId: opportunity.id, stage: 3 }),
    };
    return <DraftEditor key={opportunity?.id ?? draft.id} applicant={applicant} initialDraft={draft} practice intake={{ opensAt: "2026-11-01T00:00:00+08:00", closesAt: "2026-12-01T00:00:00+08:00", serverNow: "2026-11-07T00:00:00+08:00", state: "open", accepting: true }} />;
  }
  const result = await loadApplicantDraft();
  if (result.kind === "staff") redirect("/staff");
  const requested = opportunity?.id;
  if (result.kind === "anonymous" || result.kind === "unconfigured") {
    const error = result.kind === "unconfigured" ? "unconfigured" : params.auth === "failed" || params.auth === "signout-failed" ? params.auth : undefined;
    redirect(applicationLandingPath(requested, error));
  }
  if (result.kind !== "ready") return <ApplicantAccess formEntry kind={result.kind} authError={params.auth === "signout-failed" ? "sign-out" : params.auth === "failed" ? "sign-in" : undefined} opportunity={requested} />;
  if (result.application) redirect("/application");
  return <AccessGuard accountId={result.applicant.id} expected="applicant" blockedContent={<ApplyAccessChanged />}><DraftEditor key={result.applicant.id + ":" + (result.draft?.id || "new")} applicant={result.applicant} initialDraft={result.draft} intake={result.intake} requestedOpportunity={requested} signOutFailed={params.auth === "signout-failed"} /></AccessGuard>;
}
