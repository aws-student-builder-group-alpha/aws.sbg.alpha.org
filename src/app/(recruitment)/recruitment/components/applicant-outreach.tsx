'use client';
import { useEffect, useId, useRef, useState } from "react";
import { CommunityClientError,communityCommand,communityRead } from '@/recruitment/lib/community-client';
import { isCalendly,isMessage,type Message } from '@/recruitment/lib/community';
import { record } from '@/recruitment/lib/drafts';
import { recruitmentPath } from '@/recruitment/lib/site-paths';
import type { SubmittedApplication } from '@/recruitment/lib/applications';
import { MemberAdministration } from './member-administration';
import { getOpportunity,opportunityLabel } from '@/recruitment/lib/catalog';
import { Badge, Callout, FieldError, Icon, Modal, formatDate } from "./ui";
export function EnrollmentProofLink({ accountId, applicationId, button = false }: { accountId: string; applicationId: string; button?: boolean }) {
 const query = new URLSearchParams({ kind: 'enrollment', accountId, applicationId });
 return <a className={button ? "button button-secondary" : "text-button"} href={recruitmentPath('/recruitment/api/community/file?' + query)}
   target="_blank" rel="noopener noreferrer">{button && <Icon name="clip" size={16} />}Download proof of enrollment</a>;
}
export function ApplicantMembershipTools({ accountId, application }: { accountId: string; application: SubmittedApplication }) {
 return <MemberAdministration accountId={accountId} email={application.email} name={application.data.profile.fullName} position={opportunityLabel(getOpportunity(application.data.opportunityId))} />;
}
const sender = "awslc.alpha@gmail.com";
const emailTypes = [
  { value: "interview", label: "Interview invitation", status: "Under Review" },
  { value: "accepted", label: "Acceptance", status: "Accepted" },
  { value: "rejected", label: "Not selected", status: "Not Selected" },
  { value: "update", label: "Application update", status: null },
] as const;

const deliveryStates: Record<string, { label: string; tone: string }> = {
  prepared: { label: "Prepared", tone: "neutral" },
  sending: { label: "Delivery unconfirmed", tone: "orange" },
  uncertain: { label: "Delivery unconfirmed", tone: "orange" },
  sent: { label: "Accepted by Gmail", tone: "green" },
  failed: { label: "Delivery failed", tone: "red" },
};

