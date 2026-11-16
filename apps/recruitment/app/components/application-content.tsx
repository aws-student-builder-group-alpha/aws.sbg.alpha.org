"use client";
import {
  getOpportunity,
  opportunityLabel,
  questionsFor,
  trackLabel,
} from "@/lib/catalog";
import type { Draft } from "@/lib/drafts";
import { Badge, Icon } from "./ui";

export function ApplicationContent({
  application: app,
  onEdit,
  excludeEvidence = false,
}: {
  application: Pick<Draft, "profile" | "track" | "opportunityId" | "answers" | "resumeUrl" | "portfolioUrl" | "formVersion">;
  onEdit?: (stage: number) => void;
  excludeEvidence?: boolean;
}) {
  const opportunity = getOpportunity(app.opportunityId);
  return (
    <div className="application-content">
      <section className="review-section">
        <div className="subheading">
          <h3>About the applicant</h3>
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
      <section className="review-section">
        <div className="subheading">
          <h3>Chosen opportunity</h3>
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
      <section className="review-section">
        <div className="subheading">
          <h3>The applicant’s story</h3>
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
      {!excludeEvidence && <section className="review-section">
        <div className="subheading">
          <h3>Supporting evidence</h3>
          {onEdit && (
            <button type="button" className="text-button" onClick={() => onEdit(app.formVersion === 2 ? 3 : 4)}>
              Edit evidence
            </button>
          )}
        </div>
        {!app.resumeUrl && !app.portfolioUrl && <p className="muted">No evidence links were included in this application.</p>}
        {([["Resume", app.resumeUrl], ["Portfolio", app.portfolioUrl]] as const).map(([label, url]) => url && <p className="portfolio-link" key={label}>{label}: <a href={url} target="_blank" rel="noopener noreferrer">{url}<Icon name="external" size={14} /></a></p>)}
      </section>}
    </div>
  );
}
