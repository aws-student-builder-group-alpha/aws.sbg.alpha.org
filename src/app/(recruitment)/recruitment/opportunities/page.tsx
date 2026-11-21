import LandingFooter from "@/app/(main)/(landing)/shared/footer";
import { Suspense } from "react";
import { loadApplicantDraft } from "@/recruitment/lib/server/drafts";
import { OpportunityDirectory } from "./opportunity-directory";
import { OpportunitiesSkeleton } from "./opportunities-skeleton";
import "./opportunities.css";
export const metadata = { title: "Opportunities" };
export default function OpportunitiesPage() {
 return <><Suspense fallback={<OpportunitiesSkeleton />}><Directory /></Suspense><div className="roles-landing-footer"><LandingFooter compact /></div></>;
}
async function Directory() {
 const result = await loadApplicantDraft();
 return <OpportunityDirectory entry={result.kind === "ready" ? { kind: "applicant", applicant: result.applicant, hasDraft: !!result.draft, submitted: !!result.application } : { kind: result.kind }} />;
}
