"use client";

import { ListSkeleton } from "./workspace-skeleton";
import { useId, useRef, useState, type FormEvent } from "react";
import { communityCommand, communityRead } from "@/recruitment/lib/community-client";
import type { AuditEvent } from "@/recruitment/lib/community";
import { record } from "@/recruitment/lib/drafts";
import { formatDate } from "@/recruitment/lib/format-date";
import { Callout, EmptyState, Icon } from "./ui";
import { MemberInvitations } from "./member-invitations";
import { useAdminNavigationGuard } from "./admin-navigation-guard";

type MemberAdministrationProps = {
  accountId: string;
  email?: string;
  name?: string;
  position?: string;
  workspace?: boolean;
};
type MemberFormMode = "add" | "manage";
type Notice = { tone: "success" | "error"; message: string };

export function MemberAdministration({
  accountId, email = "", name = "", position = "Member", workspace = false,
}: MemberAdministrationProps) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [mode, setMode] = useState<MemberFormMode | null>(null);
  const [dirty, setDirty] = useState(false);
  useAdminNavigationGuard(dirty, busy);
  const formId = useId();
  const request = useRef({key:"",id:""});
  const [revision,setRevision] = useState(0);
  const headingId = formId + "-heading";
  const today = new Date().toISOString().slice(0, 10);

  function toggleForm(next: MemberFormMode) {
    if (dirty && !window.confirm("Discard the unfinished membership form?")) return;
    setDirty(false);
    setMode(current => current === next ? null : next);
    setNotice(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    const confirmation = [
      "Confirm " + (mode === "add" ? "existing member" : "membership change") + " for " + payload.email + "?",
      payload.name + " · " + payload.position + " · Joined " + payload.joined,
      mode === "add" && !email ? "Creates a pending invitation; an ID is issued only after the member accepts." : "Access: " + payload.status,
      "Reason: " + payload.reason,
    ].join("\n");
    if (!window.confirm(confirmation)) return;

    setBusy(true);
    setNotice(null);
    try {
      const invite = mode === "add" && !email;
      const key = JSON.stringify(payload);
      if (request.current.key !== key) request.current = {key,id:crypto.randomUUID()};
      const member = await communityCommand(accountId, invite ? "inviteMember" : "issueMember", {...payload,id:request.current.id});
      if (invite) {
        if (!record(member) || member.state !== "pending") throw new Error("Invitation could not be confirmed.");
        setNotice({tone:"success",message:"Invitation saved. Use Member invitations to send an email or share the Membership ID link. The member must accept before an ID is issued."});
        setRevision(value=>value+1);setMode(null);setDirty(false);return;
      }
      if (!record(member) || typeof member.id !== "string"
        || !["active", "revoked"].includes(String(member.status))) {
        throw new Error("Membership could not be confirmed.");
      }
      setNotice({
        tone: "success",
        message: member.status === "revoked"
          ? "Membership revoked. ID: " + member.id + "."
          : "Membership saved. ID: " + member.id + ". The member can sign in, add their photo and download their Alpha ID.",
      });
      setMode(null);
      setDirty(false);
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Membership could not be confirmed.",
      });
    } finally {
      setBusy(false);
    }
  }

  const invitations = <MemberInvitations accountId={accountId} revision={revision} workspace={workspace} />;
  const feedback = notice && <Callout tone={notice.tone} role={notice.tone === "error" ? "alert" : "status"}>{notice.message}</Callout>;
  const invitationHelp = <div className="community-member-steps">
    <strong>Invite, accept, then download</strong>
    <p>Invite their Google email, then send the invitation or share the Membership ID page. They can sign in and accept without filling out an application. First sign-in is not required before saving an invitation.</p>
  </div>;
  const tools = <section className="community-admin-panel member-administration" aria-labelledby={headingId} data-admin-unsaved={dirty || undefined} data-admin-pending={busy || undefined}>
    <header>
      {!workspace && <p className="community-admin-eyebrow">Member records</p>}
      <h2 id={headingId}>{workspace ? "Membership tools" : email ? "Membership ID" : "Organization members"}</h2>
    </header>
    {!workspace && <p>Add people who already belong to Alpha without a recruitment application. System Admins control their position, date joined and membership access.</p>}
    {!workspace && invitationHelp}
    <div className={workspace ? "community-member-actions member-tool-actions" : "community-member-actions"}>
      <div>
        <button type="button" className="button button-orange" disabled={busy}
          aria-expanded={mode === "add"} aria-controls={mode === "add" ? formId : undefined} onClick={() => toggleForm("add")}>
          {workspace && <Icon name="people" size={16} />}{email ? "Issue membership ID" : "Add existing member"}
        </button>
        {workspace && <p>Invite someone who already belongs to Alpha.</p>}
      </div>
      <div>
        <button type="button" className="button button-secondary" disabled={busy}
          aria-expanded={mode === "manage"} aria-controls={mode === "manage" ? formId : undefined} onClick={() => toggleForm("manage")}>
          {workspace && <Icon name="wallet" size={16} />}Update or revoke membership
        </button>
        {workspace && <p>Change membership details or access using the account’s email.</p>}
      </div>
    </div>
    {workspace && !mode && feedback}
    {mode && <form id={formId} className="community-member-form" key={mode} onChange={() => setDirty(true)} onSubmit={save}>
      <h3>{mode === "add" ? "Add an existing Alpha member" : "Update membership details or access"}</h3>
      <fieldset className="application-fields" disabled={busy}>
        <label>Verified Google email<input name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={email} /></label>
        <label>Member name<input name="name" required maxLength={120} autoComplete="name" defaultValue={name} /></label>
        <label>Position<input name="position" required maxLength={100} defaultValue={position} /></label>
        <label>Date joined<input name="joined" type="date" required min="2024-01-01" max={today} defaultValue={today} /></label>
        {mode === "manage"
          ? <label>Membership access<select name="status"><option value="active">Active</option><option value="revoked">Revoke membership</option></select></label>
          : <input type="hidden" name="status" value="active" />}
        <label>Private reason<textarea name="reason" required maxLength={500} rows={2} /></label>
        <p className="community-member-note">{workspace
          ? mode === "add" ? "You can save an invitation before the member signs in. They must accept it before an ID is issued."
            : "The member keeps their ID when you update their record. Manage staff roles in Staff accounts."
          : "Invited existing members accept before an ID is issued. Members manage their own name and photo after an ID is issued. An existing email keeps its membership ID; this form updates its position, date and access. Staff roles are assigned separately in Staff management."}</p>
        <div className="community-member-actions">
          <button type="submit" className="button button-orange">{busy ? "Saving…" : mode === "add" ? "Review and add member" : "Review membership change"}</button>
          <button type="button" className="text-button" disabled={busy} onClick={() => { setMode(null); setDirty(false); }}>Cancel</button>
        </div>
      </fieldset>
      {workspace && feedback}
    </form>}
    {!workspace && <>{invitations}{feedback}</>}
  </section>;
  return workspace ? <div className="member-workspace">{tools}{invitations}</div> : tools;
}

