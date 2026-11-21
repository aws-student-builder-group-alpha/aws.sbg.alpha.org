"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FocusEvent, type ReactNode } from "react";
import { ApplicationContent } from "@/app/(recruitment)/recruitment/components/application-content";
import { ProcessActionBar, ProcessProgress, ProcessShell } from "@/app/(recruitment)/recruitment/components/process-shell";
import { Callout, FieldError, Icon, formatDate } from "@/app/(recruitment)/recruitment/components/ui";
import { getOpportunity, isCoreEligible, opportunities, opportunityLabel, questionsFor, wordCount } from "@/recruitment/lib/catalog";
import type { AvailabilityRange, Opportunity, Profile, Track } from "@/recruitment/lib/catalog";
import { availabilitySubmissionError, editableDraft, emptyAvailabilityRange, upgradeDraft, isEvidenceUrl, validateDraft } from "@/recruitment/lib/drafts";
import type { Applicant, Draft, DraftInput } from "@/recruitment/lib/drafts";
import { DraftSaveQueue } from "@/recruitment/lib/draft-save-queue";
import { applicationCommand, applicationState, saveApplicantDraft } from "@/recruitment/lib/application-client";
import { intakeAvailability } from "@/recruitment/lib/intake";
import { applicationsIn, validateSubmission } from "@/recruitment/lib/applications";
import type { ApplicationCommand, Intake } from "@/recruitment/lib/applications";
import { blockedDestination, simplifiedStages } from "@/recruitment/lib/application-progress";
import { StartDraft } from "./start-draft";
import { ApplyEntry } from "./apply-entry";
import { useOpportunityAvailability } from "@/app/(recruitment)/recruitment/components/use-opportunity-availability";
import { availabilityLabel } from "@/recruitment/lib/opportunity-availability";
import { EnrollmentUpload } from "@/app/(recruitment)/recruitment/components/enrollment-upload";
import { AvailabilitySelector } from "@/app/(recruitment)/recruitment/components/availability-selector";

