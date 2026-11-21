"use client";
import { useId, type ReactNode } from "react";
import {
  getOpportunity,
  opportunityLabel,
  questionsFor,
  trackLabel,
} from "@/recruitment/lib/catalog";
import type { Draft } from "@/recruitment/lib/drafts";
import { Badge, Icon } from "./ui";

const reviewSections = [
  ["profile", "Applicant details"],
  ["opportunity", "Chosen opportunity"],
  ["answers", "Written answers"],
  ["evidence", "Supporting evidence"],
] as const;

export function ApplicationContent({
  application: app,
  onEdit,
  excludeEvidence = false,
  staffReview,
}: {
  application: Pick<Draft, "profile" | "track" | "opportunityId" | "answers" | "resumeUrl" | "portfolioUrl" | "formVersion">;
  onEdit?: (stage: number) => void;
  excludeEvidence?: boolean;
  staffReview?: { enrollmentProof: ReactNode };
}) {
  const opportunity = getOpportunity(app.opportunityId);
  const id = useId();
  const sectionHeading = (key: string) => staffReview ? { id: `${id}-${key}`, tabIndex: -1 } : undefined;
  return (
    <div className={staffReview ? "application-content staff-application-content" : "application-content"}>
      {staffReview && <nav className="record-jump-links" aria-label="Application sections">
        {reviewSections.filter(([key]) => key !== "evidence" || !excludeEvidence).map(([key, label]) =>
          <a key={key} href={`#${id}-${key}`} onClick={event => {
            if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
            const heading = document.getElementById(`${id}-${key}`);
            if (!heading) return;
            event.preventDefault();
            heading.focus({ preventScroll: true });
            heading.scrollIntoView({ block: "start", behavior: "instant" });
          }}>{label}</a>
        )}
      </nav>}
      <section className="review-section" aria-labelledby={sectionHeading("profile")?.id}>
        <div className="subheading">
          <h3 {...sectionHeading("profile")}>{staffReview ? "Applicant details" : "About the applicant"}</h3>
          {onEdit && (
            <button type="button" className="text-button" onClick={() => onEdit(1)}>
              Edit details
            </button>
          )}
        </div>
        <dl className="details-grid">
          <div>
            <dt>Full name</dt>
            <dd>{app.profile.fullName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{app.profile.email}</dd>
          </div>
          <div>
            <dt>School / College / University</dt>
            <dd>
              {app.profile.university === "Other"
                ? app.profile.otherUniversity
                : app.profile.university}
              {app.profile.campus && ` · ${app.profile.campus}`}
            </dd>
          </div>
          <div>
            <dt>Degree / program</dt>
            <dd>{app.profile.program}</dd>
          </div>
          <div>
            <dt>Current standing</dt>
            <dd>
              {app.profile.programLevel} · Year {app.profile.year}
              {app.profile.yearExplanation &&
                ` (${app.profile.yearExplanation})`}
            </dd>
          </div>
          <div>
            <dt>Available days</dt>
            <dd>{app.profile.availability.join(", ")}</dd>
          </div>
          {app.profile.preferredName && (
            <div>
              <dt>Preferred name</dt>
              <dd>{app.profile.preferredName}</dd>
            </div>
          )}
          {app.profile.mobile && (
            <div>
              <dt>Mobile number</dt>
              <dd>{app.profile.mobile}</dd>
            </div>
          )}
        </dl>
        {app.formVersion !== 2 && <div className="response-block">
          <h4>Experience & interests</h4>
          <p>{app.profile.experience}</p>
        </div>}
      </section>
      <section className="review-section" aria-labelledby={sectionHeading("opportunity")?.id}>
        <div className="subheading">
          <h3 {...sectionHeading("opportunity")}>Chosen opportunity</h3>
          {onEdit && (
            <button type="button" className="text-button" onClick={() => onEdit(2)}>
              Edit choice
            </button>
          )}
        </div>
        <div className="selected-opportunity">
          <span className="opportunity-icon">
            <Icon name={opportunity?.icon || "sparkles"} />
          </span>
          <div>
            <Badge tone="orange">{trackLabel(app.track)}</Badge>
            <h4>{opportunityLabel(opportunity)}</h4>
            <p>{opportunity?.department}</p>
          </div>
        </div>
      </section>
      <section className="review-section" aria-labelledby={sectionHeading("answers")?.id}>
        <div className="subheading">
          <h3 {...sectionHeading("answers")}>{staffReview ? "Written answers" : "The applicant’s story"}</h3>
          {onEdit && (
            <button type="button" className="text-button" onClick={() => onEdit(3)}>
              Edit answers
            </button>
          )}
        </div>
        {questionsFor(app.opportunityId, app.formVersion).map((q) => (
          <div className="response-block" key={q.id}>
            <h4>{q.prompt}</h4>
            <p>{app.answers[q.id]}</p>
          </div>
        ))}
      </section>
      {!excludeEvidence && <section className="review-section" aria-labelledby={sectionHeading("evidence")?.id}>
        <div className="subheading">
          <h3 {...sectionHeading("evidence")}>Supporting evidence</h3>
          {onEdit && (
            <button type="button" className="text-button" onClick={() => onEdit(app.formVersion === 2 ? 3 : 4)}>
              Edit evidence
            </button>
          )}
        </div>
        {!app.resumeUrl && !app.portfolioUrl && <p className="muted">{staffReview ? "No résumé or portfolio links were included." : "No evidence links were included in this application."}</p>}
        {staffReview ? <div className="record-evidence-links">
          {([["Open résumé", app.resumeUrl], ["Open portfolio", app.portfolioUrl]] as const).map(([label, url]) =>
            url && <a key={label} className="button button-secondary" href={url} target="_blank" rel="noopener noreferrer">
              <Icon name="file" size={16} />{label}<Icon name="external" size={14} />
            </a>
          )}
          {staffReview.enrollmentProof}
        </div> : ([["Resume", app.resumeUrl], ["Portfolio", app.portfolioUrl]] as const).map(([label, url]) => url && <p className="portfolio-link" key={label}>{label}: <a href={url} target="_blank" rel="noopener noreferrer">{url}<Icon name="external" size={14} /></a></p>)}
      </section>}
    </div>
  );
}
