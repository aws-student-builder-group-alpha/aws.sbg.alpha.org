"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AdminPageHeader } from "@/app/(recruitment)/recruitment/components/admin-shell";
import { Icon, StatusBadge, formatDate } from "@/app/(recruitment)/recruitment/components/ui";
import type { EvaluationList } from "@/recruitment/lib/evaluations";
import type { IntakeState } from "@/recruitment/lib/intake";
import type { StaffMember } from "@/recruitment/lib/staff";

const statuses = ["Submitted", "Under Review", "Accepted", "Waitlisted", "Not Selected", "Withdrawn"] as const;

function intakeStatus(intake: IntakeState | null) {
  if (!intake) return undefined;
  if (intake.state === "closed") return "Closed";
  if (Date.parse(intake.serverNow) >= Date.parse(intake.closesAt)) return "Deadline passed";
  if (intake.accepting) return "Accepting";
  return intake.state === "paused" ? "Paused" : "Scheduled";
}

export function AdminOverview({ applications, staff, intake }: { applications: EvaluationList | null; staff: StaffMember[] | null; intake: IntakeState | null }) {
  const router = useRouter();
  const [refreshing, refresh] = useTransition();
  const queue = applications?.queue;
  const cards = [
    { label: "Under review", value: queue?.statusCounts["Under Review"], icon: "file", href: "/recruitment/admin/applications" },
    { label: "Accepted", value: queue?.statusCounts.Accepted, icon: "check", href: "/recruitment/admin/applications" },
    { label: "Active staff", value: staff?.filter(member => member.status === "active").length, icon: "people", href: "/recruitment/admin/staff" },
    { label: "Intake status", value: intakeStatus(intake), icon: "calendar", href: "/recruitment/admin/intake" },
  ];

  return <main id="main-content" className="admin-page admin-overview">
    <AdminPageHeader title="Overview" description="Track applications, staff access and the recruitment schedule.">
      <button type="button" className="button button-secondary" disabled={refreshing} onClick={() => refresh(() => router.refresh())}>
        {refreshing ? "Refreshing…" : "Refresh overview"}
      </button>
    </AdminPageHeader>

    <div className="admin-overview-lead">
      <section className="admin-cycle-note" aria-labelledby="application-total-title">
        <div>
          <h2 id="application-total-title">Total applications</h2>
          <strong>{queue?.total ?? "Unavailable"}</strong>
          <p>{queue ? "Across all submitted applications" : "Refresh overview to retry"}</p>
        </div>
        <Link href="/recruitment/admin/applications">Open applications <Icon name="arrow" size={16} /></Link>
      </section>
      <div className="admin-metrics">{cards.map(card => <Link className="admin-metric" key={card.label} href={card.href}>
        <span><Icon name={card.icon} size={16} />{card.label}</span>
        <strong>{card.value ?? "Unavailable"}</strong>
        {card.value === undefined && <small>Refresh overview to retry</small>}
      </Link>)}</div>
    </div>

    <div className="admin-overview-grid">
      <section className="admin-surface admin-status-overview" aria-labelledby="status-overview-title">
        <h2 id="status-overview-title">Application status</h2>
        {!queue ? <p role="status">Status breakdown is unavailable. Refresh overview to retry.</p> : <>
          {queue.total === 0 ? <p>Status totals will appear after the first submission.</p> :
            <div className="admin-status-track" aria-hidden="true">{statuses.map((status, index) => <span
              key={status} className={`admin-status-segment status-color-${index}`}
              style={{ flexGrow: queue.statusCounts[status] }}
            />)}</div>}
          <dl className="admin-status-legend">{statuses.map((status, index) => <div key={status}>
            <dt><span aria-hidden="true" className={`admin-status-dot status-color-${index}`} />{status}</dt>
            <dd>{queue.statusCounts[status]}</dd>
          </div>)}</dl>
        </>}
      </section>

      <section className="admin-surface" aria-labelledby="intake-schedule-title">
        <h2 id="intake-schedule-title">Intake schedule</h2>
        {intake ? <>
          <p className="admin-schedule-zone">Philippine time</p>
          <dl className="admin-schedule">
            <div><dt>Opens</dt><dd><time dateTime={intake.opensAt}>{formatDate(intake.opensAt)}</time></dd></div>
            <div><dt>Closes</dt><dd><time dateTime={intake.closesAt}>{formatDate(intake.closesAt)}</time></dd></div>
          </dl>
        </> : <p role="status">Schedule unavailable. Refresh overview to retry.</p>}
        <Link href="/recruitment/admin/intake" className="admin-inline-link">Manage intake <Icon name="arrow" size={16} /></Link>
      </section>
    </div>

    <section className="admin-surface admin-recent" aria-labelledby="recent-applications-title">
      <div className="admin-section-heading">
        <h2 id="recent-applications-title">Recent applications</h2>
        <Link href="/recruitment/admin/applications">View all applications <Icon name="arrow" size={16} /></Link>
      </div>
      {!applications ? <p role="status">Applications could not be loaded. Refresh overview to retry.</p> :
        !applications.items.length ? <p>No submitted applications yet.</p> : <table className="admin-recent-table" aria-labelledby="recent-applications-title" role="table">
          <thead><tr><th scope="col">Applicant</th><th scope="col">Reference</th><th scope="col">Status</th><th scope="col">Submitted · Philippine time</th></tr></thead>
          <tbody role="rowgroup">{applications.items.slice(0, 5).map(item => <tr key={item.id} role="row">
            <td role="cell"><strong>{item.name}</strong></td>
            <td role="cell" data-label="Reference">{item.reference}</td>
            <td role="cell" data-label="Status"><StatusBadge status={item.status} /></td>
            <td role="cell" data-label="Submitted"><time dateTime={item.submittedAt ?? undefined}>{formatDate(item.submittedAt)}</time></td>
          </tr>)}</tbody>
        </table>}
    </section>
  </main>;
}
