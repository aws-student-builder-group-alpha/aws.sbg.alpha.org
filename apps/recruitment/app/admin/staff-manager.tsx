"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getStaffData, mergeStaffMembers, postStaffChange } from "@/lib/staff-client";
import { useVerifiedAccess } from "@/app/components/access-guard";
import { Badge, Callout, FieldError, Icon, Modal, PageHeading } from "@/app/components/ui";
import { useInlineValidation } from "@/app/components/inline-validation";
import { formatDate } from "@/lib/format-date";
import { actionLabel, isStaffHistory, isStaffMember, roleLabel, statusLabel } from "@/lib/staff";
import type { StaffMember, StaffHistory, StaffRole, StaffAction, StaffRequest, StaffFailure } from "@/lib/staff";

const deniedCodes = ["AUTH_REQUIRED", "DENIED", "ACCOUNT_CHANGED", "MFA_REQUIRED"];
function AccessHistory({ accountId, member, onDenied }: { accountId: string; member: StaffMember; onDenied: (error: StaffFailure) => void }) {
  const historyPanel = useRef<HTMLDetailsElement>(null);
  const [events, setEvents] = useState<StaffHistory[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const mounted = useRef(true);
  const moreRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; moreRequest.current?.abort(); };
  }, []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void getStaffData(accountId, `&targetId=${member.userId}`, isStaffHistory, controller.signal).then(result => {
      if (!active) return;
      if (result.ok) { setError(""); setEvents(result.data); setMore(result.data.length === 50); setState("ready"); }
      else { if (historyPanel.current) historyPanel.current.open = true; setError(result.message); setState("error"); if (deniedCodes.includes(result.code)) onDenied(result); }
    });
    return () => { active = false; controller.abort(); };
  }, [accountId, member.userId, member.version, onDenied, retry]);
  return <details ref={historyPanel} className="workspace-disclosure" open={state === "error" || !!error || undefined}><summary>Access history</summary><section className="staff-history" aria-labelledby="staff-history-heading">
    <h3 className="sr-only" id="staff-history-heading">Access history</h3>
    <p className="muted">Private staff access changes.</p>
    {state === "loading" && <p role="status">Loading access history…</p>}
    {state === "error" && <Callout tone="error" title="Something needs attention" role="alert">{error} <button className="text-button" type="button" onClick={() => setRetry(n => n + 1)}>Retry history</button></Callout>}
    {state === "ready" && !events.length && <p>No access changes are recorded.</p>}
    {state === "ready" && <ol className="staff-history-list">{events.map(event => <li key={event.id}>
      <div className="subheading"><strong>{actionLabel[event.action]}</strong><time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time></div>
      <p>{event.previousRole && event.previousStatus ? `${roleLabel(event.previousRole)} / ${statusLabel(event.previousStatus)} → ` : ""}{roleLabel(event.newRole)} / {statusLabel(event.newStatus)}</p>
      <p>{event.reason}</p><p className="muted">{event.actorEmail || "Supabase project owner"}</p>
    </li>)}</ol>}
    {state === "ready" && more && <button className="button button-secondary" disabled={loadingMore} type="button" onClick={async () => {
      if (moreRequest.current) return;
      const controller = new AbortController();
      moreRequest.current = controller;
      setLoadingMore(true);
      const result = await getStaffData(accountId, `&targetId=${member.userId}&beforeVersion=${events.at(-1)?.targetVersion}`, isStaffHistory, controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      moreRequest.current = null;
      setLoadingMore(false);
      if (result.ok) { setEvents(current => [...current, ...result.data]); setMore(result.data.length === 50); setError(""); }
      else { if (historyPanel.current) historyPanel.current.open = true; setError(result.message); if (deniedCodes.includes(result.code)) onDenied(result); }
    }}>{loadingMore ? "Loading…" : "Load earlier changes"}</button>}
    {state === "ready" && error && <Callout tone="error" title="Something needs attention" role="alert">{error}</Callout>}
  </section></details>;
}