type ActivityEvent = Pick<AuditEvent, "id" | "action" | "object_id" | "created_at">;

function isActivityEvent(value: unknown): value is ActivityEvent {
  return record(value) && typeof value.id === "string" && typeof value.action === "string"
    && typeof value.object_id === "string" && typeof value.created_at === "string"
    && Number.isFinite(Date.parse(value.created_at));
}

function activityLabel(action: string) {
  const label = action.replace(/[._]/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function activityIcon(action: string) {
  if (action.startsWith("application.")) return "file";
  if (action.startsWith("enrollment.")) return "clip";
  if (action.startsWith("membership.")) return "wallet";
  if (action.startsWith("message.")) return "mail";
  return "shield";
}

export function SecurityLog({ accountId }: { accountId: string }) {
  const [items, setItems] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const filterId = useId();
  const headingId = useId();
  const query = filter.trim().toLowerCase();
  const visible = query
    ? items?.filter(item => [activityLabel(item.action), item.action, item.object_id]
        .some(value => value.toLowerCase().includes(query)))
    : items;

  async function load() {
    setBusy(true);
    setError("");
    try {
      const events = await communityRead(accountId, "audit");
      if (!Array.isArray(events) || !events.every(isActivityEvent)) {
        throw new Error("Security history could not be verified.");
      }
      setItems(events);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Security log unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="community-admin-panel community-security" aria-labelledby={headingId}>
    <header className="admin-activity-heading">
      <div>
        <h2 id={headingId}>Activity log</h2>
        <p>Up to 100 recent events. Staff access history is in Staff accounts.</p>
      </div>
      <button type="button" className="button button-orange admin-activity-load" disabled={busy} onClick={() => void load()}>
        <Icon name="reset" size={16} />{busy ? "Loading…" : "Load latest activity"}
      </button>
    </header>
    {error && <Callout tone="error" role="alert">{error}</Callout>}
    {items === null && (
      busy ? <ListSkeleton label="Loading security activity..." rows={5} />
        : !error && <EmptyState icon="shield" title="Recent security events"
          description="Load the latest activity to review and search the log." />
    )}
    {!busy && !error && items?.length === 0 && <EmptyState icon="shield" title="No activity recorded yet."
      description="Application, document, membership, and delivery events will appear here." announce />}
    {!!items?.length && <div className="admin-activity-toolbar">
      <div className="admin-activity-search">
        <label className="sr-only" htmlFor={filterId}>Filter loaded activity</label>
        <Icon name="search" size={17} />
        <input id={filterId} type="search" placeholder="Search by action or reference" value={filter} onChange={event => setFilter(event.target.value)} />
      </div>
      {!!visible?.length && <p className="admin-activity-count" role="status">{visible.length} of {items.length} loaded events</p>}
    </div>}
    {!busy && !error && !!items?.length && visible?.length === 0 && <EmptyState icon="search" title="No matching activity"
      description={`No matching events out of ${items.length} loaded.`} announce>
      <button type="button" className="button button-secondary" onClick={() => setFilter("")}>Clear search</button>
    </EmptyState>}
    {!!visible?.length && <div className="admin-activity-table-wrap">
      <table className="admin-activity-table" role="table" aria-labelledby={headingId}>
        <thead role="rowgroup"><tr role="row">
          <th scope="col" role="columnheader">Event</th>
          <th scope="col" role="columnheader">Reference</th>
          <th scope="col" role="columnheader">Philippine time</th>
        </tr></thead>
        <tbody role="rowgroup">{visible.map(item => {
          const icon = activityIcon(item.action);
          return <tr key={item.id} role="row">
            <td role="cell"><div className="audit-action"><span className="audit-event-icon" data-icon={icon}><Icon name={icon} size={16} /></span><strong>{activityLabel(item.action)}</strong></div></td>
            <td role="cell" data-label="Reference"><span className="audit-reference">{item.object_id}</span></td>
            <td role="cell" data-label="Philippine time"><time dateTime={item.created_at}>{formatDate(item.created_at)}</time></td>
          </tr>;
        })}</tbody>
      </table>
    </div>}
  </section>;
}
