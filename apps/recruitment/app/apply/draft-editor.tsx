"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FocusEvent, type ReactNode } from "react";
import { ApplicationContent } from "@/app/components/application-content";
import { ProcessActionBar, ProcessProgress, ProcessShell } from "@/app/components/process-shell";
import { Callout, FieldError, Icon, formatDate } from "@/app/components/ui";
import { getOpportunity, isCoreEligible, opportunities, opportunityLabel, questionsFor, wordCount } from "@/lib/catalog";
import type { Profile, Track } from "@/lib/catalog";
import { editableDraft, upgradeDraft, isEvidenceUrl, validateDraft } from "@/lib/drafts";
import type { Applicant, Draft, DraftInput } from "@/lib/drafts";
import { DraftSaveQueue } from "@/lib/draft-save-queue";
import { applicationCommand, applicationState, saveApplicantDraft } from "@/lib/application-client";
import { intakeAvailability } from "@/lib/intake";
import { validateSubmission } from "@/lib/applications";
import type { ApplicationCommand, Intake } from "@/lib/applications";
import { blockedDestination, simplifiedStages } from "@/lib/application-progress";
import { StartDraft } from "./start-draft";
import { ApplyEntry } from "./apply-entry";
import { ApplicationIntroduction } from "@/app/components/application-introduction";
import { useOpportunityAvailability } from "@/app/components/use-opportunity-availability";
import { availabilityLabel } from "@/lib/opportunity-availability";
import { EnrollmentUpload } from "@/app/components/enrollment-upload";

const steps = ["About you", "Opportunity", "Your story", "Review & submit"];
const stepDescriptions = ["Your school & studies", "Find your place on the team", "Your ideas & role scenario", "Check and submit your application"];
const headings: Record<number, string> = { 1: "About you", 2: "Choose your opportunity", 3: "Your story", 5: "Review & submit" };
const validationStages: Record<string, number> = Object.fromEntries(([
  [1, ["fullName", "email", "university", "otherUniversity", "program", "programLevel", "year", "yearExplanation", "preferredName", "mobile", "campus", "enrolled"]],
  [2, ["track", "eligibility", "opportunityId"]],
  [3, ["resumeUrl", "portfolioUrl", "proofOfEnrollment", "availabilityDays", "motivation", "collaboration", "scenario", "scenarioReviewedOpportunityId"]],
  [5, ["accuracy", "updatesConsent"]],
] as const).flatMap(([step, fields]) => fields.map(field => [field, step])));

function Field({
  id,
  label,
  error,
  optional,
  children,
  hint,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {optional ? <span>(optional)</span> : <><span className="required-mark" aria-hidden="true">*</span></>}
      </label>
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {children}
      {error && (
        <FieldError id={`${id}-error`}>
          {error}
        </FieldError>
      )}
    </div>
  );
}

