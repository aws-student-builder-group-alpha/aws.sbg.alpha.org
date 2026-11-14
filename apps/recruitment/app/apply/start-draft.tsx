"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { emptyDraftInput } from "@/lib/drafts";
import type { Applicant, Draft, SaveRequest } from "@/lib/drafts";
import { saveApplicantDraft } from "@/lib/application-client";
import { getOpportunity } from "@/lib/catalog";
import { ApplicationOpportunity } from "@/app/components/application-introduction";
import { Callout, Icon } from "@/app/components/ui";
import { ApplyEntry } from "./apply-entry";

export function StartDraft({ applicant, onCreated, requestedOpportunity, signOutFailed = false, embedded = false, onBusyChange }: { applicant: Applicant; onCreated: (draft: Draft) => void; requestedOpportunity?: string; signOutFailed?: boolean; embedded?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef<SaveRequest | null>(null);
  const requested = getOpportunity(requestedOpportunity || "");
  const content = <>
    <div className="apply-entry-main">
      <h2>Ready to start?</h2>
      <p className="apply-lead">Four steps. Your progress saves automatically.</p>
      <p className="apply-account">Signed in as <strong>{applicant.email}</strong></p>
      {signOutFailed && <Callout tone="warning"><p role="alert">Sign-out could not be confirmed. Please retry using Sign out in the navigation.</p></Callout>}
      {requested && <ApplicationOpportunity opportunity={requested} />}
      <div className="application-privacy-summary"><Icon name="shield" size={22} /><div><h3>Recruitment processing consent</h3><p>Your academic details, opportunity choice, availability and answers help Alpha review your application. A draft is created only after you agree below. Read the full privacy notice for your choices and contact information.</p></div></div>
      <form className="apply-start-form" onSubmit={async event => {
        event.preventDefault();
        if (busy) return;
        if (!consent) { setMessage("Agree to recruitment processing before starting your application."); return; }
        if (!pending.current) {
          const payload = emptyDraftInput(2); payload.processingConsent = true; payload.profile.fullName = applicant.name;
          if (requested) { payload.track = requested.track; payload.opportunityId = requested.id; payload.scenarioReviewedOpportunityId = requested.id; }
          pending.current = { accountId: applicant.id, payload, expectedVersion: 0, mutationId: crypto.randomUUID() };
        }
        setBusy(true); onBusyChange?.(true); setMessage("");
        try {
          const result = await saveApplicantDraft(pending.current);
          if (result.ok) onCreated(result.draft);
          else { setMessage(result.message); if (result.code === "SUBMITTED") { router.replace("/application"); router.refresh(); } if (result.code === "VALIDATION") pending.current = null; }
        } catch { setMessage("Your draft could not be confirmed. Retry when your connection is available."); }
        finally { setBusy(false); onBusyChange?.(false); }
      }}>
        <label className="checkbox-row"><input type="checkbox" aria-required="true" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} /><span className="required-label">I have read the <Link href="/privacy">privacy notice</Link> and agree to recruitment processing.</span></label>
        {message && <Callout tone="error" title="Something needs attention" className="apply-error" role="alert">{message} <button type="button" className="text-button" onClick={() => window.location.reload()}>Reload your saved draft</button></Callout>}
        <button className="button button-orange" type="submit" disabled={busy}>{busy ? "Starting…" : "Start application"}<Icon name="arrow" size={17} /></button>
      </form>
      <details className="apply-details">
        <summary>Application details</summary>
        <ul>
          <li>Have your university, program, year level and enrollment details ready.</li>
          <li>Choose one opportunity. You can change it until you submit.</li>
          <li>A view-only resume link is required before submission. A portfolio link is optional.</li>
          <li>Upload your current registration form (COR) or official enrollment certificate showing your name, school and current term. PDF, JPG or PNG, up to 3 MB.</li>
        </ul>
        <p>Submit between <strong>1–30 November 2026</strong>, Philippine time. You can submit one application across all opportunities. Withdrawal is final.</p>
      </details>
    </div>
  </>;
  return embedded ? content : <ApplyEntry preparation>{content}</ApplyEntry>;
}
