"use client";

import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { intakeCommand, intakeHistory, intakeState } from "@/lib/intake-client";
import { intakeAccessLost, intakeAvailability } from "@/lib/intake";
import type { IntakeCommand, IntakeFailure, IntakeHistory, IntakeState } from "@/lib/intake";
import { initialIntakeEditor, intakeEditorReducer } from "@/lib/intake-workspace-state";
import { evaluationTextLength } from "@/lib/evaluations";
import { useVerifiedAccess } from "./access-guard";
import { Callout, FieldError, Modal, PageHeading, formatDate } from "./ui";
import { useInlineValidation } from "./inline-validation";

const labels = { pause: "Pause intake", resume: "Resume intake", close: "Close intake" };
function IntakeHistoryList({ accountId, onFailure }: { accountId: string; onFailure: (failure: IntakeFailure) => void }) {
  const historyPanel = useRef<HTMLDetailsElement>(null);
  const [history, setHistory] = useState<IntakeHistory>({ items: [], nextOffset: null });
  const [busy, setBusy] = useState(true), [error, setError] = useState("");
  const request = useRef<AbortController | null>(null), active = useRef(true);
  const load = useCallback(async (offset = 0) => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller; setBusy(true);
    const result = await intakeHistory(accountId, offset, controller.signal);
    if (!active.current || controller.signal.aborted) return;
    request.current = null; setBusy(false);
    if (result.ok) { setError(""); setHistory(current => ({ ...result.data, items: offset ? [...current.items, ...result.data.items.filter(e => !current.items.some(old => old.id === e.id))] : result.data.items })); }
    else { if (historyPanel.current) historyPanel.current.open = true; setError(result.message); if (intakeAccessLost(result.code)) onFailure(result); }
  }, [accountId, onFailure]);
  useEffect(() => {
    active.current = true; const controller = new AbortController(); request.current = controller;
    void intakeHistory(accountId, 0, controller.signal).then(result => {
      if (!active.current || controller.signal.aborted) return;
      request.current = null; setBusy(false);
      if (result.ok) { setHistory(result.data); setError(""); }
      else { if (historyPanel.current) historyPanel.current.open = true; setError(result.message); if (intakeAccessLost(result.code)) onFailure(result); }
    });
    return () => { active.current = false; request.current?.abort(); };
  }, [accountId, onFailure]);
  return <details ref={historyPanel} className="workspace-disclosure" open={!!error || undefined}><summary>Private intake history</summary><section className="decision-history" aria-labelledby="intake-history-title">
    <h2 className="sr-only" id="intake-history-title">Private intake history</h2>
    <p>Reasons are visible only to administrators. History starts with changes made through these controls.</p>
    {error ? <Callout tone="error" title="Something needs attention" role="alert">{error} <button className="text-button" type="button" onClick={() => void load()}>Retry intake history</button></Callout> : !history.items.length ? <p>{busy ? "Loading intake history..." : "No intake changes have been recorded."}</p> : <ol className="staff-history-list">{history.items.map(event => <li key={event.id}>
      <div className="subheading"><strong>{labels[event.action]}</strong><time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time></div>
      <p>{event.previousState} to {event.state}. {event.actor.email}</p><p className="evaluation-note">Reason: {event.reason}</p><p className="muted">Intake revision {event.version}.</p>
    </li>)}</ol>}
    {!error && history.nextOffset !== null && <button type="button" className="button button-secondary" disabled={busy} onClick={() => void load(history.nextOffset!)}>{busy ? "Loading..." : "Load earlier intake changes"}</button>}
  </section></details>;
}

