"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { decisionCommand, decisionHistory, decisionState } from "@/lib/decision-client";
import { decisionAccessLost } from "@/lib/decisions";
import type { DecisionCommand, DecisionFailure, DecisionHistory, DecisionReceipt } from "@/lib/decisions";
import { decisionEditorReducer, initialDecisionEditor } from "@/lib/decision-workspace-state";
import { evaluationTextLength, isRecommendation, recommendations } from "@/lib/evaluations";
import { useVerifiedAccess } from "./access-guard";
import { Callout, FieldError, Modal, formatDate } from "./ui";
import { useInlineValidation } from "./inline-validation";

export function DecisionHistoryList({ accountId, applicationId, onDenied }: { accountId: string; applicationId: string; onDenied: (failure: DecisionFailure) => void }) {
  const [history, setHistory] = useState<DecisionHistory>({ items: [], nextOffset: null });
  const [busy, setBusy] = useState(true), [error, setError] = useState("");
  const request = useRef<AbortController | null>(null), active = useRef(true);
  const load = useCallback(async (offset = 0) => {
    if (request.current) return;
    const controller = new AbortController(); request.current = controller; setBusy(true);
    const result = await decisionHistory(accountId, applicationId, offset, controller.signal);
    if (!active.current || controller.signal.aborted) return;
    request.current = null; setBusy(false);
    if (result.ok) { setError(""); setHistory(current => ({ ...result.data, items: offset ? [...current.items, ...result.data.items.filter(e => !current.items.some(old => old.id === e.id))] : result.data.items })); }
    else { setError(result.message); if (decisionAccessLost(result.code)) onDenied(result); }
  }, [accountId, applicationId, onDenied]);
  useEffect(() => {
    active.current = true; const controller = new AbortController(); request.current = controller;
    void decisionHistory(accountId, applicationId, 0, controller.signal).then(result => {
      if (!active.current || controller.signal.aborted) return;
      request.current = null; setBusy(false);
      if (result.ok) { setHistory(result.data); setError(""); }
      else { setError(result.message); if (decisionAccessLost(result.code)) onDenied(result); }
    });
    return () => { active.current = false; request.current?.abort(); };
  }, [accountId, applicationId, onDenied]);
  return <section className="decision-history" aria-labelledby="decision-history-title">
    <h3 id="decision-history-title">Private decision history</h3>
    {error ? <Callout tone="error" title="Something needs attention" role="alert">{error} <button type="button" className="text-button" onClick={() => void load()}>Retry decision history</button></Callout> : !history.items.length ? <p>{busy ? "Loading decision history..." : "No decisions have been published."}</p> : <ol className="staff-history-list">{history.items.map(event => <li key={event.id}>
      <div className="subheading"><strong>{event.action === "publish" ? "Published" : "Amended"}: {event.outcome}</strong><time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time></div>
      <p>{event.previousStatus} to {event.outcome}. {event.actor.email}</p>
      {event.reason && <p className="evaluation-note">Reason: {event.reason}</p>}
      <p className="muted">Application revision {event.applicationVersion}; review revision {event.reviewVersion}.</p>
    </li>)}</ol>}
    {!error && history.nextOffset !== null && <button type="button" className="button button-secondary" disabled={busy} onClick={() => { if (history.nextOffset !== null) void load(history.nextOffset); }}>{busy ? "Loading..." : "Load earlier decisions"}</button>}
  </section>;
}

