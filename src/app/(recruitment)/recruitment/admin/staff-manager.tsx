"use client";

import { ListSkeleton } from "@/app/(recruitment)/recruitment/components/workspace-skeleton";
import Link from "next/link";
import { AdminPageHeader } from "@/app/(recruitment)/recruitment/components/admin-shell";
import { useAdminNavigationGuard } from "@/app/(recruitment)/recruitment/components/admin-navigation-guard";
import { useEffect, useRef, useState } from "react";
import { getStaffData, mergeStaffMembers, postStaffChange } from "@/recruitment/lib/staff-client";
import { useVerifiedAccess } from "@/app/(recruitment)/recruitment/components/access-guard";
import { Badge, Callout, EmptyState, FieldError, Icon, Modal, PageHeading, WorkspaceDisclosureLabel } from "@/app/(recruitment)/recruitment/components/ui";
import { useInlineValidation } from "@/app/(recruitment)/recruitment/components/inline-validation";
import { useEntrance } from "@/app/(recruitment)/recruitment/components/motion";
import { formatDate } from "@/recruitment/lib/format-date";
import { actionLabel, isStaffHistory, isStaffMember, roleLabel, statusLabel } from "@/recruitment/lib/staff";
import type { StaffMember, StaffHistory, StaffRole, StaffAction, StaffRequest, StaffFailure, StaffStatus } from "@/recruitment/lib/staff";

const deniedCodes = ["AUTH_REQUIRED", "DENIED", "ACCOUNT_CHANGED", "MFA_REQUIRED"];
const accessTones: Record<StaffStatus, string> = { active: "green", suspended: "orange", revoked: "neutral" };

function StaffAccessBadge({ status }: { status: StaffStatus }) {
  return <Badge tone={accessTones[status]}><span className="badge-dot" aria-hidden="true" />{statusLabel(status)}</Badge>;
}

