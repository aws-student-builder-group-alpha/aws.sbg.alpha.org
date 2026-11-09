"use client";
import { ApplicantOutreach } from './applicant-outreach';

import Link from "next/link";
import { useCallback, useEffect, useId, useReducer, useRef, useState, type ReactNode } from "react";
import { evaluationCommand, evaluationDetail, evaluationHistory, evaluationList } from "@/lib/evaluation-client";
import { evaluationTextLength, isRecommendation, recommendations } from "@/lib/evaluations";
import type { EvaluationCommand, EvaluationFailure, EvaluationHistory, EvaluationList, EvaluationPerson } from "@/lib/evaluations";
import { evaluationEditorReducer, initialEvaluationEditor } from "@/lib/evaluation-workspace-state";
import { getOpportunity, opportunityLabel } from "@/lib/catalog";
import { ApplicationContent } from "./application-content";
import { useVerifiedAccess } from "./access-guard";
import { AdminNavigation } from "./admin-navigation";
import { DecisionHistoryList, DecisionPanel } from "./decision-panel";
import type { DecisionFailure, DecisionReceipt } from "@/lib/decisions";
import { defaultQueueFilters, queueIsFiltered, sameQueueFilters } from "@/lib/application-queue";
import type { QueueFilters } from "@/lib/application-queue";
import { ApplicationExportControl } from "./application-export-control";
import type { ExportFailure } from "@/lib/application-export";
import { ApplicationQueueControls, ApplicationQueueCounts } from "./application-queue-controls";
import { Callout, FieldError, Icon, Modal, PageHeading, StatusBadge, formatDate } from "./ui";
import { useInlineValidation } from "./inline-validation";

function opportunityName(id: string) {
  const opportunity = getOpportunity(id);
  return opportunity ? opportunityLabel(opportunity) : "Opportunity unavailable";
}
const unsavedSelector = '.evaluation-detail[data-unsaved="true"], .decision-panel[data-unsaved="true"]';
const pendingSelector = '.evaluation-detail[data-command-pending="true"], .decision-panel[data-command-pending="true"]';

function RecordSections({ redesign, administrator, application, controls, decision, history, pending }: {
  redesign: boolean; administrator: boolean; application: ReactNode; controls: ReactNode; decision: ReactNode; history: ReactNode; pending: boolean;
}) {
  const id = useId();
  const [selected, setSelected] = useState(0);
  const labels = administrator ? ["Application", "Review & decision", "History"] : ["Application", "Recommendation", "Previous reviews"];
  if (!redesign) return <><div className="evaluation-reading-layout">{application}{controls}</div>{decision}{history}</>;
  return <div className="record-sections">
    <div className="record-tabs" role="tablist" aria-label="Application details">
      {labels.map((label, index) => <button key={label} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} disabled={pending}
        onClick={() => setSelected(index)} onKeyDown={event => {
          if (pending) return;
          const next = event.key === "ArrowRight" ? (index + 1) % 3 : event.key === "ArrowLeft" ? (index + 2) % 3 : event.key === "Home" ? 0 : event.key === "End" ? 2 : null;
          if (next === null) return;
          event.preventDefault(); setSelected(next);
          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
        }}>{label}</button>)}
    </div>
    {pending && <p className="record-pending" role="status">Complete the pending confirmation before changing sections.</p>}
    {[application, <div className="record-review" key="review">{controls}{decision}</div>, history].map((content, index) => <div key={index} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} tabIndex={0} hidden={selected !== index}>{content}</div>)}
  </div>;
}