const steps = ["About you", "Opportunity", "Your story", "Review"];
const headings: Record<number, string> = { 1: "About you", 2: "Choose your opportunity", 3: "Your story", 5: "Review & submit" };
const stepGuidance: Record<number, string> = {
  1: "Start with your contact and academic details.",
  2: "Find a role that fits your interests and eligibility.",
  3: "Share your responses, supporting documents and availability.",
  5: "Check your details and answers before submitting.",
};
const validationStages: Record<string, number> = Object.fromEntries(([
  [1, ["fullName", "email", "university", "otherUniversity", "program", "programLevel", "year", "yearExplanation", "preferredName", "mobile", "enrolled"]],
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
  label: ReactNode;
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

export function DraftEditor({ applicant, initialDraft, intake, requestedOpportunity, signOutFailed = false, practice = false, previousDraft, appliedRoles = [] }: { applicant: Applicant; initialDraft: Draft | null; intake: Intake; requestedOpportunity?: string; signOutFailed?: boolean; practice?: boolean; previousDraft?: Draft | null; appliedRoles?: string[] }) {
  const [draft, setDraft] = useState(initialDraft);
  return draft ? <ApplicationWizard key={draft.id} applicant={applicant} initialDraft={draft} appliedRoles={appliedRoles} initialIntake={intake} requestedOpportunity={requestedOpportunity} signOutFailed={signOutFailed} practice={practice} /> : <StartDraft applicant={applicant} previousDraft={previousDraft} onCreated={setDraft} requestedOpportunity={requestedOpportunity} signOutFailed={signOutFailed} />;
}
function ApplicationWizard({ applicant, initialDraft, initialIntake, requestedOpportunity, signOutFailed, practice, appliedRoles }: { applicant: Applicant; initialDraft: Draft; initialIntake: Intake; requestedOpportunity?: string; signOutFailed: boolean; practice: boolean; appliedRoles: string[] }) {
  const router = useRouter();
  const vacancies = useOpportunityAvailability() ?? null;
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
      const submitted = applicationsIn(result.data).find(item => item.sourceDraftVersion === (pendingSubmission.current?.expectedVersion ?? queue.getSnapshot().draft.version))
        ?? (result.data.applications === undefined ? result.data.application : null);
      if (submitted) { queue.freeze(); setFrozen(true); router.replace("/recruitment/application?application=" + submitted.id); router.refresh(); }
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
  useEffect(() => { if (state.error?.code === "SUBMITTED") { router.replace("/recruitment/application"); router.refresh(); } }, [state.error, router]);
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
    if (result.ok) { router.replace("/recruitment/application?application=" + result.data.id); router.refresh(); return; }
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
      if (saved) { router.push("/recruitment/application"); router.refresh(); }
      else focusSaveValidation();
    } finally {
      if (active.current) setExiting(false);
    }
  }
  const stepRef = useRef<HTMLDivElement>(null);
  const opportunity = getOpportunity(app.opportunityId);
  const optionGroups = new Map<string, Opportunity[]>();
  if (stage === 2) {
    for (const choice of opportunities.filter(role => role.track === app.track)) {
      const group = choice.track === "CORE_TEAM" ? choice.department
        : choice.specialization ? "Skill Builders"
        : choice.id === "buildher" ? "BuildHer+"
        : "Committees";
      const groupOptions = optionGroups.get(group) ?? [];
      groupOptions.push(choice);
      optionGroups.set(group, groupOptions);
    }
  }
  const requested = getOpportunity(requestedOpportunity || "");
  const showRequested = requested && requested.id !== app.opportunityId
    && requested.id !== initialDraft.opportunityId && requested.id !== dismissedOpportunity;
  const questions = questionsFor(app.opportunityId, 2);
  const completedResponses = questions.filter(question => {
    const count = wordCount(app.answers[question.id]);
    return count > 0 && count <= question.max;
  }).length;
  const savedAvailability = app.profile.availability;
  const legacyWeekdays = Array.isArray(savedAvailability) ? savedAvailability : [];
  const availabilityRange = Array.isArray(savedAvailability) ? emptyAvailabilityRange : savedAvailability;
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
  const profile = (key: keyof Profile, value: Profile[keyof Profile]) => {
    if (key === "email") return;
    patch({ profile: { ...app.profile, [key]: value } });
  };
  function changeAvailability(availability: AvailabilityRange) {
    profile("availability", availability);
    if (fieldErrors.availabilityDays && !availabilitySubmissionError(availability, 2)) {
      setErrors(previous => { const next = { ...previous }; delete next.availabilityDays; return next; });
    }
  }
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
  const inputProps = (key: string) => ({ id: key, required: !["preferredName", "mobile", "portfolioUrl"].includes(key), "aria-required": !["preferredName", "mobile", "portfolioUrl"].includes(key), "data-validation-field": key, "aria-invalid": !!errors[key], "aria-describedby": [(["experience", "resumeUrl", "portfolioUrl"].includes(key) ? key + "-hint" : ""), errors[key] ? key + "-error" : ""].filter(Boolean).join(" ") || undefined, onBlur: (event: FocusEvent<HTMLElement>) => {
    // Navigation validates on activation; avoid moving its target during pointerdown.
    if (event.relatedTarget instanceof Element && event.relatedTarget.closest(".process-action-bar,.process-track")) return;
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
  if (state.error?.code === "STAFF_ACCOUNT") return <ApplyEntry><div className="apply-entry-main"><p className="apply-kicker">Account access</p><h1>This account has staff access</h1><p className="apply-lead">Applicant access has been cleared. Use Staff sign-in, or a separate Google account to apply. Your earlier saved draft remains stored.</p><Link href="/recruitment/staff" className="button button-orange">Check staff access</Link></div></ApplyEntry>;
  if (accessLost) return <ApplyEntry><div className="apply-entry-main"><p className="apply-kicker">Account access</p><h1>Check your applicant access</h1><p className="apply-lead">{submissionFeedback?.message ?? intakeFeedback?.message}</p><Link href="/recruitment/application" className="button button-orange">Check account</Link></div></ApplyEntry>;
  const submissionNotice = <>
    {genericError && <div className="process-recovery"><p className="field-error" ref={genericErrorRef} tabIndex={-1} role="alert">{genericError}</p>{!frozen && <button type="button" className="text-button" onClick={() => { if (window.confirm("Reload the saved draft and discard any unsaved edits?")) window.location.reload(); }}>Reload saved draft</button>}</div>}
    {state.error && <div className="process-recovery">{state.error.code !== "VALIDATION" && <p role="alert">{state.error.message}</p>}<div className="inline-actions"><button type="button" className="text-button" onClick={() => void retrySave()}>Retry save</button>{state.error.code === "UNAUTHENTICATED" && <Link href="/recruitment/apply" target="_blank" rel="noopener noreferrer">Sign in in another tab</Link>}{state.error.code === "CONFLICT" && <button type="button" className="text-button" onClick={() => { if (window.confirm("Reload the saved draft and discard these unsaved edits?")) window.location.reload(); }}>Reload saved draft</button>}</div></div>}
    {submissionFeedback && <div className="process-recovery">{(!genericError || submissionFeedback.kind === "uncertain") && <p role="alert">{submissionFeedback.message}</p>}<div className="inline-actions">{submissionFeedback.kind === "uncertain" && <button type="button" className="button button-orange" disabled={submitting} onClick={() => void submit()}>Retry same submission</button>}<button type="button" className="text-button" disabled={submitting} onClick={() => void checkLatest()}>Check latest details</button>{!frozen && !genericError && <button type="button" className="text-button" onClick={() => { if (window.confirm("Reload the saved draft and discard any unsaved edits?")) window.location.reload(); }}>Reload saved draft</button>}</div></div>}
    {intakeFeedback?.kind === "error" && <div className="process-recovery"><p role="alert">{intakeFeedback.message}</p><button type="button" className="text-button" disabled={submitting} onClick={() => void checkLatest()}>Retry intake refresh</button></div>}
  </>;
  return (
    <ProcessShell contentHeight surface="paper" unsaved={!practice && (state.phase !== "saved" || frozen)}>
      <main id="main-content" className="apply-page application-workbench-page">
        <div className="process-card application-workbench" ref={stepRef}>
          <div className="application-progress-panel">
            <header className="application-workbench-header">
              <span className="application-workbench-label">Your application</span>
              <span className="application-draft-badge">Draft</span>
              <p className="process-save-state" role="status" aria-live="polite">
                {practice ? "Practice answers are temporary" : <><span className={`process-save-dot ${state.phase}`} aria-hidden="true" />{saveStatus}</>}
              </p>
            </header>
            <div className="application-step-navigation">
              <ProcessProgress steps={steps} current={simplifiedStages.indexOf(stage)} onStep={index => goStage(simplifiedStages[index])} disabled={frozen || exiting} />
            </div>
          </div>
          <div className="application-workbench-column">
            {stage === 2 && (errors.eligibility || app.track === "CORE_TEAM" && !isCoreEligible(app.profile)) && (
              <div className="application-track-status">
                <div className="application-track-status-inner">
                  <p className="application-track-status-copy" id={errors.eligibility ? "eligibility-error" : undefined} role="status">
                    {errors.eligibility || "Your academic details do not meet Core Team eligibility."}
                  </p>
                  <button className="text-button" type="button" disabled={frozen || exiting} onClick={() => setPath("COMMITTEE")}>
                    Switch to Committee and keep my details
                  </button>
                </div>
              </div>
            )}
            <div className="application-workbench-content">
          {practice && <Callout title="Practice application"><p>Use sample details as you try the form. Your answers stay on this page and are never submitted to Alpha.</p></Callout>}
          {signOutFailed && <Callout tone="warning"><p role="alert">Sign-out could not be confirmed. Please retry using Sign out in the navigation.</p></Callout>}
          <div className="process-step-heading" tabIndex={-1} key={stage}>
            <h1>{headings[stage]}</h1>
            <p className="application-step-guidance">{stepGuidance[stage]}</p>
            {opportunity && !showRequested && (
              <p className="application-role-summary">
                <span className="application-role-summary-copy">
                  <span>Applying for </span>
                  <strong>{opportunityLabel(opportunity)}</strong>
                </span>
                <span className="application-role-summary-icon" aria-hidden="true">
                  <Icon name={opportunity.icon} size={22} />
                </span>
              </p>
            )}
          </div>
          {showRequested && <section className="application-role-choice" aria-labelledby="application-role-choice-title">
            <h2 id="application-role-choice-title">Switch to {opportunityLabel(requested)}?</h2>
            <p>Your draft is for <strong>{opportunity ? opportunityLabel(opportunity) : "an opportunity you haven’t chosen yet"}</strong>. Your answers will be kept.</p>
            <div className="application-role-choice-actions">
              <button type="button" className="button button-orange" disabled={frozen || exiting} onClick={() => resolveRequested(true)}>Use this opportunity</button>
              <button type="button" className="button button-secondary" disabled={frozen || exiting} onClick={() => resolveRequested(false)}>Keep my draft</button>
            </div>
          </section>}
          <form id="application-draft-form" noValidate onSubmit={(event) => { event.preventDefault(); if (stage === 5) void submit(); else next(); }}>
            <fieldset className="application-fields" disabled={frozen}>
              {stage === 1 && (
                <div className="process-form-section">
                  <div className="process-fields process-contact-fields">
                    <Field id="fullName" label="Full name" error={errors.fullName}>
                      <input {...inputProps("fullName")} value={app.profile.fullName} onChange={(event) => profile("fullName", event.target.value)} maxLength={120} autoComplete="name" placeholder="Alex Rivera" />
                    </Field>
                    <Field id="email" label="Email address" error={errors.email}>
                      <input {...inputProps("email")} value={app.profile.email} type="email" readOnly />
                    </Field>
                  </div>
                  <div className="process-group">
                    <h2 className="process-group-title">Academic details</h2>
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
                      <div>
                        <label className="checkbox-row">
                          <input id="enrolled" aria-required="true" data-validation-field="enrolled" aria-invalid={!!errors.enrolled} type="checkbox" checked={app.profile.enrolled} onChange={(event) => profile("enrolled", event.target.checked)} aria-describedby={errors.enrolled ? "enrolled-error" : undefined} />
                          <span>I certify that I am currently enrolled at a school, college, or university and will provide my current registration form or official enrollment certificate. <span className="required-mark" aria-hidden="true">*</span></span>
                        </label>
                        {errors.enrolled && <FieldError id="enrolled-error">{errors.enrolled}</FieldError>}
                      </div>
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
                    </div>
                  </section>
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
                    {(["CORE_TEAM", "COMMITTEE"] as const).map((track) => (
                      <label key={track} className={`process-choice${app.track === track ? " selected" : ""}`}>
                        <input type="radio" required name="track" aria-label={track === "CORE_TEAM" ? "Core Team" : "Committee"} aria-describedby={`${track}-eligibility`} checked={app.track === track} onChange={() => setPath(track)} />
                        <span className="process-radio" aria-hidden="true" />
                        <span className="process-choice-body"><strong>{track === "CORE_TEAM" ? "Core Team" : "Committee"}</strong><small id={`${track}-eligibility`}>{track === "CORE_TEAM" ? "1st & 2nd year undergraduates" : "All enrolled students"}</small></span>
                      </label>
                    ))}
                  </fieldset>
                  {errors.track && <FieldError id="track-error">{errors.track}</FieldError>}
                  <fieldset className="apply-opportunities" id="opportunityId" data-validation-field="opportunityId" tabIndex={-1} aria-invalid={!!errors.opportunityId} aria-describedby={errors.opportunityId ? "opportunityId-error" : undefined}>
                    <legend className="process-legend">{app.track === "CORE_TEAM" ? "Core Team role" : "Committee opportunity"} <span className="required-mark" aria-hidden="true">*</span></legend>

                    <div className="process-opportunity-groups">
                      {[...optionGroups].map(([group, options]) => <section className="process-opportunity-group" key={group} aria-label={group}>
                        <h3>{group}</h3>
                        {options.map(choice => {
                          const selected = app.opportunityId === choice.id;
                          const alreadyApplied = appliedRoles.includes(choice.id);
                          const title = choice.title === "Committee Member" && !choice.specialization
                            ? `${choice.department} Member`
                            : opportunityLabel(choice);
                          return <div className={`process-opportunity${selected ? " selected" : ""}`} key={choice.id}>
                            <label>
                              <input type="radio" required name="opportunity" aria-label={title} aria-describedby={selected ? `${choice.id}-description${choice.id === "buildher" ? " buildher-eligibility" : ""}` : undefined} value={choice.id} disabled={alreadyApplied} checked={selected} onChange={() => setPath(app.track, choice.id)} />
                              <span className="process-radio" aria-hidden="true" />
                              <span className="process-opportunity-body"><strong>{title}</strong><small>{alreadyApplied ? "Already applied" : availabilityLabel(vacancies, choice.id)}</small>{selected && <small className="process-selected-badge">Selected</small>}</span>
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
                <div className="process-form-section process-story-section">
                  {initialDraft.formVersion !== 2 && <Callout>We simplified the application to three short responses. Your saved text is preserved. Review the updated motivation and contribution prompt, and shorten any response above 150 words before continuing.</Callout>}
                  <section className="process-review-links" aria-labelledby="process-links-title">
                    <div className="process-story-document-heading">
                      <h3 className="process-group-title" id="process-links-title">Supporting documents</h3>
                      <p className="field-hint">A resume is required before you submit. You can save a draft without it.</p>
                    </div>
                    <div className="process-resume-group">
                      <Field id="resumeUrl" label="Resume link (required)" error={errors.resumeUrl} hint="Provide a view-only link. It must be viewable without signing in."><input {...inputProps("resumeUrl")} required aria-required="true" type="url" maxLength={2048} value={app.resumeUrl} onChange={event => patch({ resumeUrl: event.target.value })} placeholder="https://drive.google.com/file/d/…/view" /></Field>
                      <details className="process-resume-help">
                        <summary>How to share your resume</summary>
                        <ol className="process-resume-steps" role="list" aria-label="Google Drive sharing steps">
                          <li>
                            <span className="process-resume-step-number" aria-hidden="true">1</span>
                            <div>
                              <h4>Open sharing settings</h4>
                              <p>Open your resume in Google Drive and select <strong>Share</strong>.</p>
                            </div>
                          </li>
                          <li>
                            <span className="process-resume-step-number" aria-hidden="true">2</span>
                            <div>
                              <h4>Set view-only access</h4>
                              <p>Under <strong>General access</strong>, choose <strong>Anyone with the link</strong> and set the role to <strong>Viewer</strong>. Copy the link.</p>
                            </div>
                          </li>
                          <li>
                            <span className="process-resume-step-number" aria-hidden="true">3</span>
                            <div>
                              <h4>Test the link</h4>
                              <p>Open the link in a private browser window. If the resume opens without signing in, paste the link into the form.</p>
                            </div>
                          </li>
                        </ol>
                        <p className="process-resume-note">Keep the link accessible throughout recruitment. Alpha stores the link without checking document access.</p>
                      </details>
                      {app.resumeUrl && isEvidenceUrl(app.resumeUrl) && <a className="text-button" href={app.resumeUrl} target="_blank" rel="noopener noreferrer">Open resume link<Icon name="external" size={16} /></a>}
                    </div>
                    <EnrollmentUpload accountId={applicant.id} disabled={frozen || exiting} error={errors.proofOfEnrollment} onReady={setEnrollmentReady} practice={practice} />
                    <Field id="portfolioUrl" label="Portfolio link" optional error={errors.portfolioUrl} hint="HTTPS link, if you have one.">
                      <input {...inputProps("portfolioUrl")} type="url" maxLength={2048} value={app.portfolioUrl} onChange={(event) => patch({ portfolioUrl: event.target.value })} placeholder="https://your-portfolio.example" />
                    </Field>
                  </section>
                  <fieldset className="process-days" id="availabilityDays" data-validation-field="availabilityDays" tabIndex={-1} aria-describedby={`availabilityDays-hint${errors.availabilityDays ? " availabilityDays-error" : ""}`} aria-invalid={!!errors.availabilityDays}>
                    <legend>When are you usually available? <span className="required-mark" aria-hidden="true">*</span></legend>
                    <p className="field-hint" id="availabilityDays-hint">Choose a date range and the hours you’re available each day. Use Philippine time.</p>
                    {legacyWeekdays.length > 0 && <p className="field-hint">Saved weekdays: {legacyWeekdays.join(", ")}. Enter a date and time range to update them.</p>}
                    <AvailabilitySelector value={availabilityRange} onChange={changeAvailability} optional={legacyWeekdays.length > 0} disabled={frozen || exiting} error={errors.availabilityDays} />
                    {errors.availabilityDays && <FieldError id="availabilityDays-error">{errors.availabilityDays}</FieldError>}
                  </fieldset>
                  <div className="process-story-response-heading">
                    <div className="process-story-response-title">
                      <h3 className="process-group-title">Your responses</h3>
                      <span>{completedResponses} of {questions.length} complete</span>
                    </div>
                    <p className="field-hint" id="story-instructions">Use your own words. All three answers are required, up to 150 words each.</p>
                  </div>
                  {questions.map(question => <section className={`process-response${question.id === "scenario" ? " process-response-scenario" : ""}`} id={question.id === "scenario" ? "scenario-prompt" : undefined} key={question.id}>
                    <Field id={question.id} label={<>{question.id === "scenario" && <Icon name="sparkles" size={17} />}{question.prompt}</>} error={errors[question.id]}>
                      {question.id === "collaboration" && <p className="field-hint" id="collaboration-help">School and personal projects count.</p>}
                      {question.id === "scenario" && <p className="field-hint" id="scenario-help">Explain what you’d do first, why, and how you’d check whether it worked.</p>}
                      <textarea {...inputProps(question.id)} aria-describedby={`story-instructions ${question.id}-count${question.id === "scenario" || question.id === "collaboration" ? ` ${question.id}-help` : ""}${errors[question.id] ? ` ${question.id}-error` : ""}`} rows={5} value={app.answers[question.id]} onChange={event => changeResponse(question.id, event.target.value)} />
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
                    <p>{practice ? "Use a sample HTTPS resume link to test the review step." : "Apply once per role. Submitted answers and links lock. Withdrawal is final for this role; you can still apply for others."}</p>
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
          <ProcessActionBar
            exitAction={practice
              ? <Link className="process-text-action" href="/#opportunities">Browse roles</Link>
              : <button className="process-text-action" type="button" disabled={exiting || frozen} onClick={() => void saveExit()}>{exiting ? "Saving…" : "Save & exit"}</button>}
            notice={practiceFinished ? <Callout tone="success" title="Practice complete"><p role="status">Your answers passed validation. No application was sent.</p></Callout> : submissionNotice}
          >
            <button className="button button-secondary" type="button" disabled={frozen || stage === 1} onClick={() => goStage(simplifiedStages[simplifiedStages.indexOf(stage) - 1])}>Back</button>
            <button className="button button-orange" type="submit" form="application-draft-form" disabled={frozen || exiting || stage === 5 && !intake.accepting}>
              {stage === 5 ? practice ? "Submit test application" : submitting ? "Submitting…" : "Submit application" : "Continue"}
              <Icon name="arrow" size={17} />
            </button>
          </ProcessActionBar>
            </div>
          </div>
        </div>
      </main>
    </ProcessShell>
  );
}