export function IntakeWorkspace({ accountId, initialState }: { accountId: string; initialState: IntakeState }) {
  const [state, dispatch] = useReducer(intakeEditorReducer, initialState, data => intakeEditorReducer(initialIntakeEditor, { type: "read", data }));
  const allowed = useVerifiedAccess();
  const readRequest = useRef<AbortController | null>(null), commandRequest = useRef<AbortController | null>(null), active = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const validation = useInlineValidation(() => {
    const errors: Record<string, string> = {};
    const data = state.base;
    if (!state.action || !data || !({ pause: data.canPause, resume: data.canResume, close: data.canClose })[state.action]) errors["intake-action"] = "Choose an available intake change.";
    if (!state.reason.trim()) errors["intake-reason"] = "Give a private reason for this change.";
    else if (evaluationTextLength(state.reason) > 500) errors["intake-reason"] = "Keep the private reason within 500 characters.";
    return errors;
  });
  const fail = useCallback((failure: IntakeFailure) => dispatch({ type: "failure", failure }), []);
  const load = useCallback(async (discard = false) => {
    if (commandRequest.current) return;
    readRequest.current?.abort(); const controller = new AbortController(); readRequest.current = controller;
    const result = await intakeState(accountId, controller.signal);
    if (!active.current || controller.signal.aborted) return;
    readRequest.current = null;
    if (result.ok) dispatch({ type: "read", data: result.data, discard }); else fail(result);
  }, [accountId, fail]);
  useEffect(() => {
    active.current = true; void load();
    const check = () => { if (document.visibilityState === "visible") void load(); };
    const timer = setInterval(check, 30000); window.addEventListener("focus", check); document.addEventListener("visibilitychange", check);
    return () => { active.current = false; clearInterval(timer); window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); readRequest.current?.abort(); commandRequest.current?.abort(); };
  }, [load]);
  useEffect(() => { if (!allowed) commandRequest.current?.abort(); }, [allowed]);
  useEffect(() => {
    if (!state.dirty && !state.pending) return;
    const before = (event: BeforeUnloadEvent) => event.preventDefault();
    const click = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]");
      if (!link || link.getAttribute("href")?.startsWith("#")) return;
      if (state.pending || !window.confirm("Leave and discard your unsaved intake choice and reason?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", before); document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", before); document.removeEventListener("click", click, true); };
  }, [state.dirty, state.pending]);
  const reload = () => {
    if (state.pending) void load();
    else if (!state.dirty || window.confirm("Discard your unsaved intake choice and reason and load the latest details?")) {
      dispatch({ type: "refresh" }); void load(true);
    }
  };
  async function send(request: IntakeCommand) {
    if (commandRequest.current || !allowed || !state.verified) return;
    readRequest.current?.abort(); const controller = new AbortController(); commandRequest.current = controller;
    dispatch({ type: "start", command: request });
    const result = await intakeCommand(accountId, request, controller.signal);
    if (!active.current) return;
    commandRequest.current = null;
    if (result.ok) { dispatch({ type: "saved", receipt: result.data }); requestAnimationFrame(() => heading.current?.focus({ preventScroll: true })); void load(); }
    else dispatch({ type: "failure", failure: result, command: true });
  }
  function prepare() {
    const data = state.base, action = state.action;
    if (!data || !allowed || !state.verified || state.pending || state.busy || state.conflict) return;
    if (!validation.check() || !action) return;
    dispatch({ type: "confirm", command: { action, expectedVersion: data.version, reason: state.reason.trim(), mutationId: crypto.randomUUID() } });
  }
  if (state.blocked) return <main id="main-content" className="container portal narrow"><PageHeading title="Intake access has changed" description={state.notice} /><Link href="/staff" className="button button-orange">Check staff access</Link></main>;
  const data = state.data, confirmation = state.confirmation, frozen = state.busy || !!state.pending || state.conflict;
  return <main id="main-content" className="container portal intake-workspace workspace-redesign workspace-intake" data-unsaved={state.dirty || !!state.pending}>
    <h1 className="sr-only">Recruitment intake</h1>
    <div className="workspace-reading">
    {state.notice && !confirmation && <Callout><p role="status">{state.notice}</p></Callout>}
    {!state.verified && <Callout tone="warning"><p role="alert">Intake details are hidden until administrator access can be verified.</p><button type="button" className="text-button" onClick={() => void load()}>Retry intake access</button></Callout>}
    <div hidden={!state.verified} inert={!state.verified || undefined}>
      {data && <section className="panel intake-panel" aria-labelledby="intake-heading">
        <h2 id="intake-heading" ref={heading} tabIndex={-1}>Submission availability</h2>
        <dl className="intake-details"><div><dt>Configured state</dt><dd>{data.state === "open" ? "Open" : data.state === "paused" ? "Paused" : "Closed"}</dd></div><div><dt>Accepting submissions</dt><dd>{data.accepting ? "Yes" : "No"}</dd></div><div><dt>Opens (Philippine time)</dt><dd>{formatDate(data.opensAt)}</dd></div><div><dt>Closes (Philippine time)</dt><dd>{formatDate(data.closesAt)}</dd></div></dl>
        <p>{intakeAvailability(data)}</p><details className="workspace-help"><summary>About intake controls</summary><p>Draft saving, evaluation, decisions, and withdrawal remain available. These controls do not change the dates. Resume respects the scheduled opening and deadline.</p></details>
        <button className="text-button" type="button" disabled={state.busy} onClick={reload}>Reload intake details</button>
        {data.state === "closed" && !state.dirty && !state.pending ? <Callout><p>Intake is finally closed. Reopening is unavailable in this app.</p></Callout> : <form {...validation.props} onSubmit={event => { event.preventDefault(); prepare(); }}>
          <fieldset className="application-fields" disabled={frozen}>
            <div className="field"><label htmlFor="intake-action">Intake change</label><select id="intake-action" {...validation.field("intake-action")} required value={state.action} onChange={event => dispatch({ type: "edit", field: "action", value: event.target.value })}><option value="">Choose a change</option>{(data.canPause || state.action === "pause") && <option value="pause">Pause intake</option>}{(data.canResume || state.action === "resume") && <option value="resume">Resume intake</option>}{data.canClose && <option value="close">Close intake permanently</option>}</select>{validation.errors["intake-action"] && <FieldError id="intake-action-error">{validation.errors["intake-action"]}</FieldError>}</div>
            <div className="field"><label htmlFor="intake-reason">Private reason (required)</label><textarea id="intake-reason" {...validation.field("intake-reason", "intake-reason-help")} rows={3} required value={state.reason} onChange={event => dispatch({ type: "edit", field: "reason", value: event.target.value })} /><p id="intake-reason-help" className="muted">Private to administrators. {evaluationTextLength(state.reason)} / 500 characters.</p>{validation.errors["intake-reason"] && <FieldError id="intake-reason-error">{validation.errors["intake-reason"]}</FieldError>}</div>
            <p>Closing is permanent; intake cannot be reopened in this app.</p><button className="button button-orange" type="submit">Review intake change</button>
          </fieldset>
        </form>}
        {state.dirty && !state.pending && <p role="status">Unsaved intake choice and reason</p>}
        {state.conflict && <Callout tone="error" title="Something needs attention" role="alert">Intake details changed. Your choice and reason are preserved. Reload before a new confirmation.</Callout>}
        <IntakeHistoryList key={data.version} accountId={accountId} onFailure={fail} />
      </section>}
    </div>
    </div>
    {confirmation && state.verified && allowed && <Modal title={labels[confirmation.action]} dismissible={!state.busy && !state.pending} onClose={() => dispatch({ type: "confirm", command: null })}><div className="modal-body" aria-busy={state.busy}>
      <p><strong>November 2026 recruitment</strong></p><p>{confirmation.action === "close" ? "Close intake permanently? Reopening will be unavailable in this app." : confirmation.action === "pause" ? "Pause new submissions? Applicants can keep saving their drafts." : "Resume intake? Submissions will be accepted only within the scheduled November window."}</p>
      <p className="evaluation-note">Reason: {confirmation.reason}</p><p>The opening and closing dates stay the same.</p>{state.notice && <Callout tone="error" title="Something needs attention" role="alert">{state.notice}</Callout>}
      <div className="modal-actions"><button type="button" className="button button-secondary" disabled={state.busy || !!state.pending} onClick={() => dispatch({ type: "confirm", command: null })}>Back</button><button type="button" className="button button-orange" disabled={state.busy || state.conflict && !state.pending} onClick={() => void send(state.pending ?? confirmation)}>{state.busy ? "Updating intake..." : state.pending ? "Retry same intake change" : "Confirm intake change"}</button>{(state.pending || state.conflict) && <button type="button" className="text-button" disabled={state.busy} onClick={reload}>Check latest intake</button>}</div>
    </div></Modal>}
  </main>;
}