export function DraftEditor({ applicant, initialDraft, intake, requestedOpportunity, signOutFailed = false, practice = false }: { applicant: Applicant; initialDraft: Draft | null; intake: Intake; requestedOpportunity?: string; signOutFailed?: boolean; practice?: boolean }) {
  const [draft, setDraft] = useState(initialDraft);
  return draft ? <ApplicationWizard key={draft.id} applicant={applicant} initialDraft={draft} initialIntake={intake} requestedOpportunity={requestedOpportunity} signOutFailed={signOutFailed} practice={practice} /> : <StartDraft applicant={applicant} onCreated={setDraft} requestedOpportunity={requestedOpportunity} signOutFailed={signOutFailed} />;
}
function ApplicationWizard({ applicant, initialDraft, initialIntake, requestedOpportunity, signOutFailed, practice }: { applicant: Applicant; initialDraft: Draft; initialIntake: Intake; requestedOpportunity?: string; signOutFailed: boolean; practice: boolean }) {
  const router = useRouter();
  const vacancies = useOpportunityAvailability();
  const [queue] = useState(() => {
    const persist: typeof saveApplicantDraft = practice ? async ({ payload, expectedVersion }) => {
      const errors = validateDraft(payload);
      if (Object.keys(errors).length) return { ok: false, code: "VALIDATION", message: "Check the highlighted fields.", errors };
      return {
        ok: true,
        draft: { ...initialDraft, ...payload, profile: { ...payload.profile, email: applicant.email }, version: expectedVersion + 1 },
      };
    } : saveApplicantDraft;
    const value = new DraftSaveQueue(applicant.id, initialDraft, persist);
    if (initialDraft.formVersion !== 2) value.patch(upgradeDraft(initialDraft));
    return value;
  });
  const state = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  const app = state.draft;
  const [fieldErrors, setErrors] = useState<Record<string,string>>({});
  const [enrollmentReady, setEnrollmentReady] = useState(false);
  const errors = { ...fieldErrors, ...(state.error?.code === "VALIDATION" ? state.error.errors : undefined) };
  const genericErrorRef = useRef<HTMLParagraphElement>(null);
  const [stage, setStage] = useState(() => blockedDestination(editableDraft(upgradeDraft(initialDraft)), upgradeDraft(initialDraft).stage)?.stage ?? upgradeDraft(initialDraft).stage);
  const [scenarioReviewVisible, setScenarioReviewVisible] = useState(initialDraft.formVersion === 2 && initialDraft.scenarioReviewedOpportunityId !== initialDraft.opportunityId);
  const [dismissedOpportunity, setDismissedOpportunity] = useState<string>();
  const [intake, setIntake] = useState(initialIntake);
  const [frozen, setFrozen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{ kind: "error" | "uncertain"; message: string } | null>(null);
  const [intakeFeedback, setIntakeFeedback] = useState<{ kind: "status" | "error"; message: string } | null>(null);
  const [accessLost, setAccessLost] = useState(false);
  const [practiceFinished, setPracticeFinished] = useState(false);
  function patch(changes: Partial<DraftInput>) {
    if (practiceFinished) setPracticeFinished(false);
    queue.patch(changes);
  }
  const pendingSubmission = useRef<ApplicationCommand | null>(null);
  const working = useRef(false);
  const active = useRef(true);
  const submissionAbort = useRef<AbortController | null>(null);
  const latestRead = useRef(0);
  useEffect(() => { active.current = true; return () => { active.current = false; submissionAbort.current?.abort(); }; }, []);
  async function checkLatest(announceIntake = false) {
    const read = ++latestRead.current;
    setIntakeFeedback(null);
    if (!pendingSubmission.current) setSubmissionFeedback(null);
    const result = await applicationState(applicant.id);
    if (!active.current || read !== latestRead.current) return;
    if (result.ok) {
      setIntake(result.data.intake);
      if (result.data.application) { queue.freeze(); setFrozen(true); router.replace("/application"); router.refresh(); }
      else if (pendingSubmission.current) setSubmissionFeedback({ kind: "uncertain", message: "No receipt is available yet. An earlier submission may still complete. Retry the same submission." });
      else if (announceIntake) setIntakeFeedback({ kind: "status", message: "Intake details updated. Your draft is preserved." });
    } else {
      if (pendingSubmission.current) setSubmissionFeedback({ kind: "uncertain", message: result.message });
      else setIntakeFeedback({ kind: "error", message: result.message });
      if (["STAFF_ACCOUNT","DENIED","ACCOUNT_CHANGED","UNAUTHENTICATED"].includes(result.code)) setAccessLost(true);
    }
  }
  useEffect(() => {
    if (practice) return;
    const check = () => { if (document.visibilityState === "visible" && !working.current) void checkLatest(); };
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  });
  useEffect(() => { if (state.error?.code === "SUBMITTED") { router.replace("/application"); router.refresh(); } }, [state.error, router]);
  async function submit() {
    if (working.current) return;
    latestRead.current += 1;
    setIntakeFeedback(null);
    if (!pendingSubmission.current) {
      const validation = validateSubmission(editableDraft(queue.getSnapshot().draft));
      if (!enrollmentReady) validation.proofOfEnrollment = "Upload your proof of enrollment before submitting.";
      setErrors(validation);
      if (Object.keys(validation).length) { showValidation(validation); return; }
      if (practice) { setPracticeFinished(true); return; }
      queue.freeze(); setFrozen(true);
    }
    working.current = true; setSubmitting(true); setSubmissionFeedback(null);
    if (!pendingSubmission.current) {
      const saved = await queue.save();
      if (!active.current) return;
      if (!saved) { queue.unfreeze(); setFrozen(false); working.current = false; setSubmitting(false); focusSaveValidation(); return; }
      pendingSubmission.current = { action: "submit", accountId: applicant.id, expectedVersion: queue.getSnapshot().draft.version, mutationId: crypto.randomUUID() };
    }
    submissionAbort.current = new AbortController();
    const result = await applicationCommand(pendingSubmission.current, submissionAbort.current.signal);
    if (!active.current) return;
    working.current = false; setSubmitting(false);
    if (result.ok) { router.replace("/application"); router.refresh(); return; }
    setSubmissionFeedback({ kind: result.code === "UNAVAILABLE" ? "uncertain" : "error", message: result.message });
    if (["STAFF_ACCOUNT","DENIED","ACCOUNT_CHANGED","UNAUTHENTICATED"].includes(result.code)) setAccessLost(true);
    if (result.code !== "UNAVAILABLE") {
      pendingSubmission.current = null;
      queue.unfreeze(); setFrozen(false);
      if (result.code === "VALIDATION") { setSubmissionFeedback(null); showValidation(result.errors && Object.keys(result.errors).length ? result.errors : { form: result.message }); }
      else if (result.errors) showValidation(result.errors);
      if (result.code === "INTAKE_CLOSED") setIntake(current => ({ ...current, accepting: false }));
    }
  }
  async function saveExit() {
    if (exiting || frozen) return;
    setExiting(true);
    try {
      const saved = await queue.save();
      if (!active.current) return;
      if (saved) { router.push("/application"); router.refresh(); }
      else focusSaveValidation();
    } finally {
      if (active.current) setExiting(false);
    }
  }
  const stepRef = useRef<HTMLDivElement>(null);
  const opportunity = getOpportunity(app.opportunityId);
  const requested = getOpportunity(requestedOpportunity || "");
  const showRequested = requested && requested.id !== app.opportunityId
    && requested.id !== initialDraft.opportunityId && requested.id !== dismissedOpportunity;
  const questions = questionsFor(app.opportunityId, 2);
  useEffect(() => {
    if (state.phase !== "dirty") return;
    const timer = setTimeout(() => { void queue.save(); }, 900);
    return () => clearTimeout(timer);
  }, [queue, state]);
  useEffect(() => {
    if (practice || state.phase === "saved" && !frozen) return;
    const leaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const navigating = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (anchor && anchor.target !== "_blank" && !anchor.getAttribute("href")?.startsWith("#") && !window.confirm("Your latest changes have not been saved. Leave this page?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", leaving);
    document.addEventListener("click", navigating, true);
    return () => { window.removeEventListener("beforeunload", leaving); document.removeEventListener("click", navigating, true); };
  }, [state.phase, frozen, practice]);
  const profile = (key: keyof Profile, value: string | boolean | string[]) => {
    if (key === "email") return;
    patch({ profile: { ...app.profile, [key]: value } });
  };
  function changeResponse(id: (typeof questions)[number]["id"], value: string) {
    const answers = { ...app.answers, [id]: value };
    patch({ answers });
    if (fieldErrors[id] && !validateSubmission({ ...editableDraft(app), answers })[id]) {
      setErrors(previous => { const next = { ...previous }; delete next[id]; return next; });
    }
  }
  const blur = (key: string) => {
    const message = validateSubmission(editableDraft(app))[key];
    setErrors(previous => { const next = { ...previous }; if (message) next[key] = message; else delete next[key]; return next; });
  };
  const inputProps = (key: string) => ({ id: key, required: !["preferredName", "mobile", "campus", "portfolioUrl"].includes(key), "aria-required": !["preferredName", "mobile", "campus", "portfolioUrl"].includes(key), "data-validation-field": key, "aria-invalid": !!errors[key], "aria-describedby": [(["experience", "resumeUrl", "portfolioUrl"].includes(key) ? key + "-hint" : ""), errors[key] ? key + "-error" : ""].filter(Boolean).join(" ") || undefined, onBlur: (event: FocusEvent<HTMLElement>) => {
    // Navigation validates on activation; avoid moving its target during pointerdown.
    if (event.relatedTarget instanceof Element && event.relatedTarget.closest(".process-action-bar,.process-track,.process-day-picker")) return;
    blur(key);
  } });
  const hasControl = (key: string) => Object.hasOwn(validationStages, key)
    && (key !== "otherUniversity" || app.profile.university === "Other")
    && (key !== "yearExplanation" || app.profile.year === "other")
    && (key !== "scenarioReviewedOpportunityId" || !!app.opportunityId);
  const genericError = Object.entries(errors).find(([key]) => !hasControl(key))?.[1]
    ?? (state.error?.code === "VALIDATION" && !Object.keys(state.error.errors ?? {}).length ? state.error.message : "");
  function showValidation(validation: Record<string, string>) {
    const firstStage = simplifiedStages.find(step => Object.keys(validation).some(key => hasControl(key) && validationStages[key] === step));
    setStage(firstStage ?? stage); setErrors(validation);
    requestAnimationFrame(() => {
      const target = Array.from(stepRef.current?.querySelectorAll<HTMLElement>("[data-validation-field]") ?? [])
        .find(node => node.dataset.validationField?.split(" ").some(key => !!validation[key]));
      if (target) {
        const disclosure = target.closest("details");
        if (disclosure) disclosure.open = true;
        target.focus();
      } else genericErrorRef.current?.focus();
    });
  }
  function focusSaveValidation() {
    const error = queue.getSnapshot().error;
    if (error?.code === "VALIDATION") showValidation(error.errors && Object.keys(error.errors).length ? error.errors : { form: error.message });
  }
  async function retrySave() {
    if (!await queue.save() && active.current) focusSaveValidation();
  }
  function showBlocked(blocked: NonNullable<ReturnType<typeof blockedDestination>>) {
    showValidation(blocked.errors);
  }
  function goStage(next: number) {
    if (frozen) return;
    const blocked = next > stage ? blockedDestination(editableDraft(app), next) : null;
    if (blocked) { showBlocked(blocked); return; }
    if (next === 5 && stage === 3 && !enrollmentReady) { showValidation({ proofOfEnrollment: "Upload your current proof of enrollment before continuing." }); return; }
    setStage(next); patch({ stage: next }); setErrors({}); window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => stepRef.current?.querySelector<HTMLElement>(".process-step-heading")?.focus({ preventScroll: true }));
  }
  function setPath(track: Track, id = "") {
    if (frozen || exiting || (app.track === track && app.opportunityId === id)) return;
    if (requested) setDismissedOpportunity(requested.id);
    if (app.opportunityId || app.answers.scenario.trim()) setScenarioReviewVisible(true);
    patch({ track, opportunityId: id, scenarioReviewedOpportunityId: !app.opportunityId && !app.answers.scenario.trim() ? id : "" }); setErrors({});
  }
  function resolveRequested(useRequested: boolean) {
    if (!requested || frozen || exiting) return;
    if (useRequested) {
      setPath(requested.track, requested.id);
      if (stage > 2) { goStage(2); return; }
    } else {
      setDismissedOpportunity(requested.id);
    }
    requestAnimationFrame(() => stepRef.current?.querySelector<HTMLElement>(".process-step-heading")?.focus({ preventScroll: true }));
  }
  function next() { goStage(simplifiedStages[simplifiedStages.indexOf(stage) + 1]); }
  const saveStatus = state.phase === "saved"
    ? app.savedAt ? `Saved at ${formatDate(app.savedAt, true)}` : "All changes saved"
    : state.phase === "saving"
      ? "Saving…"
      : state.phase === "error"
        ? "Not saved — your input is still here"
        : "Unsaved changes";
  if (state.error?.code === "STAFF_ACCOUNT") return <ApplyEntry><div className="apply-entry-main"><p className="apply-kicker">Account access</p><h1>This account has staff access</h1><p className="apply-lead">Applicant access has been cleared. Use Staff sign-in, or a separate Google account to apply. Your earlier saved draft remains stored.</p><Link href="/staff" className="button button-orange">Check staff access</Link></div></ApplyEntry>;
  if (accessLost) return <ApplyEntry><div className="apply-entry-main"><p className="apply-kicker">Account access</p><h1>Check your applicant access</h1><p className="apply-lead">{submissionFeedback?.message ?? intakeFeedback?.message}</p><Link href="/application" className="button button-orange">Check account</Link></div></ApplyEntry>;
  const submissionNotice = <>
    {genericError && <div className="process-recovery"><p className="field-error" ref={genericErrorRef} tabIndex={-1} role="alert">{genericError}</p>{!frozen && <button type="button" className="text-button" onClick={() => { if (window.confirm("Reload the saved draft and discard any unsaved edits?")) window.location.reload(); }}>Reload saved draft</button>}</div>}
    {state.error && <div className="process-recovery">{state.error.code !== "VALIDATION" && <p role="alert">{state.error.message}</p>}<div className="inline-actions"><button type="button" className="text-button" onClick={() => void retrySave()}>Retry save</button>{state.error.code === "UNAUTHENTICATED" && <Link href="/apply" target="_blank" rel="noopener noreferrer">Sign in in another tab</Link>}{state.error.code === "CONFLICT" && <button type="button" className="text-button" onClick={() => { if (window.confirm("Reload the saved draft and discard these unsaved edits?")) window.location.reload(); }}>Reload saved draft</button>}</div></div>}
    {submissionFeedback && <div className="process-recovery">{(!genericError || submissionFeedback.kind === "uncertain") && <p role="alert">{submissionFeedback.message}</p>}<div className="inline-actions">{submissionFeedback.kind === "uncertain" && <button type="button" className="button button-orange" disabled={submitting} onClick={() => void submit()}>Retry same submission</button>}<button type="button" className="text-button" disabled={submitting} onClick={() => void checkLatest()}>Check latest details</button>{!frozen && !genericError && <button type="button" className="text-button" onClick={() => { if (window.confirm("Reload the saved draft and discard any unsaved edits?")) window.location.reload(); }}>Reload saved draft</button>}</div></div>}
    {intakeFeedback?.kind === "error" && <div className="process-recovery"><p role="alert">{intakeFeedback.message}</p><button type="button" className="text-button" disabled={submitting} onClick={() => void checkLatest()}>Retry intake refresh</button></div>}
  </>;
  return (
    <ProcessShell surface="paper" unsaved={!practice && (state.phase !== "saved" || frozen)}>
      <main id="main-content" className="apply-page application-workbench-page">
        <div className="process-card application-workbench" ref={stepRef}>
          <header className="application-workbench-header"><ApplicationIntroduction compact /><span className="application-workbench-label">Recruitment / Draft</span></header>
          <aside className="application-sidebar" aria-label="Application steps and account">
            <div className="application-sidebar-title"><Icon name="sparkles" size={20} /><div><strong>Build with Alpha</strong><span>Your next chapter starts here.</span></div></div>
            <ProcessProgress steps={steps} descriptions={stepDescriptions} current={simplifiedStages.indexOf(stage)} onStep={index => goStage(simplifiedStages[index])} disabled={frozen || exiting} />
            <p className="application-sidebar-note">Take it one step at a time. You can save your draft and return later.</p>
            <div className="application-applicant"><span className="application-applicant-initial" aria-hidden="true">{(applicant.name || app.profile.fullName || "A").slice(0, 1).toUpperCase()}</span><div><strong>{applicant.name || app.profile.fullName || "Your account"}</strong><span>{applicant.email}</span></div></div>
          </aside>
          <div className="application-workbench-content">
          {practice && <Callout title="Practice application"><p>Use sample details as you try the form. Your answers stay on this page and are never submitted to Alpha.</p></Callout>}
          {signOutFailed && <Callout tone="warning"><p role="alert">Sign-out could not be confirmed. Please retry using Sign out in the navigation.</p></Callout>}
          <div className="process-step-heading" tabIndex={-1} key={stage}>
            <h2>{headings[stage]}</h2>
          </div>
          {showRequested && <Callout title="Keep or change your opportunity">
            <p>Your draft is for <strong>{opportunity ? opportunityLabel(opportunity) : "an opportunity you haven’t chosen yet"}</strong>. You opened <strong>{opportunityLabel(requested)}</strong>.</p>
            <div className="inline-actions">
              <button type="button" className="text-button" disabled={frozen || exiting} onClick={() => resolveRequested(true)}>Use this opportunity</button>
              <button type="button" className="text-button" disabled={frozen || exiting} onClick={() => resolveRequested(false)}>Keep my draft</button>
            </div>
          </Callout>}
          <form id="application-draft-form" noValidate onSubmit={(event) => { event.preventDefault(); if (stage === 5) void submit(); else next(); }}>
            <fieldset className="application-fields" disabled={frozen}>
              {stage === 1 && (
                <div className="process-form-section">
                  <div className="process-fields">
                    <Field id="fullName" label="Full name" error={errors.fullName}>
                      <input {...inputProps("fullName")} value={app.profile.fullName} onChange={(event) => profile("fullName", event.target.value)} maxLength={120} autoComplete="name" placeholder="Alex Rivera" />
                    </Field>
                    <Field id="email" label="Email address" error={errors.email}>
                      <input {...inputProps("email")} value={app.profile.email} type="email" readOnly />
                    </Field>
                  </div>
                  <div className="process-group">

                    <div className="process-fields">
                      <Field id="university" label="School / College / University" error={errors.university || errors.otherUniversity}>
                        <input {...inputProps("university")} data-validation-field="university otherUniversity" aria-invalid={!!(errors.university || errors.otherUniversity)} aria-describedby={errors.university || errors.otherUniversity ? "university-error" : undefined} maxLength={160} list="school-suggestions" value={app.profile.university === "Other" ? app.profile.otherUniversity : app.profile.university} onChange={event => patch({ profile: { ...app.profile, university: event.target.value, otherUniversity: "" } })} placeholder="Enter your institution" />
                        <datalist id="school-suggestions"><option value="Rizal Technological University" /><option value="Polytechnic University of the Philippines" /><option value="University of the Philippines" /></datalist>
                      </Field>
                      <Field id="program" label="Degree / program" error={errors.program}>
                        <input {...inputProps("program")} maxLength={160} value={app.profile.program} onChange={(event) => profile("program", event.target.value)} placeholder="e.g. BS Information Technology" />
                      </Field>
                      <div className="process-field-pair">
                        <Field id="programLevel" label="Program level" error={errors.programLevel}>
                          <select {...inputProps("programLevel")} value={app.profile.programLevel} onChange={(event) => profile("programLevel", event.target.value)}>
                            <option value="">Select program level</option>
                            <option value="undergraduate">Undergraduate</option>
                            <option value="postgraduate">Postgraduate</option>
                            <option value="other">Other university program</option>
                          </select>
                        </Field>
                        <Field id="year" label="Current academic year" error={errors.year}>
                          <select {...inputProps("year")} value={app.profile.year} onChange={(event) => profile("year", event.target.value)}>
                            <option value="">Select current year</option>
                            {[["1","1st Year"],["2","2nd Year"],["3","3rd Year"],["4","4th Year"],["5","5th Year or later"]].map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                            {app.profile.year === "6+" && <option value="6+">5th Year or later (saved)</option>}
                            <option value="other">Other academic standing</option>
                          </select>
                        </Field>
                      </div>
                      {app.profile.year === "other" && <Field id="yearExplanation" label="Academic standing" error={errors.yearExplanation}>
                        <input {...inputProps("yearExplanation")} maxLength={160} value={app.profile.yearExplanation} onChange={(event) => profile("yearExplanation", event.target.value)} />
                      </Field>}
                    </div>
                  </div>
                  <section className="process-optional">
                    <h3 className="process-group-title">Optional details</h3>
                    <div className="process-fields process-optional-fields">
                      <Field id="preferredName" label="Preferred name" optional error={errors.preferredName}>
                        <input {...inputProps("preferredName")} value={app.profile.preferredName} onChange={(event) => profile("preferredName", event.target.value)} maxLength={60} placeholder="What should we call you?" />
                      </Field>
                      <Field id="mobile" label="Mobile number" optional error={errors.mobile}>
                        <input {...inputProps("mobile")} value={app.profile.mobile} onChange={(event) => profile("mobile", event.target.value)} type="tel" autoComplete="tel" placeholder="+63 …" />
                      </Field>
                      <Field id="campus" label="Campus" optional error={errors.campus}>
                        <input {...inputProps("campus")} value={app.profile.campus} maxLength={120} onChange={(event) => profile("campus", event.target.value)} placeholder="Your campus" />
                      </Field>
                    </div>
                  </section>
                  <label className="checkbox-row">
                    <input id="enrolled" aria-required="true" data-validation-field="enrolled" aria-invalid={!!errors.enrolled} type="checkbox" checked={app.profile.enrolled} onChange={(event) => profile("enrolled", event.target.checked)} aria-describedby={errors.enrolled ? "enrolled-error" : undefined} />
                    <span>I certify that I am currently enrolled at a school, college, or university and will provide my current registration form or official enrollment certificate. <span className="required-mark" aria-hidden="true">*</span></span>
                  </label>
                  {errors.enrolled && <FieldError id="enrolled-error">{errors.enrolled}</FieldError>}
                  {app.track === "CORE_TEAM" && app.profile.enrolled && app.profile.year && app.profile.programLevel && !isCoreEligible(app.profile) && (
                    <div className="process-eligibility">
                      <p className="field-hint">Core Team is for current first- and second-year undergraduates. Committee welcomes all enrolled university year levels.</p><button className="text-button" type="button" onClick={() => { setPath("COMMITTEE"); }}>Switch to Committee and keep my details<Icon name="arrow" size={15} /></button>
                    </div>
                  )}
                </div>
              )}
              {stage === 2 && (
                <div className="process-form-section">
                  <fieldset className="process-choices" id="track" data-validation-field="track eligibility" tabIndex={-1} aria-invalid={!!(errors.track || errors.eligibility)} aria-describedby={[errors.track ? "track-error" : "", errors.eligibility ? "eligibility-error" : ""].filter(Boolean).join(" ") || undefined}>
                    <legend className="process-legend">Track <span className="required-mark" aria-hidden="true">*</span></legend>
                    {(["CORE_TEAM", "COMMITTEE", "MEMBER"] as const).map((track) => (
                      <label key={track} className={`process-choice${app.track === track ? " selected" : ""}`}>
                        <input type="radio" required name="track" aria-label={track === "CORE_TEAM" ? "Core Team" : track === "MEMBER" ? "Member" : "Committee"} aria-describedby={`${track}-eligibility`} checked={app.track === track} onChange={() => setPath(track)} />
                        <span className="process-radio" aria-hidden="true" />
                        <span className="process-choice-body"><strong>{track === "CORE_TEAM" ? "Core Team" : track === "MEMBER" ? "Member" : "Committee"}</strong><small id={`${track}-eligibility`}>{track === "CORE_TEAM" ? "1st & 2nd year undergraduates" : "All enrolled students"}</small></span>
                      </label>
                    ))}
                  </fieldset>
                  {errors.track && <FieldError id="track-error">{errors.track}</FieldError>}
                  {(errors.eligibility || app.track === "CORE_TEAM" && !isCoreEligible(app.profile)) && (
                    <div className="process-eligibility">{errors.eligibility ? <FieldError id="eligibility-error">{errors.eligibility}</FieldError> : <p className="field-hint">Your academic details do not meet Core Team eligibility. Select Committee to continue.</p>}<button className="text-button" type="button" onClick={() => setPath("COMMITTEE")}>Switch to Committee and keep my details<Icon name="arrow" size={15} /></button></div>
                  )}
                  <fieldset className="apply-opportunities" id="opportunityId" data-validation-field="opportunityId" tabIndex={-1} aria-invalid={!!errors.opportunityId} aria-describedby={errors.opportunityId ? "opportunityId-error" : undefined}>
                    <legend className="process-legend">{app.track === "CORE_TEAM" ? "Core Team role" : app.track === "MEMBER" ? "General membership" : "Committee opportunity"} <span className="required-mark" aria-hidden="true">*</span></legend>

                    <div className="process-opportunity-groups">
                      {[...new Set(opportunities.filter(choice => choice.track === app.track).map(choice => choice.department))].map(department => <section className="process-opportunity-group" key={department} aria-label={department}>
                        <h3>{department}</h3>
                        {opportunities.filter(choice => choice.track === app.track && choice.department === department).map(choice => {
                          const selected = app.opportunityId === choice.id;
                          return <div className={`process-opportunity${selected ? " selected" : ""}`} key={choice.id}>
                            <label>
                              <input type="radio" required name="opportunity" aria-label={opportunityLabel(choice)} aria-describedby={selected ? `${choice.id}-description${choice.id === "buildher" ? " buildher-eligibility" : ""}` : undefined} value={choice.id} checked={selected} onChange={() => setPath(app.track, choice.id)} />
                              <span className="process-radio" aria-hidden="true" />
                              <span className="process-opportunity-body"><strong>{choice.specialization || choice.title}</strong><small>{availabilityLabel(vacancies, choice.id)}</small>{selected && <small className="process-selected-badge">Selected</small>}</span>
                              <Icon name={choice.icon} size={20} />
                            </label>
                            {selected && <div className="process-opportunity-detail" id={`${choice.id}-description`}>
                              <p>{choice.description}</p>
                              <div className="process-scenario"><span>Scenario</span><p>{choice.scenario}</p></div>
                              {choice.id === "buildher" && <small id="buildher-eligibility">Open to all eligible applicants</small>}
                            </div>}
                          </div>;
                        })}
                      </section>)}
                    </div>
                  </fieldset>
                  {errors.opportunityId && <FieldError id="opportunityId-error">{errors.opportunityId}</FieldError>}
                </div>
              )}
              {stage === 3 && (
                <div className="process-form-section">
                  {initialDraft.formVersion !== 2 && <Callout>We simplified the application to three short responses. Your saved text is preserved. Review the updated motivation and contribution prompt, and shorten any response above 150 words before continuing.</Callout>}
                  {opportunity && <div className="process-story-guide">
                    <p className="process-context-line"><Icon name={opportunity.icon} size={16} /><span>Writing for <strong>{opportunityLabel(opportunity)}</strong></span></p>
                    <a href="#scenario-prompt" className="text-button">Go to the role scenario <Icon name="arrow" size={16} /></a>
                  </div>}
                  <section className="process-review-links" aria-labelledby="process-links-title">
                    <h3 className="process-group-title" id="process-links-title">Resume & portfolio</h3>
                    <p className="field-hint">A resume is required before you submit. You can save a draft without it.</p>
                    <Field id="resumeUrl" label="Resume link (required)" error={errors.resumeUrl} hint="View-only HTTPS link. It must open without signing in."><input {...inputProps("resumeUrl")} required aria-required="true" type="url" maxLength={2048} value={app.resumeUrl} onChange={event => patch({ resumeUrl: event.target.value })} placeholder="https://drive.google.com/file/d/…/view" /></Field>
                    <details className="process-resume-help"><summary>How to share your resume</summary><p>For Google Drive, choose Share → General access → Anyone with the link → Viewer. Test it in a private browser window and keep it accessible throughout recruitment. We store the URL without checking document access.</p></details>
                    {app.resumeUrl && isEvidenceUrl(app.resumeUrl) && <a className="text-button" href={app.resumeUrl} target="_blank" rel="noopener noreferrer">Open resume link<Icon name="external" size={16} /></a>}
                    <EnrollmentUpload accountId={applicant.id} disabled={frozen || exiting} error={errors.proofOfEnrollment} onReady={setEnrollmentReady} practice={practice} />
                    <Field id="portfolioUrl" label="Portfolio link" optional error={errors.portfolioUrl} hint="HTTPS link, if you have one.">
                      <input {...inputProps("portfolioUrl")} type="url" maxLength={2048} value={app.portfolioUrl} onChange={(event) => patch({ portfolioUrl: event.target.value })} placeholder="https://your-portfolio.example" />
                    </Field>
                  </section>
                  <fieldset className="process-days" id="availabilityDays" data-validation-field="availabilityDays" tabIndex={-1} aria-describedby={`availabilityDays-hint${errors.availabilityDays ? " availabilityDays-error" : ""}`} aria-invalid={!!errors.availabilityDays}>
                    <legend>When are you usually available? <span className="required-mark" aria-hidden="true">*</span></legend>
                    <p className="field-hint" id="availabilityDays-hint">Select your recurring available days in this weekly calendar. No Google Calendar connection is needed.</p>
                    <div className="process-day-picker weekly-calendar" role="group" aria-label="Weekly availability">{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => <label key={day}><input type="checkbox" aria-label={day} checked={app.profile.availability.includes(day)} onChange={event => profile("availability", event.target.checked ? [...app.profile.availability, day] : app.profile.availability.filter(value => value !== day))} /><span><strong>{day.slice(0, 3)}</strong><small>{app.profile.availability.includes(day) ? "Available" : "Select day"}</small></span></label>)}</div>
                    {errors.availabilityDays && <FieldError id="availabilityDays-error">{errors.availabilityDays}</FieldError>}
                  </fieldset>
                  <p className="field-hint" id="story-instructions">All three responses are required. Use your own words and keep each answer to 150 words or fewer.</p>
                  {questions.map((question, index) => <section className={`process-response${question.id === "scenario" ? " process-response-scenario" : ""}`} key={question.id}>
                    <h3 className="process-response-heading" id={question.id === "scenario" ? "scenario-prompt" : undefined} tabIndex={question.id === "scenario" ? -1 : undefined}>
                      <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{question.id === "scenario" ? "Role scenario" : question.label}
                    </h3>
                    {question.id === "scenario" && <p className="field-hint process-scenario-help" id="scenario-help">Use your own words. Explain what you would do first, why you would do it that way, and how you would tell if it worked.</p>}
                    <Field id={question.id} label={question.prompt} error={errors[question.id]}>
                      <textarea {...inputProps(question.id)} aria-describedby={`story-instructions ${question.id}-count${question.id === "scenario" ? " scenario-help" : ""}${errors[question.id] ? ` ${question.id}-error` : ""}`} rows={5} value={app.answers[question.id]} onChange={event => changeResponse(question.id, event.target.value)} />
                      <span className={`word-count process-word-count ${wordCount(app.answers[question.id]) > 150 ? "over-limit" : ""}`} id={`${question.id}-count`}>{wordCount(app.answers[question.id])} / 150 words</span>
                    </Field>
                    {question.id === "scenario" && (scenarioReviewVisible || app.scenarioReviewedOpportunityId !== app.opportunityId || errors.scenarioReviewedOpportunityId) && app.opportunityId && <label className="checkbox-row"><input id="scenarioReviewedOpportunityId" data-validation-field="scenarioReviewedOpportunityId" aria-invalid={!!errors.scenarioReviewedOpportunityId} type="checkbox" checked={app.scenarioReviewedOpportunityId === app.opportunityId} aria-describedby={errors.scenarioReviewedOpportunityId ? "scenarioReviewedOpportunityId-error" : undefined} onChange={event => patch({ scenarioReviewedOpportunityId: event.target.checked ? app.opportunityId : "" })} /><span className="required-label">I reviewed my scenario response for {opportunityLabel(opportunity)}.</span></label>}
                    {question.id === "scenario" && errors.scenarioReviewedOpportunityId && <FieldError id="scenarioReviewedOpportunityId-error">{errors.scenarioReviewedOpportunityId}</FieldError>}
                  </section>)}
                  {(app.profile.experience || app.answers.availability || app.answers.pathway) && <details className="process-previous"><summary>Previous draft answers</summary><p>These earlier answers are saved for copying. They are not included in your new submission. Your retained responses may need shortening to 150 words.</p>{[["Experience & interests", app.profile.experience], ["Time commitment", app.answers.availability], ["Your contribution", app.answers.pathway]].map(([label, text]) => text && <div className="response-block" key={label}><h3>{label}</h3><p>{text}</p></div>)}</details>}
                </div>
              )}
              {stage === 5 && (
                <div className="process-form-section">
                  {!practice && (intake.accepting ? <div className="process-intake-availability"><p>Intake is open · 1–30 November 2026, Philippine time.</p><button type="button" className="text-button" disabled={submitting} onClick={() => void checkLatest(true)}>Refresh intake availability</button></div> : <Callout tone="warning">{intakeAvailability(intake)}<button type="button" className="text-button" disabled={submitting} onClick={() => void checkLatest(true)}>Refresh intake availability</button></Callout>)}
                  {intakeFeedback?.kind === "status" && <p className="process-intake-status" role="status">{intakeFeedback.message}</p>}
                  <section className="process-evidence-summary"><h3>Supporting evidence</h3><p>Resume: {app.resumeUrl ? <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer">Open saved link</a> : "Not provided"}</p>{app.portfolioUrl && <p>Portfolio: <a href={app.portfolioUrl} target="_blank" rel="noopener noreferrer">Open saved link</a></p>}<EnrollmentUpload readOnly accountId={applicant.id} disabled error={errors.proofOfEnrollment} onReady={setEnrollmentReady} practice={practice} /><button className="text-button" type="button" disabled={frozen} onClick={() => goStage(3)}>Edit supporting evidence</button></section>
                  <ApplicationContent application={app} onEdit={next => goStage(next === 4 ? 5 : next)} excludeEvidence />
                  <div className="process-declarations">
                    <h3 className="process-group-title">Before you submit</h3>
                    <p>{practice ? "Use a sample HTTPS resume link to test the review step." : "One application per cycle. Submitted answers and links lock; withdrawal is final and does not allow reapplication."}</p>
                    <div className="declarations">
                      <label className="checkbox-row">
                        <input id="accuracy" aria-required="true" data-validation-field="accuracy" aria-invalid={!!errors.accuracy} type="checkbox" checked={app.accuracy} onChange={(event) => patch({ accuracy: event.target.checked })} aria-describedby={errors.accuracy ? "accuracy-error" : undefined} />
                        <span>I confirm that the information in my application is accurate to the best of my knowledge, and that my uploaded enrollment document is my own and covers the current academic term. <span className="required-mark" aria-hidden="true">*</span></span>
                      </label>
                      {errors.accuracy && <FieldError id="accuracy-error">{errors.accuracy}</FieldError>}
                      <label className="checkbox-row">
                        <input id="updatesConsent" data-validation-field="updatesConsent" aria-invalid={!!errors.updatesConsent} aria-describedby={errors.updatesConsent ? "updatesConsent-error" : undefined} type="checkbox" checked={app.updatesConsent} onChange={(event) => patch({ updatesConsent: event.target.checked })} />
                        <span>Keep me informed about future community updates. <span className="muted">Optional. This does not affect your application.</span></span>
                      </label>
                      {errors.updatesConsent && <FieldError id="updatesConsent-error">{errors.updatesConsent}</FieldError>}
                    </div>
                  </div>
                </div>
              )}
            </fieldset>
          </form>
          <ProcessActionBar status={practice ? "Practice answers are temporary" : <><span className={`process-save-dot ${state.phase}`} aria-hidden="true" />{saveStatus}</>} notice={practiceFinished ? <Callout tone="success" title="Practice complete"><p role="status">Your answers passed validation. No application was sent.</p></Callout> : submissionNotice}>
            <button className="button button-secondary" type="button" disabled={frozen || stage === 1} onClick={() => goStage(simplifiedStages[simplifiedStages.indexOf(stage) - 1])}>Back</button>
            <button className="button button-orange" type="submit" form="application-draft-form" disabled={frozen || exiting || stage === 5 && !intake.accepting}>
              {stage === 5 ? practice ? "Submit test application" : submitting ? "Submitting…" : "Submit application" : "Continue"}
              <Icon name="arrow" size={17} />
            </button>
            {practice ? <Link className="process-text-action" href="/#opportunities">Browse roles</Link> : <button className="process-text-action" type="button" disabled={exiting || frozen} onClick={() => void saveExit()}>{exiting ? "Saving…" : "Save & exit"}</button>}
          </ProcessActionBar>
          </div>
        </div>
      </main>
    </ProcessShell>
  );
}