export function DecisionPanel({ accountId, applicationId, applicantName, reference, revision, editorBusy, onPublished, onDenied, showHistory = true, onPendingChange }: {
  accountId: string; applicationId: string; applicantName: string; reference: string; revision: string; editorBusy: boolean;
  onPublished: (receipt: DecisionReceipt) => void; onDenied: (failure: DecisionFailure) => void;
  showHistory?: boolean; onPendingChange?: (pending: boolean) => void;
}) {
  const [state, dispatch] = useReducer(decisionEditorReducer, initialDecisionEditor);
  const allowed = useVerifiedAccess();
  const readRequest = useRef<AbortController | null>(null), commandRequest = useRef<AbortController | null>(null), active = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const validation = useInlineValidation(() => {
    const errors: Record<string, string> = {};
    if (!isRecommendation(state.outcome)) errors["decision-outcome"] = "Choose an outcome.";
    else if (state.base?.canAmend && state.outcome === state.base.status) errors["decision-outcome"] = "Choose a different outcome for this amendment.";
    if (state.base?.canAmend) {
      if (!state.reason.trim()) errors["decision-reason"] = "Give a private reason for this amendment.";
      else if (evaluationTextLength(state.reason) > 500) errors["decision-reason"] = "Keep the amendment reason within 500 characters.";
    }
    return errors;
  });
  const fail = useCallback((failure: DecisionFailure) => { dispatch({ type: "failure", failure }); if (decisionAccessLost(failure.code)) onDenied(failure); }, [onDenied]);
  const load = useCallback(async (discard = false) => {
    if (commandRequest.current) return;
    readRequest.current?.abort(); const controller = new AbortController(); readRequest.current = controller;
    const result = await decisionState(accountId, applicationId, controller.signal);
    if (!active.current || controller.signal.aborted) return;
    readRequest.current = null;
    if (result.ok) dispatch({ type: "read", data: result.data, discard }); else fail(result);
  }, [accountId, applicationId, fail]);
  useEffect(() => {
    active.current = true; void load();
    const check = () => { if (document.visibilityState === "visible") void load(); };
    const timer = setInterval(check, 30000); window.addEventListener("focus", check); document.addEventListener("visibilitychange", check);
    return () => { active.current = false; clearInterval(timer); window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); readRequest.current?.abort(); commandRequest.current?.abort(); };
  }, [load, revision]);
  useEffect(() => { if (!allowed) commandRequest.current?.abort(); }, [allowed]);
  useEffect(() => { onPendingChange?.(!!state.pending); }, [onPendingChange, state.pending]);
  const reload = () => {
    if (state.pending) { void load(); return; }
    if (!state.dirty || window.confirm("Discard your unsaved decision choice and reason and load the latest details?")) void load(true);
  };
  async function send(request: DecisionCommand) {
    if (commandRequest.current || !allowed || !state.verified) return;
    readRequest.current?.abort(); const controller = new AbortController(); commandRequest.current = controller;
    dispatch({ type: "start", command: request });
    const result = await decisionCommand(accountId, request, controller.signal);
    if (!active.current) return;
    commandRequest.current = null;
    if (result.ok) { dispatch({ type: "saved", receipt: result.data }); onPublished(result.data); requestAnimationFrame(() => heading.current?.focus({ preventScroll: true })); void load(); }
    else { dispatch({ type: "failure", failure: result, command: true }); if (decisionAccessLost(result.code)) onDenied(result); }
  }
  function prepare() {
    const data = state.base;
    if (!data?.assignmentId || !state.verified || editorBusy || state.pending || state.busy || state.conflict || !data.canPublish && !data.canAmend) return;
    if (!validation.check() || !isRecommendation(state.outcome)) return;
    dispatch({ type: "confirm", command: { action: data.canAmend ? "amend" : "publish", applicationId, assignmentId: data.assignmentId,
      expectedApplicationVersion: data.applicationVersion, expectedReviewVersion: data.reviewVersion, outcome: state.outcome,
      reason: data.canAmend ? state.reason.trim() : "", mutationId: crypto.randomUUID() } });
  }
  if (state.loading) return <section className="panel"><p role="status">Loading decision details...</p></section>;
  if (state.blocked) return <section className="panel"><Callout tone="error" title="Something needs attention" role="alert">{state.notice}</Callout></section>;
  const data = state.data, confirmation = state.confirmation;
  const frozen = state.busy || !!state.pending || state.conflict || editorBusy;
  return <section className="panel decision-panel" data-unsaved={state.dirty || !!state.pending} data-command-pending={!!state.pending} aria-labelledby="decision-heading">
    <h2 id="decision-heading" ref={heading} tabIndex={-1}>Recruitment decision</h2>
    {state.notice && !confirmation && <Callout><p role="status">{state.notice}</p></Callout>}
    {!state.verified && <Callout tone="warning"><p role="alert">Decision details are hidden until administrator access can be verified.</p><button type="button" className="text-button" onClick={() => void load()}>Retry decision access</button></Callout>}
    <div hidden={!state.verified} inert={!state.verified || undefined}>
      {data && <>
        <p><strong>{data.accepted} / {data.capacity} accepted places filled</strong> for this opportunity.</p>
        <p>Current outcome: <strong>{data.status}</strong>. Saved recommendation: <strong>{data.recommendation ?? "Not saved"}</strong>.</p>
        <button type="button" className="text-button" disabled={state.busy} onClick={reload}>Reload decision details</button>
        {!data.canPublish && !data.canAmend && <p>{data.status === "Withdrawn" ? "This application is withdrawn. Further decisions are unavailable." : "Publication requires a saved recommendation from the current assigned evaluator."}</p>}
        {(data.canPublish || data.canAmend) && <form {...validation.props} onSubmit={event => { event.preventDefault(); prepare(); }}>
          <fieldset className="application-fields" disabled={frozen}>
            <div className="field"><label htmlFor="decision-outcome">{data.canAmend ? "New outcome" : "Outcome to publish"}</label><select id="decision-outcome" {...validation.field("decision-outcome")} value={state.outcome} onChange={event => dispatch({ type: "edit", field: "outcome", value: event.target.value })} required><option value="">Choose an outcome</option>{recommendations.filter(value => !data.canAmend || value !== data.status).map(value => <option key={value}>{value}</option>)}</select>{validation.errors["decision-outcome"] && <FieldError id="decision-outcome-error">{validation.errors["decision-outcome"]}</FieldError>}</div>
            {data.canAmend && <div className="field"><label htmlFor="decision-reason">Amendment reason (required)</label><textarea id="decision-reason" {...validation.field("decision-reason", "decision-reason-help")} rows={3} value={state.reason} onChange={event => dispatch({ type: "edit", field: "reason", value: event.target.value })} required /><p id="decision-reason-help" className="muted">Private to administrators. {evaluationTextLength(state.reason)} / 500 characters.</p>{validation.errors["decision-reason"] && <FieldError id="decision-reason-error">{validation.errors["decision-reason"]}</FieldError>}</div>}
            <p className="muted">Publishes to the applicant portal.</p>
            <button className="button button-orange" type="submit">{data.canAmend ? "Review outcome amendment" : "Review publication"}</button>
          </fieldset>
        </form>}
        {editorBusy && <p>Finish or discard the assignment changes before confirming a decision.</p>}
        {state.dirty && !state.pending && <p role="status">Unsaved decision choice</p>}
        {state.conflict && <Callout tone="error" title="Something needs attention" role="alert">Reload decision details before confirming. Your choice and reason are preserved.</Callout>}
        {showHistory && <DecisionHistoryList key={data.applicationVersion} accountId={accountId} applicationId={applicationId} onDenied={fail} />}
      </>}
    </div>
    {confirmation && state.verified && <Modal title={confirmation.action === "publish" ? "Confirm publication" : "Confirm outcome amendment"} dismissible={!state.busy && !state.pending} onClose={() => dispatch({ type: "confirm", command: null })}><div className="modal-body" aria-busy={state.busy}>
      <p><strong>{applicantName}</strong><br />{reference}</p><p>{confirmation.action === "amend" ? "Change the published outcome to" : "Publish"} <strong>{confirmation.outcome}</strong>?</p>
      {confirmation.reason && <p className="evaluation-note">Reason: {confirmation.reason}</p>}
      <p>This updates the applicant portal. Reviews and assignments stay read-only after publication.</p>
      {state.notice && <Callout tone="error" title="Something needs attention" role="alert">{state.notice}</Callout>}
      <div className="modal-actions"><button type="button" className="button button-secondary" disabled={state.busy || !!state.pending} onClick={() => dispatch({ type: "confirm", command: null })}>Back</button><button type="button" className="button button-orange" disabled={state.busy || state.conflict && !state.pending} onClick={() => void send(state.pending ?? confirmation)}>{state.busy ? "Publishing..." : state.pending ? "Retry same decision" : confirmation.action === "publish" ? "Publish outcome" : "Confirm amendment"}</button>{(state.pending || state.conflict) && <button type="button" className="text-button" disabled={state.busy} onClick={reload}>Check latest decision</button>}</div>
    </div></Modal>}
  </section>;
}
