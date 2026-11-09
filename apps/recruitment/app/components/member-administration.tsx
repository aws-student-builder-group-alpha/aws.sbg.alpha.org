"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { communityCommand, communityRead } from "@/lib/community-client";
import { record } from "@/lib/drafts";
import { formatDate } from "@/lib/format-date";
import { Callout } from "./ui";

type MemberAdministrationProps = {
  accountId: string;
  email?: string;
  name?: string;
  position?: string;
};
type MemberFormMode = "add" | "manage";
type Notice = { tone: "success" | "error"; message: string };

export function MemberAdministration({
  accountId, email = "", name = "", position = "Member",
}: MemberAdministrationProps) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [mode, setMode] = useState<MemberFormMode | null>(null);
  const formId = useId();
  const headingId = formId + "-heading";
  const today = new Date().toISOString().slice(0, 10);

  function toggleForm(next: MemberFormMode) {
    setMode(current => current === next ? null : next);
    setNotice(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    const confirmation = [
      "Confirm " + (mode === "add" ? "existing member" : "membership change") + " for " + payload.email + "?",
      payload.name + " · " + payload.position + " · Joined " + payload.joined,
      "Access: " + payload.status,
      "Reason: " + payload.reason,
    ].join("\n");
    if (!window.confirm(confirmation)) return;

    setBusy(true);
    setNotice(null);
    try {
      const member = await communityCommand(accountId, "issueMember", payload);
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
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Membership could not be confirmed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return <section className="community-admin-panel member-administration" aria-labelledby={headingId}>
    <header>
      <p className="community-admin-eyebrow">Member records</p>
      <h2 id={headingId}>{email ? "Membership ID" : "Organization members"}</h2>
    </header>
    <p>Add people who already belong to Alpha without a recruitment application. System Admins control their position, date joined and membership access.</p>
    <div className="community-member-steps">
      <strong>Before adding a member</strong>
      <p>Ask them to <Link href="/membership">sign in with Google on Membership ID</Link> once. Then use that same verified email below. They do not need to fill out an application.</p>
    </div>
    <div className="community-member-actions">
      <button type="button" className="button button-orange" disabled={busy}
        aria-expanded={mode === "add"} aria-controls={formId} onClick={() => toggleForm("add")}>
        {email ? "Issue membership ID" : "Add existing member"}
      </button>
      <button type="button" className="button button-secondary" disabled={busy}
        aria-expanded={mode === "manage"} aria-controls={formId} onClick={() => toggleForm("manage")}>
        Update or revoke membership
      </button>
    </div>
    {mode && <form id={formId} className="community-member-form" key={mode} onSubmit={save}>
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
        <p className="community-member-note">Members manage their own name and photo after an ID is issued. An existing email keeps its membership ID; this form updates its position, date and access. Staff roles are assigned separately in Staff management.</p>
        <div className="community-member-actions">
          <button type="submit" className="button button-orange">{busy ? "Saving…" : mode === "add" ? "Review and add member" : "Review membership change"}</button>
          <button type="button" className="text-button" disabled={busy} onClick={() => setMode(null)}>Cancel</button>
        </div>
      </fieldset>
    </form>}
    {notice && <Callout tone={notice.tone} role={notice.tone === "error" ? "alert" : "status"}>{notice.message}</Callout>}
  </section>;
}

export function SecurityLog({ accountId }: { accountId: string }) {
  const [items, setItems] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const events = await communityRead(accountId, "audit");
      if (!Array.isArray(events) || !events.every(record)) {
        throw new Error("Security history could not be verified.");
      }
      setItems(events);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Security log unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return <details className="community-admin-panel community-security">
    <summary>Security activity log</summary>
    <p>The latest 100 application, document, membership and delivery events. Role-change reasons and access history remain in Staff management.</p>
    <button type="button" className="text-button" disabled={busy} onClick={() => void load()}>{busy ? "Loading…" : "Load latest activity"}</button>
    {error && <Callout tone="error" role="alert">{error}</Callout>}
    {items?.length === 0 && <p role="status">No activity recorded yet.</p>}
    <ul className="community-audit">{items?.map(item => <li key={String(item.id)}>
      <strong>{String(item.action)}</strong>
      <span>{String(item.object_id)}</span>
      <time>{formatDate(String(item.created_at))}</time>
    </li>)}</ul>
  </details>;
}
