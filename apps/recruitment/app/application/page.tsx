import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { loadApplicantDraft } from "@/lib/server/drafts";
import { ApplicationContent } from "@/app/components/application-content";
import { ApplicantAccess } from "@/app/components/applicant-access";
import { Badge } from "@/app/components/ui";
import { formatDate } from "@/lib/format-date";
import { AccessGuard } from "@/app/components/access-guard";
import { ApplicationPortal } from "./application-portal";
type ApplicationSearchParams = Promise<{ resume?: string | string[] }>;

export default function ApplicationPage({ searchParams }: { searchParams: ApplicationSearchParams }) {
  return <Suspense fallback={<main id="main-content" className="container portal"><p role="status">Loading your application…</p></main>}><DraftPortal searchParams={searchParams} /></Suspense>;
}
async function DraftPortal({ searchParams }: { searchParams: ApplicationSearchParams }) {
  const result = await loadApplicantDraft();
  if (result.kind === "member") redirect("/membership");
  if (result.kind === "staff") redirect("/staff");
  if (result.kind !== "ready") return <ApplicantAccess redesign kind={result.kind} />;
  if (result.application) return <AccessGuard accountId={result.applicant.id} expected="applicant"><ApplicationPortal key={result.applicant.id} accountId={result.applicant.id} initialApplication={result.application} /></AccessGuard>;
  // Save & exit opens the draft summary. The navbar explicitly resumes editing.
  if (result.draft && (await searchParams).resume === "1") redirect("/apply");
  return (
    <AccessGuard accountId={result.applicant.id} expected="applicant"><main id="main-content" className="container portal workspace-redesign workspace-portal">
      <h1 className="sr-only">My application</h1>
      <div className="workspace-reading">
      <section className="panel">
        {result.draft && <Badge tone="orange">Draft</Badge>}
        <h2>{result.draft ? "Your saved draft" : "Start your application"}</h2>
        <p>{result.draft
          ? `Saved ${formatDate(result.draft.savedAt)} Philippine time. This draft is private to your account.`
          : "Create one application draft after reading the privacy notice and agreeing to recruitment processing."}</p>
        <Link href={result.draft ? "/apply" : "/apply?entry=1"} className="button button-orange">
          {result.draft ? "Continue my draft" : "Start my application"}
        </Link>
      </section>
      {result.draft && (
        <details className="panel submitted-details">
          <summary>View saved answers</summary>
          <ApplicationContent application={result.draft} />
        </details>
      )}
      </div>
    </main></AccessGuard>
  );
}