export function ApplicantOutreach({ accountId, application, administrator, verified, embedded = false }: {
  accountId: string; application: SubmittedApplication; administrator: boolean; verified: boolean; embedded?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean | null>(null);
  const [reading, setReading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const initialKind = emailTypes.find(type => type.status === application.status)?.value ?? "update";
  const [kind, setKind] = useState(initialKind);
  const [subject, setSubject] = useState("Your application · AWS SBG Alpha");
  const [body, setBody] = useState(() => template(initialKind));
  const [calendly, setCalendly] = useState("");
  const [locked, setLocked] = useState(false);
  const [lastState, setLastState] = useState("");
  const pending = useRef<{ id: string; payload: Record<string, unknown> } | null>(null);
  const calendlyInput = useRef<HTMLInputElement>(null);
  const [calendlyError, setCalendlyError] = useState(false);
  const calendlyErrorId = useId();
  const withdrawn = application.status === "Withdrawn";
  const complete = lastState === "sent" || lastState === "failed";

  function template(type: string) {
    const copy = type === "accepted" ? "Congratulations! Your application has been accepted. Welcome to Alpha."
      : type === "rejected" ? "Thank you for applying. We are unable to offer you this position in this recruitment cycle. We appreciate your effort and encourage you to stay connected."
      : type === "interview" ? "We would like to invite you to an interview. Please choose a suitable time using the scheduling link below."
      : "Here is an update about your application.";
    return `Hi ${application.data.profile.fullName},\n\n${copy}\n\nThank you,\nAWS SBG – Alpha`;
  }

  useEffect(() => {
    const controller = new AbortController();
    void communityRead(accountId, "messages", { applicationId: application.id }, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (!record(data) || !Array.isArray(data.items) || !data.items.every(isMessage)) throw new Error("Message history could not be verified.");
      setMessages(data.items);
      setReady(data.emailReady === true);
      setHistoryError("");
    }).catch(error => {
      if (!controller.signal.aborted) setHistoryError(error instanceof Error ? error.message : "Message history unavailable.");
    }).finally(() => {
      if (!controller.signal.aborted) setReading(false);
    });
    return () => controller.abort();
  }, [accountId, application.id, refresh]);

  function reloadHistory() {
    setReading(true);
    setRefresh(value => value + 1);
  }

  function changeKind(next: typeof kind) {
    setKind(next);
    setSubject(`${emailTypes.find(type => type.value === next)?.label} · AWS SBG Alpha`);
    setBody(template(next));
    setCalendlyError(false);
  }

  function review() {
    if (!verified || !ready || withdrawn || busy || complete) return;
    if (pending.current) { void send(); return; }
    if (kind === "interview" && !isCalendly(calendly)) {
      setCalendlyError(true);
      calendlyInput.current?.focus();
      return;
    }
    setError("");
    setReviewing(true);
  }

  async function send() {
    if (!verified || !ready || withdrawn || busy || complete) return;
    const request = pending.current ?? {
      id: crypto.randomUUID(),
      payload: { applicationId: application.id, version: application.version, kind, subject, body, calendly: kind === "interview" ? calendly : "" },
    };
    pending.current = request;
    setLocked(true);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await communityCommand(accountId, "send", { id: request.id, ...request.payload });
      if (!record(data)) throw new Error("Delivery could not be confirmed.");
      const state = String(data.state);
      setLastState(state);
      setNotice(state === "sent" ? "Gmail accepted the email for delivery."
        : state === "failed" ? "Gmail did not accept the email for delivery."
        : "Delivery is unconfirmed. Check the same request before starting another email.");
      reloadHistory();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Delivery could not be confirmed.");
      if (error instanceof CommunityClientError && [400, 422, 429].includes(error.status)) {
        pending.current = null;
        setLocked(false);
      }
    } finally {
      setBusy(false);
      setReviewing(false);
    }
  }

  return <section className={embedded ? "applicant-outreach" : "panel applicant-outreach"}>
    {!embedded && <><h2>Applicant communication</h2><EnrollmentProofLink accountId={accountId} applicationId={application.id} /></>}
    <dl className="outreach-addresses">
      <div><dt>To</dt><dd>{application.data.profile.fullName}<span>{application.email}</span></dd></div>
      <div><dt>From</dt><dd>{sender}</dd></div>
    </dl>
    {ready === false && <Callout tone="warning" title="Email sending unavailable">A System Admin must connect the Alpha mailbox. You can still prepare the message.</Callout>}
    {withdrawn && <Callout tone="info" title="Application withdrawn">Email history is available for this record.</Callout>}

    <form className="outreach-compose" aria-busy={busy} onSubmit={event => { event.preventDefault(); review(); }}>
      <fieldset className="application-fields" disabled={busy || locked || withdrawn}>
        <legend>Compose email</legend>
        <div className="field"><label htmlFor={`${calendlyErrorId}-kind`}>Email type</label>
          <select id={`${calendlyErrorId}-kind`} value={kind} onChange={event => changeKind(event.target.value as typeof kind)}>
            {emailTypes.map(type => <option key={type.value} value={type.value} disabled={!!type.status && type.status !== application.status}>{type.label}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor={`${calendlyErrorId}-subject`}>Subject</label>
          <input id={`${calendlyErrorId}-subject`} required maxLength={160} value={subject} onChange={event => setSubject(event.target.value)} />
        </div>
        <div className="field"><label htmlFor={`${calendlyErrorId}-message`}>Message</label>
          <textarea id={`${calendlyErrorId}-message`} required maxLength={5000} rows={7} value={body} onChange={event => setBody(event.target.value)} />
        </div>
        {kind === "interview" && <div className="field">
          <label htmlFor={`${calendlyErrorId}-link`}>Calendly scheduling link</label>
          <input id={`${calendlyErrorId}-link`} ref={calendlyInput} required type="url" placeholder="https://calendly.com/alpha/interview"
            aria-invalid={calendlyError || undefined} aria-describedby={calendlyError ? calendlyErrorId : undefined}
            value={calendly} onChange={event => { setCalendly(event.target.value); setCalendlyError(false); }} />
          {calendlyError && <FieldError id={calendlyErrorId}>Enter an HTTPS calendly.com scheduling link.</FieldError>}
        </div>}
      </fieldset>
      {error && <Callout tone="error" role="alert">{error}</Callout>}
      {notice && <Callout tone={lastState === "sent" ? "success" : "warning"} role="status">{notice}</Callout>}
      {!withdrawn && <div className="outreach-actions">
        {complete ? <button className="button button-secondary" type="button" onClick={() => {
          pending.current = null; setLocked(false); setLastState(""); setNotice("");
        }}>Create another message</button>
          : <button type="submit" className="button button-orange" disabled={!ready || busy}>
            <Icon name="mail" size={16} />{busy ? "Checking request…" : locked ? "Check same email request" : "Review and send email"}
          </button>}
      </div>}
    </form>

    <section className="outreach-deliveries">
      <header><h3>Delivery history</h3><button type="button" className="text-button" disabled={reading || busy} onClick={reloadHistory}>
        <Icon name="reset" size={15} />{reading ? "Refreshing…" : "Refresh delivery history"}
      </button></header>
      {historyError && <Callout tone="warning" role="alert">{historyError}</Callout>}
      {messages.length ? <ul className="outreach-message-list">
        {messages.map(message => {
          const status = deliveryStates[message.state] ?? { label: "Status unavailable", tone: "neutral" };
          return <li key={message.id}><details>
            <summary>
              <span className="outreach-message-title"><strong>{message.subject}</strong><Badge tone={status.tone}>{status.label}</Badge>
                <time dateTime={message.created_at}>{formatDate(message.created_at)} Philippine time</time></span>
              <Icon className="outreach-history-chevron" name="chevron" size={16} />
            </summary>
            <p className="outreach-message-body">{message.body}</p>
          </details></li>;
        })}
      </ul> : !historyError && <p className="muted" role="status">{reading ? "Loading email history…" : "No email requests recorded."}</p>}
    </section>

    {reviewing && verified && <Modal title="Review email" dismissible={!busy} onClose={() => setReviewing(false)}>
      <div className="modal-body outreach-review" aria-busy={busy}>
        <dl className="outreach-addresses"><div><dt>To</dt><dd>{application.email}</dd></div><div><dt>From</dt><dd>{sender}</dd></div></dl>
        <h3>{subject}</h3>
        <p className="outreach-message-body">{body}</p>
        {kind === "interview" && <p><strong>Calendly scheduling link</strong><br />{calendly}</p>}
        <p className="field-hint">The applicant also receives an in-app notification. Limits are three emails per applicant and 100 overall per 24 hours.</p>
        <div className="modal-actions">
          <button type="button" className="button button-secondary" disabled={busy} onClick={() => setReviewing(false)}>Back to draft</button>
          <button type="button" className="button button-orange" disabled={busy || !ready || withdrawn} onClick={() => void send()}>{busy ? "Sending…" : "Send email"}</button>
        </div>
      </div>
    </Modal>}
    {!embedded && administrator && application.status === "Accepted" && <ApplicantMembershipTools accountId={accountId} application={application} />}
  </section>;
}