function StaffAvatar({ email }: { email: string }) {
  return <span className="staff-avatar" aria-hidden="true">{email.slice(0, 1).toUpperCase()}</span>;
}

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
  return <details ref={historyPanel} className="workspace-disclosure-card workspace-disclosure staff-access-history" open={state === "error" || !!error || undefined}>
    <summary><WorkspaceDisclosureLabel icon="shield">Access history</WorkspaceDisclosureLabel></summary>
    <section className="staff-history" aria-labelledby="staff-history-heading">
    <h3 className="sr-only" id="staff-history-heading">Access history</h3>
    <p className="muted">Private staff access changes.</p>
    {state === "loading" && <ListSkeleton label="Loading access history..." />}
    {state === "error" && <Callout tone="error" title="Something needs attention" role="alert">{error} <button className="text-button" type="button" onClick={() => setRetry(n => n + 1)}>Retry history</button></Callout>}
    {state === "ready" && !events.length && <EmptyState compact heading="h4" icon="shield" title="No access changes are recorded." description="Role and access changes for this account will appear here." />}
    {state === "ready" && events.length > 0 && <ol className="staff-history-list" role="list">{events.map(event => <li key={event.id}>
      <div className="subheading"><strong>{actionLabel[event.action]}</strong><time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time></div>
      <p>{event.previousRole && event.previousStatus ? `${roleLabel(event.previousRole)} / ${statusLabel(event.previousStatus)} → ` : ""}{roleLabel(event.newRole)} / {statusLabel(event.newStatus)}</p>
      <p className="staff-history-reason">{event.reason}</p><p className="muted">{event.actorEmail || "Supabase project owner"}</p>
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
  useEntrance(directoryRef, { preset: "workspace" });
  const addStaffButton = useRef<HTMLButtonElement>(null);
  const directoryScroll = useRef(0);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("evaluator");
  const [action, setAction] = useState<StaffAction>("change_role");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
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
  useAdminNavigationGuard(!blocked && dirty, !blocked && (pending || !!confirmation));
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
      setConfirmation(null); setDirty(false); setNotice("Staff access updated and recorded."); setReason(""); setAdding(false); setSelectedId(result.data.userId);
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
  function openDetail() {
    directoryScroll.current = directoryRef.current?.closest<HTMLElement>(".admin-workspace")?.scrollTop ?? window.scrollY;
    setMobileDetail(true);
    requestAnimationFrame(() => detailRef.current?.focus());
  }
  const select = (item: StaffMember) => {
    if (pending || confirmation) return;
    if ((item.userId !== selectedId || adding) && dirty && !window.confirm("Discard the unfinished access change and open this staff account?")) return;
    validation.clear();
    openDetail();
    if (item.userId === selectedId && !adding) return;
    setDirty(false); setSelectedId(item.userId); setAdding(false); setRole(item.role === "administrator" ? "evaluator" : "administrator"); setAction("change_role"); setReason(""); setFailure(null); setNotice("");
  };
  function closeDetail() {
    if (pending || confirmation) return;
    setMobileDetail(false);
    requestAnimationFrame(() => {
      const scroller = directoryRef.current?.closest<HTMLElement>(".admin-workspace") ?? window;
      scroller.scrollTo({ top: directoryScroll.current, behavior: "instant" });
      const target = adding ? addStaffButton.current : directoryRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
      (target ?? directoryRef.current?.querySelector("input"))?.focus({ preventScroll: true });
    });
  }
  if (blocked) return <main id="main-content" className="container portal narrow"><PageHeading title="Your access has changed" description={failure?.message || "Staff management has been cleared."} /><Link href="/recruitment/staff" className="button button-orange">Check staff access</Link></main>;
  return <main id="main-content" className="container portal staff-portal workspace-redesign workspace-staff" data-admin-unsaved={dirty || undefined} data-admin-pending={pending || !!confirmation || undefined} data-mobile-view={mobileDetail ? "detail" : "list"}>
    <AdminPageHeader title="Staff accounts" description="Manage who can administer recruitment and review applications.">
      <button ref={addStaffButton} className="button button-orange staff-add-action" type="button" disabled={pending || !!confirmation} onClick={() => { if (!adding && dirty && !window.confirm("Discard the unfinished access change and add staff?")) return; openDetail(); if (!adding) { setAdding(true); setDirty(false); setEmail(""); setRole("evaluator"); setReason(""); setFailure(null); setNotice(""); } }}><Icon name="people" size={16} />Add staff</button>
    </AdminPageHeader>
    <div className="workspace-staff-body">

    {!mobileDetail && notice && <Callout tone="success" title="Access updated" role="status" className="staff-notice">{notice}</Callout>}
    {!mobileDetail && failure && !confirmation && <Callout tone="warning"><p role="alert">{failure.message}</p><button type="button" className="text-button" disabled={refreshing} onClick={() => void refresh()}>Reload staff details</button></Callout>}
    <div className="staff-management-layout">
      <section ref={directoryRef} className="staff-directory" aria-labelledby="staff-directory-heading">
        <header className="staff-directory-heading">
          <h2 id="staff-directory-heading">Staff directory</h2>
          <p>{visible.length} of {members.length} staff accounts</p>
        </header>
        <div className="staff-directory-toolbar">
          <div className="staff-directory-search">
            <label className="sr-only" htmlFor="staff-search">Find staff</label>
            <Icon name="search" size={17} />
            <input id="staff-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Email, role, or access state" />
          </div>
          <button className="button button-secondary" type="button" disabled={refreshing} onClick={() => void refresh()}><Icon name="reset" size={15} />{refreshing ? "Refreshing…" : "Refresh"}</button>
        </div>
        {!visible.length && !refreshing && !failure && <EmptyState icon={members.length ? "search" : "people"}
          title={members.length ? "No staff match your search." : "No staff accounts are available."}
          description={members.length ? "Try another email, role, or access status." : "Staff accounts will appear here once access is granted."} announce>
          {members.length > 0 && <button type="button" className="button button-secondary" onClick={() => setQuery("")}>Clear search</button>}
        </EmptyState>}
        {visible.length > 0 && <div className="staff-table-wrap">
          <table className="staff-member-list" role="table" aria-labelledby="staff-directory-heading">
            <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Account</th><th scope="col" role="columnheader">Role</th><th scope="col" role="columnheader">Access</th><th scope="col" role="columnheader">Updated (Philippine time)</th></tr></thead>
            <tbody role="rowgroup">{visible.map(item => <tr key={item.userId} role="row">
              <td role="cell">
                <button className="staff-account-trigger" type="button" aria-label={"Open staff account " + item.email} aria-describedby={`staff-meta-${item.userId}`} aria-pressed={!adding && item.userId === selectedId} onClick={() => select(item)}>
                  <StaffAvatar email={item.email} />
                  <span className="staff-account-name">{item.email}{item.userId === accountId && <small>Your account</small>}
                    <span className="staff-account-meta" id={`staff-meta-${item.userId}`}>{roleLabel(item.role)} <StaffAccessBadge status={item.status} /></span>
                  </span>
                  <Icon name="chevron" size={15} />
                </button>
              </td>
              <td role="cell" data-label="Role">{roleLabel(item.role)}</td>
              <td role="cell" data-label="Access"><StaffAccessBadge status={item.status} /></td>
              <td role="cell" data-label="Updated (Philippine time)"><time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
      <Modal title={adding ? "Add staff access" : "Staff account"} className="admin-staff-drawer" workspaceDrawer active={mobileDetail && accessVerified} dismissible={!pending && !confirmation} onClose={closeDetail}><section className="staff-member-detail" tabIndex={-1} ref={detailRef} aria-label={adding ? "Add staff access" : "Selected staff account"}>
        <button type="button" className="text-button workspace-back" disabled={pending || !!confirmation} onClick={closeDetail}><Icon name="arrow" size={16} />Back to staff list</button>
        {adding ? <Callout className="staff-add-guidance"><p>Their Google account must have signed in once.</p></Callout> : member && <header className="admin-staff-identity">
          <StaffAvatar email={member.email} />
          <div>
            <h2>{member.email}</h2>
            <p className="staff-identity-meta">{roleLabel(member.role)} <StaffAccessBadge status={member.status} />{own && <small>Your account</small>}</p>
            <p className="muted staff-updated">Updated <time dateTime={member.updatedAt}>{formatDate(member.updatedAt)}</time> Philippine time</p>
          </div>
        </header>}
        {mobileDetail && notice && <Callout tone="success" title="Access updated" role="status">{notice}</Callout>}
        {mobileDetail && failure && !confirmation && <Callout tone="warning"><p role="alert">{failure.message}</p><button type="button" className="text-button" disabled={refreshing} onClick={() => void refresh()}>Reload staff details</button></Callout>}
        {(adding || member) && <section className="admin-staff-access">
        {!adding && <h3>Manage access</h3>}
        {own && !adding ? <Callout>Your own access cannot be changed here. Ask another administrator if your role needs to change.</Callout> : <form {...validation.props} className="staff-change-form" onSubmit={event => {
          event.preventDefault();
          if (pending) return;
          if (!adding && !member) return;
          setNotice("");
          setFailure(null);
          if (!validation.check()) return;
          const request: StaffRequest = { action: effectiveAction, email: adding ? email.trim().toLowerCase() : "", targetId: adding ? "" : member?.userId || "", role: adding || effectiveAction === "change_role" ? role : member?.role || "evaluator", expectedVersion: adding ? 0 : member?.version || 0, mutationId: crypto.randomUUID(), reason: reason.trim() };
          setConfirmation({ request, email: adding ? request.email : member!.email });
        }}>
          {adding && <div className="field"><label htmlFor="staff-email">Google account email</label><input id="staff-email" {...validation.field("staff-email")} type="email" autoComplete="off" required maxLength={254} value={email} onChange={event => { setDirty(true); setEmail(event.target.value); }} />{validation.errors["staff-email"] && <FieldError id="staff-email-error">{validation.errors["staff-email"]}</FieldError>}</div>}
          {!adding && member && <div className="field"><label htmlFor="staff-action">Access change</label><select id="staff-action" value={effectiveAction} onChange={event => { setDirty(true); setAction(event.target.value as StaffAction); }}>
            {member.status === "active" && <><option value="change_role">Change role</option><option value="suspend">Suspend access</option><option value="revoke">Revoke access</option></>}
            {member.status === "suspended" && <><option value="reactivate">Reactivate access</option><option value="revoke">Revoke access</option></>}
            {member.status === "revoked" && <option value="restore">Restore access</option>}
          </select></div>}
          {(adding || effectiveAction === "change_role") && <div className="field"><label htmlFor="staff-role">{adding ? "Role" : "New role"}</label><select id="staff-role" {...validation.field("staff-role", "staff-role-hint")} value={role} onChange={event => { setDirty(true); setRole(event.target.value as StaffRole); }}><option value="evaluator">Evaluator</option><option value="administrator">Administrator</option></select><p className="field-hint" id="staff-role-hint">Administrators require authenticator verification.</p>{validation.errors["staff-role"] && <FieldError id="staff-role-error">{validation.errors["staff-role"]}</FieldError>}</div>}
          <div className="field"><label htmlFor="staff-reason">Reason for this change</label><textarea id="staff-reason" {...validation.field("staff-reason", "staff-reason-hint")} required maxLength={500} rows={3} value={reason} onChange={event => { setDirty(true); setReason(event.target.value); }} /><p className="field-hint" id="staff-reason-hint">Private access history. {reason.trim().length} / 500 characters.</p>{validation.errors["staff-reason"] && <FieldError id="staff-reason-error">{validation.errors["staff-reason"]}</FieldError>}</div>
          <button className="button button-orange" disabled={pending || refreshing} type="submit">Review access change</button>
        </form>}
        </section>}
        {!adding && member && <AccessHistory key={member.userId + ":" + member.version} accountId={accountId} member={member} onDenied={deny} />}
      </section></Modal>
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