function ReviewHistory({ accountId, applicationId, administrator, onDenied }: { accountId: string; applicationId: string; administrator: boolean; onDenied: (error: EvaluationFailure) => void }) {
  const [page, setPage] = useState<EvaluationHistory>({ items: [], nextOffset: null });
  const [busy, setBusy] = useState(true), [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const request = useRef<AbortController | null>(null), active = useRef(true);
  useEffect(() => {
    active.current = true;
    const controller = new AbortController(); request.current = controller;
    void evaluationHistory(accountId, applicationId, 0, controller.signal).then(result => {
      if (!active.current || controller.signal.aborted) return;
      request.current = null; setBusy(false);
      if (result.ok) { setPage(result.data); setError(""); }
      else { setError(result.message); if (result.code !== "UNAVAILABLE") onDenied(result); }
    });
    return () => { active.current = false; request.current?.abort(); };
  }, [accountId, applicationId, onDenied, reload]);
  return <section className="evaluation-history" aria-labelledby="review-history-heading">
    <h3 id="review-history-heading">{administrator ? "Private evaluation history" : "Previous reviews"}</h3>
    <p className="muted">{administrator ? "Assignment changes and recommendation revisions. Private to authorized staff." : "Earlier evaluators' latest saved reviews are read-only. Your current assignment needs its own recommendation."}</p>
    {error ? <Callout tone="error" title="Something needs attention" role="alert">{error} <button className="text-button" type="button" onClick={() => { setBusy(true); setReload(n => n + 1); }}>Retry history</button></Callout> : busy && !page.items.length ? <p role="status">Loading history...</p> : !page.items.length ? <p>No earlier reviews or changes are recorded.</p> : <ol className="staff-history-list">{page.items.map(event => <li key={event.kind + event.id}>
      <div className="subheading"><strong>{event.kind === "assignment" ? "Evaluator assigned" : event.recommendation}</strong><time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time></div>
      <p>{event.evaluator.email} {event.kind === "review" && `- review revision ${event.reviewVersion}`}</p>
      {event.notes && <p className="evaluation-note">{event.notes}</p>}
      {event.reason && <p>Reason: {event.reason}</p>}
      {administrator && event.kind === "assignment" && <p className="muted">Changed by {event.actor.email}</p>}
    </li>)}</ol>}
    {!error && page.nextOffset !== null && <button className="button button-secondary" disabled={busy} type="button" onClick={async () => {
      if (request.current || page.nextOffset === null) return;
      const controller = new AbortController(); request.current = controller; setBusy(true);
      const result = await evaluationHistory(accountId, applicationId, page.nextOffset, controller.signal);
      if (!active.current || controller.signal.aborted) return;
      request.current = null; setBusy(false);
      if (result.ok) setPage(current => ({ ...result.data, items: [...current.items, ...result.data.items.filter(e => !current.items.some(old => old.id === e.id))] }));
      else { setError(result.message); if (result.code !== "UNAVAILABLE") onDenied(result); }
    }}>{busy ? "Loading..." : "Load earlier reviews"}</button>}
  </section>;
}

function EvaluationPanel({ accountId, applicationId, evaluators, onChanged, onNext, redesign = false }: { accountId: string; applicationId: string; evaluators: EvaluationPerson[]; onChanged: () => void; onNext?: () => void; redesign?: boolean }) {
  const [state, dispatch] = useReducer(evaluationEditorReducer, initialEvaluationEditor);
  const [decisionPending, setDecisionPending] = useState(false);
  const roleVerified = useVerifiedAccess();
  const readRequest = useRef<AbortController | null>(null), commandRequest = useRef<AbortController | null>(null);
  const active = useRef(true), heading = useRef<HTMLHeadingElement>(null);
  const validation = useInlineValidation(() => {
    const errors: Record<string, string> = {};
    const detail = state.detail;
    if (detail?.role === "administrator") {
      if (!state.evaluatorId) errors["evaluation-person"] = "Choose an active evaluator.";
      if (detail.assignment && detail.assignment.evaluator.id !== state.evaluatorId && !state.reason.trim()) errors["assignment-reason"] = "Give a reason for switching evaluators.";
      else if (evaluationTextLength(state.reason) > 500) errors["assignment-reason"] = "Keep the assignment reason within 500 characters.";
    } else {
      if (!isRecommendation(state.recommendation)) errors["evaluation-recommendation"] = "Choose a recommendation.";
      if (evaluationTextLength(state.notes) > 5000) errors["evaluation-notes"] = "Keep private notes within 5,000 characters.";
    }
    return errors;
  });
  const load = useCallback(async (discard = false) => {
    if (commandRequest.current) return;
    readRequest.current?.abort(); const controller = new AbortController(); readRequest.current = controller;
    const result = await evaluationDetail(accountId, applicationId, controller.signal);
    if (!active.current || controller.signal.aborted) return;
    readRequest.current = null;
    if (result.ok) dispatch({ type: "read", detail: result.data, discard });
    else { dispatch({ type: "failure", failure: result }); if (["AUTH_REQUIRED", "ACCOUNT_CHANGED", "MFA_REQUIRED", "DENIED", "NOT_FOUND"].includes(result.code)) onChanged(); }
  }, [accountId, applicationId, onChanged]);
  useEffect(() => {
    active.current = true;
    void load();
    const check = () => { if (document.visibilityState === "visible") void load(); };
    const timer = setInterval(check, 30000);
    window.addEventListener("focus", check); document.addEventListener("visibilitychange", check);
    return () => { active.current = false; clearInterval(timer); window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); readRequest.current?.abort(); commandRequest.current?.abort(); };
  }, [load]);
  useEffect(() => { if (!roleVerified) commandRequest.current?.abort(); }, [roleVerified]);
  const denied = useCallback((failure: EvaluationFailure) => { commandRequest.current?.abort(); readRequest.current?.abort(); dispatch({ type: "failure", failure }); onChanged(); }, [onChanged]);
  const decisionDenied = useCallback((failure: DecisionFailure) => { if (failure.code !== "CAPACITY_FULL") denied({ ...failure, code: failure.code }); }, [denied]);
  const published = useCallback((receipt: DecisionReceipt) => { dispatch({ type: "decision", receipt }); onChanged(); void load(); }, [onChanged, load]);
  async function send(request: EvaluationCommand) {
    if (commandRequest.current || !roleVerified || !state.verified) return;
    readRequest.current?.abort();
    const controller = new AbortController(); commandRequest.current = controller;
    dispatch({ type: "start", command: request });
    const result = await evaluationCommand(accountId, request, controller.signal);
    if (!active.current) return;
    commandRequest.current = null;
    if (result.ok) {
      dispatch({ type: "saved", command: request, receipt: result.data, evaluator: request.action === "assign" ? evaluators.find(e => e.id === request.evaluatorId) ?? state.detail?.assignment?.evaluator : undefined });
      requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
      onChanged(); void load();
    } else {
      dispatch({ type: "failure", failure: result, command: true });
      if (["AUTH_REQUIRED", "ACCOUNT_CHANGED", "MFA_REQUIRED", "DENIED", "NOT_FOUND"].includes(result.code)) onChanged();
    }
  }
  function prepare() {
    const detail = state.detail;
    if (!detail || !state.verified || state.busy || state.pending || state.conflict) return;
    if (!validation.check()) return;
    if (detail.role === "administrator") {
      dispatch({ type: "confirm", command: { action: "assign", applicationId, evaluatorId: state.evaluatorId, expectedApplicationVersion: detail.application.version, expectedAssignmentId: detail.assignment?.id ?? null, reason: state.reason.trim(), mutationId: crypto.randomUUID() } });
    } else {
      if (!detail.assignment || !isRecommendation(state.recommendation)) { dispatch({ type: "notice", notice: "Reload application details to check the current assignment." }); return; }
      void send({ action: "save_review", applicationId, assignmentId: detail.assignment.id, expectedVersion: state.baseReviewVersion, recommendation: state.recommendation, notes: state.notes, mutationId: crypto.randomUUID() });
    }
  }
  function reload() {
    if (state.pending) { void load(); return; }
    if (!state.dirty || window.confirm("Discard your unsaved evaluation changes and load the latest details?")) void load(true);
  }
  const detail = state.detail, frozen = state.busy || !!state.pending || state.conflict || !state.verified;
  const availableEvaluators = detail ? evaluators.filter(person => person.email.toLowerCase() !== detail.application.email.toLowerCase()) : evaluators;
  const confirmation = state.confirmation;
  const confirmedEvaluatorId = confirmation?.action === "assign" ? confirmation.evaluatorId : "";
  const focusedApplication = useRef("");
  useEffect(() => {
    if (redesign && state.verified && detail && focusedApplication.current !== applicationId) {
      focusedApplication.current = applicationId; heading.current?.focus();
    }
  }, [applicationId, detail, redesign, state.verified]);
  if (state.loading) return <section className="panel"><p role="status">Loading application...</p></section>;
  if (state.blocked) return <section className="panel"><h2>Assignment unavailable</h2><Callout tone="error" title="Something needs attention" role="alert">{state.notice}</Callout><div className="inline-actions"><button className="button button-secondary" type="button" onClick={onChanged}>Reload applications</button><button className="text-button" type="button" onClick={() => void load(true)}>Check application access</button></div></section>;
  return <section className="evaluation-detail" data-unsaved={state.dirty || !!state.pending} data-command-pending={!!state.pending}>
    {state.notice && !confirmation && <Callout><p role="status">{state.notice}</p></Callout>}
    {!state.verified && <Callout tone="warning"><p role="alert">Application access could not be verified. Details are hidden until the check succeeds.</p><button type="button" className="button button-secondary" onClick={() => void load()}>Retry application access</button></Callout>}
    <div hidden={!state.verified} inert={!state.verified || undefined}>
      {detail && <>
        <section className="panel record-identity">
          <div className="subheading"><h2 ref={heading} tabIndex={-1}>{detail.application.data.profile.fullName}</h2><StatusBadge status={detail.application.status} /></div>
          <p className="application-reference">{detail.application.reference}</p>
          <p>{opportunityName(detail.application.data.opportunityId)}. Submitted {formatDate(detail.application.submittedAt)}, Philippine time.</p>
          <div className="inline-actions"><button type="button" className="text-button" disabled={state.busy} onClick={reload}>Reload latest details</button></div>
        </section>
        <RecordSections redesign={redesign} administrator={detail.role === "administrator"} pending={!!state.pending || decisionPending}
          application={<section className="panel evaluation-answers"><h2>Submitted application</h2><ApplicationContent application={{ ...detail.application.data, profile: { ...detail.application.data.profile, email: detail.application.email } }} /></section>}
          controls={<section className="panel evaluation-controls" aria-labelledby="evaluation-controls-heading">
            <h2 id="evaluation-controls-heading">{detail.role === "administrator" ? "Evaluator assignment" : "Your recommendation"}</h2>
            {!detail.canEdit && <p>{detail.application.status === "Withdrawn" ? "This application is withdrawn and read-only." : "An outcome is published. Evaluator assignments and recommendations are read-only."}</p>}
            {detail.assignment ? <p>Assigned to <strong>{detail.assignment.evaluator.email}</strong></p> : <p>No evaluator is assigned.</p>}
            {detail.role === "administrator" && !availableEvaluators.length && detail.canEdit && <p>No active evaluators are available. <Link href="/admin">Manage staff access</Link> to add an evaluator after their first sign-in.</p>}
            {detail.canEdit && <form {...validation.props} onSubmit={event => { event.preventDefault(); prepare(); }}>
              <fieldset className="application-fields" disabled={frozen || detail.role === "administrator" && !availableEvaluators.length}>
                {detail.role === "administrator" ? <>
                  <div className="field"><label htmlFor="evaluation-person">Evaluator</label><select id="evaluation-person" {...validation.field("evaluation-person")} value={state.evaluatorId} onChange={e => dispatch({ type: "edit", field: "evaluatorId", value: e.target.value })} required>
                    <option value="">Choose an active evaluator</option>
                    {detail.assignment && !availableEvaluators.some(e => e.id === detail.assignment?.evaluator.id) && <option value={detail.assignment.evaluator.id} disabled>{detail.assignment.evaluator.email} (inactive)</option>}
                    {availableEvaluators.map(person => <option key={person.id} value={person.id}>{person.email}</option>)}
                  </select>{validation.errors["evaluation-person"] && <FieldError id="evaluation-person-error">{validation.errors["evaluation-person"]}</FieldError>}</div>
                  <div className="field"><label htmlFor="assignment-reason">{detail.assignment && state.evaluatorId !== detail.assignment.evaluator.id ? "Reason for reassignment (required)" : "Assignment reason (optional)"}</label><textarea id="assignment-reason" {...validation.field("assignment-reason", "assignment-reason-help")} rows={3} value={state.reason} onChange={e => dispatch({ type: "edit", field: "reason", value: e.target.value })} required={!!detail.assignment && state.evaluatorId !== detail.assignment.evaluator.id} /><p id="assignment-reason-help" className="muted">Private to administrators. {evaluationTextLength(state.reason)} / 500 characters.</p>{validation.errors["assignment-reason"] && <FieldError id="assignment-reason-error">{validation.errors["assignment-reason"]}</FieldError>}</div>
                </> : <>
                  <div className="field"><label htmlFor="evaluation-recommendation">Recommendation</label><select id="evaluation-recommendation" {...validation.field("evaluation-recommendation")} value={state.recommendation} onChange={e => dispatch({ type: "edit", field: "recommendation", value: e.target.value })} required><option value="">Choose a recommendation</option>{recommendations.map(value => <option key={value}>{value}</option>)}</select>{validation.errors["evaluation-recommendation"] && <FieldError id="evaluation-recommendation-error">{validation.errors["evaluation-recommendation"]}</FieldError>}</div>
                  <div className="field"><label htmlFor="evaluation-notes">Private notes (optional)</label><textarea id="evaluation-notes" {...validation.field("evaluation-notes", "evaluation-notes-help")} rows={7} value={state.notes} onChange={e => dispatch({ type: "edit", field: "notes", value: e.target.value })} /><p id="evaluation-notes-help" className="muted">{evaluationTextLength(state.notes)} / 5,000 characters. Visible to administrators and future assigned evaluators.</p>{validation.errors["evaluation-notes"] && <FieldError id="evaluation-notes-error">{validation.errors["evaluation-notes"]}</FieldError>}</div>
                  <p className="muted">Saving does not publish an outcome.</p>
                </>}
                <button className="button button-orange" type="submit">{state.busy ? "Saving..." : detail.role === "administrator" ? "Review evaluator assignment" : "Save recommendation"}</button>
              </fieldset>
            </form>}
            {detail.role === "evaluator" && detail.review && onNext && <button type="button" className="button button-secondary" disabled={state.dirty || state.busy || !!state.pending || !!state.conflict || !state.verified || !roleVerified} onClick={onNext}>Review next application</button>}
            {state.dirty && !state.pending && <p role="status">Unsaved changes</p>}
            {state.conflict && <Callout tone="error" title="Something needs attention" role="alert">Reload the latest details before saving. Your local changes are still here.</Callout>}
            {state.pending && !state.confirmation && <div className="inline-actions"><button className="button button-orange" type="button" disabled={state.busy} onClick={() => { if (state.pending) void send(state.pending); }}>{state.busy ? "Saving..." : "Retry same recommendation"}</button><button className="text-button" type="button" disabled={state.busy} onClick={() => void load()}>Check latest details</button></div>}
            {detail.review && <section className="saved-recommendation"><h3>Saved recommendation</h3><p><strong>{detail.review.recommendation}</strong> - revision {detail.review.version}</p><p className="evaluation-note">{detail.review.notes || "No private notes."}</p><p className="muted">Saved {formatDate(detail.review.updatedAt)}, Philippine time.</p></section>}
          </section>}
          decision={detail.role === "administrator" && <DecisionPanel accountId={accountId} applicationId={applicationId} applicantName={detail.application.data.profile.fullName} reference={detail.application.reference}
          revision={`${detail.application.version}:${detail.assignment?.id ?? "none"}:${detail.review?.version ?? 0}`} editorBusy={state.dirty || state.busy || !!state.pending || !!state.confirmation}
          onPublished={published} onDenied={decisionDenied} showHistory={!redesign} onPendingChange={setDecisionPending} />}
          history={<div className="record-history"><section className="panel"><ReviewHistory key={`${detail.assignment?.id ?? "none"}:${detail.review?.version ?? 0}`} accountId={accountId} applicationId={applicationId} administrator={detail.role === "administrator"} onDenied={denied} /></section>
            {redesign && detail.role === "administrator" && <section className="panel"><DecisionHistoryList key={detail.application.version} accountId={accountId} applicationId={applicationId} onDenied={decisionDenied} /></section>}</div>} />
        <ApplicantOutreach key={`${detail.application.id}:${detail.application.version}`} accountId={accountId} application={detail.application} administrator={detail.role === 'administrator'} />
      </>}
    </div>
    {confirmation && state.verified && <Modal title="Confirm evaluator assignment" dismissible={!state.busy && !state.pending} onClose={() => dispatch({ type: "confirm", command: null })}><div className="modal-body" aria-busy={state.busy}>
      <p>Assign {detail?.application.reference} to {evaluators.find(e => e.id === confirmedEvaluatorId)?.email ?? detail?.assignment?.evaluator.email}?</p>
      <p>Changing evaluators preserves previous reviews and requires a fresh recommendation. The new evaluator can read earlier saved recommendations and notes.</p>
      {confirmation.action === "assign" && confirmation.reason && <p>Reason: {confirmation.reason}</p>}
      {state.notice && <Callout tone="error" title="Something needs attention" role="alert">{state.notice}</Callout>}
      <div className="modal-actions"><button className="button button-secondary" type="button" disabled={state.busy || !!state.pending} onClick={() => dispatch({ type: "confirm", command: null })}>Back</button>
        <button className="button button-orange" type="button" disabled={state.busy || state.conflict} onClick={() => void send(state.pending ?? confirmation)}>{state.busy ? "Assigning..." : state.pending ? "Retry same assignment" : "Confirm assignment"}</button>
        {(state.pending || state.conflict) && <button className="text-button" type="button" disabled={state.busy} onClick={reload}>Reload latest details</button>}</div>
    </div></Modal>}
  </section>;
}

