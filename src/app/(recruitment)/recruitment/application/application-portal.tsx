"use client";
import { NotificationInbox } from '@/app/(recruitment)/recruitment/components/notification-inbox';
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApplicationSidebar } from "./application-sidebar";
import type { Draft } from "@/recruitment/lib/drafts";
import { ApplicationContent } from "@/app/(recruitment)/recruitment/components/application-content";
import { Callout, Icon, Modal, PageHeading, StatusBadge, WorkspaceDisclosureLabel, formatDate } from "@/app/(recruitment)/recruitment/components/ui";
import { getOpportunity, opportunityLabel } from "@/recruitment/lib/catalog";
import { applicationCommand, applicationState } from "@/recruitment/lib/application-client";
import type { ApplicationCommand, SubmittedApplication } from "@/recruitment/lib/applications";

export function ApplicationPortal({ accountId, initialApplication, applications = [initialApplication], draft }: { accountId: string; initialApplication: SubmittedApplication; applications?: SubmittedApplication[]; draft?: Draft | null }) {
  const router = useRouter();
  const [application, setApplication] = useState(initialApplication);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const pending = useRef<ApplicationCommand | null>(null);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const receipt = useRef<HTMLElement>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, []);
  function accept(next: SubmittedApplication) {
    setApplication(current => next.version >= current.version ? next : current);
    if (next.status === "Withdrawn") { pending.current = null; setRetrying(false); setConfirm(false); requestAnimationFrame(() => receipt.current?.focus({ preventScroll: true })); }
  }
  function failure(code: string, text: string) {
    if (["STAFF_ACCOUNT","DENIED","ACCOUNT_CHANGED","UNAUTHENTICATED"].includes(code)) setBlocked(true);
    setMessage(text);
  }
  async function refresh() {
    if (controller.current) return;
    setBusy(true); controller.current = new AbortController();
    const result = await applicationState(accountId, controller.current.signal, application.id);
    if (!active.current) return;
    setBusy(false); controller.current = null;
    if (result.ok && result.data.application) { accept(result.data.application); setMessage(result.data.application.status === "Withdrawn" ? "Your application has been withdrawn." : pending.current ? "Your application is still active. Retry the same withdrawal confirmation; an earlier request may still complete." : "Latest details loaded."); }
    else if (!result.ok) failure(result.code, result.message);
    else setMessage("The latest application could not be confirmed. Retry shortly.");
  }
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === "visible" && !controller.current) void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }); // Refresh uses the current revision and pending confirmation.
  async function withdraw() {
    if (controller.current) return;
    if (!pending.current) pending.current = { action: "withdraw", accountId, applicationId: application.id, expectedVersion: application.version, mutationId: crypto.randomUUID() };
    setBusy(true); setMessage(""); controller.current = new AbortController();
    const result = await applicationCommand(pending.current, controller.current.signal);
    if (!active.current) return;
    setBusy(false); controller.current = null;
    if (result.ok) { accept(result.data); setMessage("Your application has been withdrawn."); router.refresh(); }
    else { failure(result.code, result.message); setRetrying(result.code === "UNAVAILABLE"); if (result.code !== "UNAVAILABLE") pending.current = null; }
  }
  if (blocked) return <main id="main-content" className="container portal narrow"><PageHeading title="Check your applicant access" description={message} /><Link className="button button-orange" href="/recruitment/application">Check account</Link></main>;
  const guidance = {
    Submitted: "Submitted successfully. Check here for updates.",
    "Under Review": "Your application is being reviewed.",
    Accepted: "Accepted. Watch for direct communication from Alpha.",
    Waitlisted: "You are on the waitlist; no place has been offered.",
    "Not Selected": "You were not selected this cycle.",
    Withdrawn: "Withdrawn. You can still apply for other roles.",
  }[application.status];
  return <main id="main-content" className="container portal applicant-portal workspace-redesign workspace-portal">
    <div className="applications-hub">
      <ApplicationSidebar applications={applications.map(item => item.id === application.id ? application : item)} draft={draft} selectedId={application.id} locked={busy || retrying} />
      <div className="applications-detail submission-status">
        <section className="panel application-receipt" aria-labelledby="receipt-title" tabIndex={-1} ref={receipt}>
          <h1 id="receipt-title">Submission status</h1>
          <div className="submission-status-role">
            <h2>{opportunityLabel(getOpportunity(application.data.opportunityId))}</h2>
            <StatusBadge status={application.status} />
          </div>
          <p className="receipt-guidance" role="status">{guidance}</p>
          <dl className="submission-status-metadata">
            <div>
              <dt><Icon name="file" size={16} /> Application reference</dt>
              <dd className="application-reference">{application.reference}</dd>
            </div>
            <div>
              <dt><Icon name="calendar" size={16} /> Submitted</dt>
              <dd><time dateTime={application.submittedAt}>{formatDate(application.submittedAt)} Philippine time</time></dd>
            </div>
          </dl>
          <button type="button" className="button button-secondary submission-status-refresh" disabled={busy} onClick={() => void refresh()}>{busy ? "Checking…" : "Refresh status"}</button>
        </section>
        {message && !confirm && <Callout><p role="status">{message}</p></Callout>}
        <NotificationInbox accountId={accountId} applicationId={application.id} />
        <details className="panel submitted-details submission-status-disclosure portal-history">
          <summary><WorkspaceDisclosureLabel icon="clock"><span>Status history</span></WorkspaceDisclosureLabel></summary>
          {application.history.length > 0
            ? <ol className="application-history" role="list">
                {application.history.map((event, index) => <li key={index}>
                  <strong>{event.status}</strong>
                  <time dateTime={event.createdAt}>{formatDate(event.createdAt)} Philippine time</time>
                </li>)}
              </ol>
            : <p className="submission-status-details">No status changes have been recorded yet.</p>}
        </details>
        <details className="panel submitted-details submission-status-disclosure">
          <summary><WorkspaceDisclosureLabel icon="file"><span>View submitted answers</span></WorkspaceDisclosureLabel></summary>
          <div className="submission-status-details">
            <ApplicationContent application={{ ...application.data, profile: { ...application.data.profile, email: application.email } }} />
          </div>
        </details>
        {application.status !== "Withdrawn" && <section className="withdrawal-action workspace-withdrawal" aria-label="Application withdrawal">
          <div><h2>Withdrawal</h2><p>Withdrawal is final.</p></div>
          <button type="button" className="text-button" disabled={busy} onClick={() => { setMessage(""); setConfirm(true); }}>Withdraw application</button>
        </section>}
      </div>
    </div>
    {confirm && <Modal title="Withdraw application" dismissible={!busy} onClose={() => setConfirm(false)}><div className="modal-body" aria-busy={busy}>
      <p>Withdraw {application.reference}? This is final. You cannot edit this application or apply again for this role. You can still apply for other roles. Your submitted answers and status history will remain available.</p>
      {message && <Callout tone="error" title="Something needs attention" role="alert">{message}</Callout>}
      {message && <button type="button" className="text-button" disabled={busy} onClick={() => void refresh()}>Reload latest details</button>}
      <div className="modal-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => setConfirm(false)}>Back</button><button type="button" className="button button-orange" disabled={busy} onClick={() => void withdraw()}>{busy ? "Withdrawing…" : retrying ? "Retry withdrawal" : "Confirm withdrawal"}</button></div>
    </div></Modal>}
  </main>;
}