export function StaffManager({ accountId, initialStaff }: { accountId: string; initialStaff: StaffMember[] }) {
  const accessVerified = useVerifiedAccess();
  const [members, setMembers] = useState(initialStaff);
  const [selectedId, setSelectedId] = useState(initialStaff[0]?.userId || "");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(false);
  const directoryRef = useRef<HTMLElement>(null);
  const addStaffButton = useRef<HTMLButtonElement>(null);
  const directoryScroll = useRef(0);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("evaluator");
  const [action, setAction] = useState<StaffAction>("change_role");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState<StaffFailure | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [confirmation, setConfirmation] = useState<{ request: StaffRequest; email: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  const blockedRef = useRef(false);
  const mounted = useRef(true);
  const commandRequest = useRef<AbortController | null>(null);
  const directoryRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; commandRequest.current?.abort(); directoryRequest.current?.abort(); };
  }, []);
  useEffect(() => { if (!accessVerified) commandRequest.current?.abort(); }, [accessVerified]);
  // Stable callback keeps history requests from restarting on ordinary form edits.
  const [deny] = useState(() => (error: StaffFailure) => { blockedRef.current = true; commandRequest.current?.abort(); directoryRequest.current?.abort(); setBlocked(true); setMembers([]); setConfirmation(null); setEmail(""); setReason(""); setFailure(error); });
  const member = members.find(item => item.userId === selectedId);
  const own = member?.userId === accountId;
  const effectiveAction: StaffAction = adding ? "grant" : member?.status === "revoked" ? "restore" : member?.status === "suspended" ? action === "revoke" ? "revoke" : "reactivate" : ["change_role", "suspend", "revoke"].includes(action) ? action : "change_role";
  const validation = useInlineValidation(() => {
    const errors: Record<string, string> = {};
    if (adding && members.some(item => item.email.toLowerCase() === email.trim().toLowerCase())) errors["staff-email"] = "That account already has a staff record. Select it in the staff list to change or restore access.";
    if (effectiveAction === "change_role" && role === member?.role) errors["staff-role"] = "Select a different role before reviewing this change.";
    if (!reason.trim()) errors["staff-reason"] = "Give a reason for this access change.";
    else if (reason.trim().length > 500) errors["staff-reason"] = "Keep the reason within 500 characters.";
    return errors;
  });
  const visible = members.filter(item => `${item.email} ${roleLabel(item.role)} ${item.status}`.toLowerCase().includes(query.trim().toLowerCase()));
  async function refresh() {
    directoryRequest.current?.abort();
    const controller = new AbortController();
    directoryRequest.current = controller;
    setRefreshing(true);
    const result = await getStaffData(accountId, "", isStaffMember, controller.signal);
    if (!mounted.current || blockedRef.current || controller.signal.aborted || directoryRequest.current !== controller) return false;
    directoryRequest.current = null;
    setRefreshing(false);
    if (result.ok) { setMembers(current => mergeStaffMembers(current, result.data)); setFailure(null); return true; }
    else { setFailure(result); if (deniedCodes.includes(result.code)) deny(result); }
    return false;
  }
  async function confirmChange() {
    if (!confirmation || commandRequest.current || blockedRef.current || !accessVerified) return;
    const controller = new AbortController();
    commandRequest.current = controller;
    directoryRequest.current?.abort();
    directoryRequest.current = null;
    setRefreshing(false);
    setPending(true);
    setFailure(null);
    try {
      const result = await postStaffChange(accountId, confirmation.request, controller.signal);
      if (!mounted.current || blockedRef.current || commandRequest.current !== controller) return;
      if (!result.ok) { setFailure(result); if (deniedCodes.includes(result.code)) deny(result); return; }
      setMembers(current => mergeStaffMembers(current, [result.data]));
      setConfirmation(null); setNotice("Staff access updated and recorded."); setReason(""); setAdding(false); setSelectedId(result.data.userId);
      setRole(result.data.role === "administrator" ? "evaluator" : "administrator");
      setAction(result.data.status === "suspended" ? "reactivate" : result.data.status === "revoked" ? "restore" : "change_role");
      requestAnimationFrame(() => { if (mounted.current && !blockedRef.current) detailRef.current?.focus(); });
      void refresh();
    } finally {
      if (commandRequest.current === controller) {
        commandRequest.current = null;
        if (mounted.current) setPending(false);
      }
    }
  }
  const select = (item: StaffMember) => {
    validation.clear();
    directoryScroll.current = window.scrollY;
    setMobileDetail(true);
    if (item.userId === selectedId && !adding) { requestAnimationFrame(() => detailRef.current?.focus()); return; }
    setSelectedId(item.userId); setAdding(false); setRole(item.role === "administrator" ? "evaluator" : "administrator"); setAction("change_role"); setReason(""); setFailure(null); setNotice("");
    requestAnimationFrame(() => detailRef.current?.focus());
  };
  if (blocked) return <main id="main-content" className="container portal narrow"><PageHeading title="Your access has changed" description={failure?.message || "Staff management has been cleared."} /><Link href="/staff" className="button button-orange">Check staff access</Link></main>;
  return <main id="main-content" className="container portal staff-portal workspace-redesign workspace-staff" data-mobile-view={mobileDetail ? "detail" : "list"}>
    <h1 className="sr-only">Staff management</h1>
    <div className="workspace-staff-body">
    <div className="workspace-staff-actions"><button ref={addStaffButton} className="button button-orange" type="button" disabled={pending || !!confirmation} onClick={() => { directoryScroll.current = window.scrollY; setMobileDetail(true); if (!adding) { setAdding(true); setEmail(""); setRole("evaluator"); setReason(""); setFailure(null); setNotice(""); } requestAnimationFrame(() => detailRef.current?.focus()); }}>Add staff</button></div>
    {notice && <Callout tone="success" title="Access updated" role="status" className="staff-notice">{notice}</Callout>}
    {failure && !confirmation && <Callout tone="warning"><p role="alert">{failure.message}</p><button type="button" className="text-button" disabled={refreshing} onClick={() => void refresh()}>Reload staff details</button></Callout>}
    <div className="staff-management-layout">
      <section ref={directoryRef} className="staff-directory" aria-labelledby="staff-directory-heading">
        <div className="subheading"><h2 id="staff-directory-heading">Staff accounts</h2><button className="text-button" type="button" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? "Refreshing…" : "Refresh"}</button></div>
        <div className="field"><label htmlFor="staff-search">Find staff</label><input id="staff-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Email, role, or access state" /></div>
        <p className="muted">{visible.length} of {members.length} staff accounts</p>
        {!visible.length && <p>{members.length ? "No staff match your search." : "No staff accounts are available."}</p>}
        <ul className="staff-member-list">{visible.map(item => <li key={item.userId}><button type="button" className={!adding && item.userId === selectedId ? "selected" : ""} aria-pressed={!adding && item.userId === selectedId} onClick={() => select(item)}><strong>{item.email}{item.userId === accountId && <span className="muted"> (you)</span>}</strong><span>{roleLabel(item.role)} <Badge tone={item.status === "active" ? "green" : "neutral"}>{statusLabel(item.status)}</Badge></span></button></li>)}</ul>
      </section>
      <section className="staff-member-detail" tabIndex={-1} ref={detailRef} aria-label={adding ? "Add staff access" : "Selected staff account"}>
        <button type="button" className="text-button workspace-back" disabled={pending || !!confirmation} onClick={() => { setMobileDetail(false); requestAnimationFrame(() => { window.scrollTo({ top: directoryScroll.current, behavior: "instant" }); const target = adding ? addStaffButton.current : directoryRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]'); target?.focus({ preventScroll: true }); }); }}><Icon name="arrow" size={16} />Back to staff list</button>
        {adding ? <><h2>Add staff access</h2><p>Their Google account must have signed in once.</p></> : member ? <><h2>{member.email}</h2><p>{roleLabel(member.role)} · {statusLabel(member.status)}</p><p className="muted">Updated {formatDate(member.updatedAt)} Philippine time</p></> : <h2>Select a staff account</h2>}
        {(adding || member) && (own && !adding ? <Callout>Your own access cannot be changed here. Ask another administrator if your role needs to change.</Callout> : <form {...validation.props} className="staff-change-form" onSubmit={event => {
          event.preventDefault();
          if (pending) return;
          if (!adding && !member) return;
          setNotice("");
          setFailure(null);
          if (!validation.check()) return;
          const request: StaffRequest = { action: effectiveAction, email: adding ? email.trim().toLowerCase() : "", targetId: adding ? "" : member?.userId || "", role: adding || effectiveAction === "change_role" ? role : member?.role || "evaluator", expectedVersion: adding ? 0 : member?.version || 0, mutationId: crypto.randomUUID(), reason: reason.trim() };
          setConfirmation({ request, email: adding ? request.email : member!.email });
        }}>
          {adding && <div className="field"><label htmlFor="staff-email">Google account email</label><input id="staff-email" {...validation.field("staff-email")} type="email" autoComplete="off" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />{validation.errors["staff-email"] && <FieldError id="staff-email-error">{validation.errors["staff-email"]}</FieldError>}</div>}
          {!adding && member && <div className="field"><label htmlFor="staff-action">Access change</label><select id="staff-action" value={effectiveAction} onChange={event => setAction(event.target.value as StaffAction)}>
            {member.status === "active" && <><option value="change_role">Change role</option><option value="suspend">Suspend access</option><option value="revoke">Revoke access</option></>}
            {member.status === "suspended" && <><option value="reactivate">Reactivate access</option><option value="revoke">Revoke access</option></>}
            {member.status === "revoked" && <option value="restore">Restore access</option>}
          </select></div>}
          {(adding || effectiveAction === "change_role") && <div className="field"><label htmlFor="staff-role">{adding ? "Role" : "New role"}</label><select id="staff-role" {...validation.field("staff-role", "staff-role-hint")} value={role} onChange={event => setRole(event.target.value as StaffRole)}><option value="evaluator">Evaluator</option><option value="administrator">Administrator</option></select><p className="field-hint" id="staff-role-hint">Administrators require authenticator verification.</p>{validation.errors["staff-role"] && <FieldError id="staff-role-error">{validation.errors["staff-role"]}</FieldError>}</div>}
          <div className="field"><label htmlFor="staff-reason">Reason for this change</label><textarea id="staff-reason" {...validation.field("staff-reason", "staff-reason-hint")} required maxLength={500} rows={3} value={reason} onChange={event => setReason(event.target.value)} /><p className="field-hint" id="staff-reason-hint">Private access history. {reason.trim().length} / 500 characters.</p>{validation.errors["staff-reason"] && <FieldError id="staff-reason-error">{validation.errors["staff-reason"]}</FieldError>}</div>
          <button className="button button-orange" disabled={pending || refreshing} type="submit">Review access change</button>
        </form>)}
        {!adding && member && <AccessHistory key={member.userId + ":" + member.version} accountId={accountId} member={member} onDenied={deny} />}
      </section>
    </div>
    </div>
    {accessVerified && confirmation && <Modal title={actionLabel[confirmation.request.action]} dismissible={!pending} onClose={() => { setConfirmation(null); setFailure(null); }}>
      <div className="modal-body" aria-busy={pending}>
      <div className="prose staff-confirmation"><p><strong>{confirmation.email}</strong></p><p>{roleLabel(confirmation.request.role)} · {actionLabel[confirmation.request.action]}</p><p>{confirmation.request.reason}</p><p>This updates access immediately. Staff accounts cannot use applicant workflows.</p></div>
      {failure && <Callout tone="error" title="Something needs attention" role="alert">{failure.message}{" "}{["CONFLICT", "UNAVAILABLE"].includes(failure.code) && <button type="button" className="text-button" disabled={refreshing} onClick={async () => { if (await refresh()) setConfirmation(null); }}>{refreshing ? "Refreshing…" : "Reload latest details"}</button>}</Callout>}
      <div className="modal-actions"><button className="button button-secondary" disabled={pending} type="button" onClick={() => { setConfirmation(null); setFailure(null); }}>Back</button><button className="button button-orange" type="button" disabled={pending || refreshing || !!failure && failure.code !== "UNAVAILABLE"} onClick={() => void confirmChange()}>{pending ? "Updating access…" : failure?.code === "UNAVAILABLE" ? "Retry confirmation" : "Confirm access change"}</button></div>
      </div>
    </Modal>}
  </main>;
}