export function EvaluationWorkspace({ accountId, initialList, redesign = false }: { accountId: string; initialList: EvaluationList; redesign?: boolean }) {
  const [list, setList] = useState(initialList), [selected, setSelected] = useState("");
  const [filters, setFilters] = useState<QueueFilters>(initialList.queue?.filters ?? defaultQueueFilters);
  const [applied, setApplied] = useState<QueueFilters>(initialList.queue?.filters ?? defaultQueueFilters);
  const [exportBusy, setExportBusy] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(false);
  const listScroll = useRef(0), listElement = useRef<HTMLElement>(null);
  const [navigationNotice, setNavigationNotice] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [blocked, setBlocked] = useState(false);
  const request = useRef<AbortController | null>(null), active = useRef(true);
  const allowed = useVerifiedAccess();
  const administrator = initialList.role === "administrator";
  const enhanced = redesign;
  const refresh = useCallback(async (offset = 0, values = applied) => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller; setBusy(true);
    const result = await evaluationList(accountId, offset, values.search, controller.signal, administrator ? values : undefined);
    if (!active.current || controller.signal.aborted) return;
    request.current = null; setBusy(false);
    if (result.ok) { setList(current => offset ? { ...result.data, items: [...current.items, ...result.data.items.filter(i => !current.items.some(old => old.id === i.id))] } : result.data); setError(""); }
    else { setError(result.message); if (result.code !== "UNAVAILABLE") { setBlocked(true); setList(current => ({ ...current, items: [], evaluators: [] })); setSelected(""); } }
  }, [accountId, applied, administrator]);
  const changed = useCallback(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    active.current = true;
    const warn = (event: BeforeUnloadEvent) => { if (document.querySelector(unsavedSelector)) event.preventDefault(); };
    const leave = (event: MouseEvent) => { if (!(event.target instanceof Element)) return; const link = event.target.closest("a[href]"); if (!link || link instanceof HTMLAnchorElement && link.hasAttribute("download") && link.href.startsWith("blob:")) return; if (document.querySelector(pendingSelector) || document.querySelector(unsavedSelector) && !window.confirm("Discard your unsaved evaluation changes and leave?")) event.preventDefault(); };
    window.addEventListener("beforeunload", warn); document.addEventListener("click", leave, true);
    return () => { active.current = false; request.current?.abort(); window.removeEventListener("beforeunload", warn); document.removeEventListener("click", leave, true); };
  }, []);
  useEffect(() => { if (!allowed) request.current?.abort(); }, [allowed]);
  function canLeave() {
    if (document.querySelector(pendingSelector)) { setNavigationNotice("Retry or check your pending confirmation before changing applications or filters."); return false; }
    return !document.querySelector(unsavedSelector) || window.confirm("Discard your unsaved evaluation changes and change applications?");
  }
  function applyFilters(clear = false) {
    if (exportBusy || !canLeave()) return;
    const values = clear ? defaultQueueFilters : { ...filters, search: filters.search.trim() };
    setFilters(values); setApplied(values); setSelected(""); setMobileDetail(false); setNavigationNotice(""); void refresh(0, values);
  }
  function openApplication(id: string) {
    if (id !== selected && !canLeave()) return;
    request.current?.abort(); request.current = null; setBusy(false);
    listScroll.current = window.scrollY;
    setSelected(id); setMobileDetail(true); setNavigationNotice("");
  }
  function applyShortcut(status: QueueFilters["status"], assignment: QueueFilters["assignment"], review: QueueFilters["review"]) {
    if (busy || exportBusy || !canLeave()) return;
    const values = { ...applied, status, assignment, review };
    setFilters(values); setApplied(values); setSelected(""); setMobileDetail(false); setNavigationNotice(""); void refresh(0, values);
  }
  async function reviewNext() {
    if (busy || !allowed || !canLeave()) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller; setBusy(true); setNavigationNotice("");
    try {
      let offset: number | null = 0;
      while (offset !== null) {
        const result = await evaluationList(accountId, offset, applied.search, controller.signal);
        if (!active.current || controller.signal.aborted) return;
        if (!result.ok) { setNavigationNotice(result.message); if (result.code !== "UNAVAILABLE") { setBlocked(true); setList(current => ({ ...current, items: [], evaluators: [] })); setSelected(""); } return; }
        const candidate = result.data.items.find(item => item.id !== selected && item.status === "Under Review" && !item.recommendation && item.assignment);
        if (candidate) {
          const checked = await evaluationDetail(accountId, candidate.id, controller.signal);
          if (!active.current || controller.signal.aborted) return;
          if (!checked.ok && ["AUTH_REQUIRED", "ACCOUNT_CHANGED", "MFA_REQUIRED"].includes(checked.code)) { setError(checked.message); setBlocked(true); setList(current => ({ ...current, items: [], evaluators: [] })); setSelected(""); return; }
          if (!checked.ok || !checked.data.canEdit || checked.data.review) { setNavigationNotice("The next application changed or could not be verified. Try Review next application again."); return; }
          setList(result.data); openApplication(candidate.id); return;
        }
        offset = result.data.nextOffset;
      }
      setNavigationNotice("No more unreviewed applications in this search.");
    } finally { if (request.current === controller) { request.current = null; setBusy(false); } }
  }
  function backToList() {
    if (document.querySelector(pendingSelector)) { setNavigationNotice("Retry or check your pending confirmation before returning to the list."); return; }
    request.current?.abort(); request.current = null; setBusy(false);
    setMobileDetail(false); setNavigationNotice("");
    requestAnimationFrame(() => {
      listElement.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
      window.scrollTo({ top: listScroll.current, behavior: "instant" });
    });
  }
  const resultsCurrent = !busy && !error && (!administrator || !!list.queue && sameQueueFilters(list.queue.filters, applied));
  const exportControl = administrator && <ApplicationExportControl compact={enhanced} key={JSON.stringify(applied)} accountId={accountId} filters={applied} disabled={!resultsCurrent || !list.queue?.total} onBusy={setExportBusy} onDenied={(failure: ExportFailure) => { setError(failure.message); setBlocked(true); setList(current => ({ ...current, items: [], evaluators: [] })); setSelected(""); }} />;
  const pageHeading = <PageHeading eyebrow={enhanced ? "November 2026 · Evaluation" : undefined} title={administrator ? "Application assignments" : "Evaluator workspace"} description={administrator ? "Assign one evaluator and follow saved recommendations." : "Read your assigned applications and save a recommendation with optional private notes."} />;
  if (blocked) return <main id="main-content" className="container portal narrow"><PageHeading title="Check staff access" description={error} /><Link href="/staff" className="button button-orange">Staff sign-in</Link></main>;
  return <main id="main-content" className={`container portal staff-portal evaluation-workspace${enhanced ? ` workspace-redesign workspace-evaluation ${administrator ? "workspace-admin" : "workspace-reviewer"}` : ""}`} data-mobile-view={enhanced ? mobileDetail ? "detail" : "list" : undefined}>
    {list.role === "administrator" && !enhanced && <AdminNavigation current="applications" />}
    {enhanced ? <h1 className="sr-only">{administrator ? "Applications" : "Evaluator workspace"}</h1> : pageHeading}
    <div className={enhanced ? "workspace-queue-overview" : undefined}>
    {administrator ? <ApplicationQueueControls collapsible={enhanced} trailingActions={enhanced ? exportControl : undefined} filters={filters} applied={applied} busy={busy || exportBusy} frozen={exportBusy} onChange={setFilters} onApply={() => applyFilters()} onClear={() => applyFilters(true)} onRefresh={() => void refresh()} /> : <form className="evaluation-search" onSubmit={event => { event.preventDefault(); applyFilters(); }}><label htmlFor="evaluation-search">Search applications</label><div className="inline-actions"><input id="evaluation-search" value={filters.search} maxLength={100} onChange={e => setFilters(current => ({ ...current, search: e.target.value }))} placeholder="Name, email, or reference" /><button className="button button-secondary" disabled={busy} type="submit">Search</button><button className="text-button" type="button" disabled={busy} onClick={() => void refresh()}>Refresh applications</button></div></form>}
    {!enhanced && exportControl}
    {administrator && resultsCurrent && list.queue && <ApplicationQueueCounts compact={enhanced} queue={list.queue} shown={list.items.length} />}
    {administrator && <details className="queue-views-disclosure"><summary>Queue views</summary><div className="inline-actions queue-shortcuts" aria-label="Application queue shortcuts">{([
      ["Unassigned", "Submitted", "unassigned", "all"], ["Awaiting recommendation", "Under Review", "assigned", "missing"], ["Ready for decision", "Under Review", "assigned", "saved"],
    ] as const).map(([label,status,assignment,review]) => <button key={label} type="button" className="button button-secondary" disabled={busy || exportBusy} aria-pressed={applied.status === status && applied.assignment === assignment && applied.review === review} onClick={() => applyShortcut(status,assignment,review)}>{label}</button>)}</div></details>}
    </div>
    {navigationNotice && <Callout><p role="alert">{navigationNotice}</p></Callout>}
    {error && <Callout tone="warning"><p role="alert">{error}</p><button type="button" className="text-button" onClick={() => void refresh()}>Retry applications</button></Callout>}
    <div className="evaluation-layout">
      <aside ref={listElement} className="panel evaluation-list" aria-label="Applications" aria-busy={busy}>
        {busy && <p role="status">Loading applications...</p>}
        {resultsCurrent && !list.items.length && <p>{queueIsFiltered(applied) ? "No applications match the applied search and filters." : list.role === "administrator" ? "No submitted applications yet." : "You have no active assignments."}</p>}
        <div hidden={!resultsCurrent}>{list.items.map(item => <button type="button" key={item.id} aria-pressed={selected === item.id} className="evaluation-list-item" onClick={() => openApplication(item.id)}>
          {enhanced ? <><span className="application-row-heading"><strong>{item.name}</strong><StatusBadge status={item.status} /></span><span>{opportunityName(item.opportunityId)}</span><span>{item.reference}</span></> : <><strong>{item.name}</strong><span>{item.reference}</span><StatusBadge status={item.status} /><span>{opportunityName(item.opportunityId)}</span></>}<span className="muted">{item.assignment ? `${item.assignment.evaluator.email} - ${item.recommendation ?? "Recommendation needed"}` : "Not assigned"}</span>
        </button>)}</div>
        {resultsCurrent && list.nextOffset !== null && <button className="button button-secondary" disabled={busy} type="button" onClick={() => { if (list.nextOffset !== null) void refresh(list.nextOffset); }}>Load more applications</button>}
      </aside>
      <div className={enhanced ? "workspace-detail" : "evaluation-detail-slot"}>
      {enhanced && selected && <button type="button" className="text-button workspace-back" onClick={backToList}><Icon name="arrow" size={16} />Back to list</button>}
      {selected ? <EvaluationPanel redesign={enhanced} key={selected} accountId={accountId} applicationId={selected} evaluators={list.evaluators} onChanged={changed} onNext={!administrator && !busy ? () => void reviewNext() : undefined} /> : <section className="panel evaluation-empty"><h2>Choose an application</h2><p>{list.role === "administrator" ? "Open a submitted application to assign an evaluator or read its recommendation." : "Select an assigned application to read the answers and save your recommendation."}</p></section>}
      </div>
    </div>
  </main>;
}
