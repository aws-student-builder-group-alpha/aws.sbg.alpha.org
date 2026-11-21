"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { AdminPageHeader } from "@/app/(recruitment)/recruitment/components/admin-shell";
import { EmptyState, Icon, StatusBadge, formatDate } from "@/app/(recruitment)/recruitment/components/ui";
import { useEntrance } from "@/app/(recruitment)/recruitment/components/motion";
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
  const overview = useRef<HTMLDivElement>(null);
  useEntrance(overview, { preset: "workspace", selector: ".admin-metrics, .admin-status-overview" });
  const queue = applications?.queue;
  const activeStaff = staff?.filter(member => member.status === "active").length;
  const cards = [
    { label: "Total applications", value: queue?.total, icon: "file" },
    { label: "Under review", value: queue?.statusCounts["Under Review"], icon: "people" },
    { label: "Accepted", value: queue?.statusCounts.Accepted, icon: "check" },
  ];

  return <main id="main-content" className="admin-page admin-overview">
    <AdminPageHeader title="Overview" description="Track applications, staff access and the recruitment schedule.">
      <Link href="/recruitment/admin/applications" className="button button-orange">Open applications <Icon name="arrow" size={16} /></Link>
      <button type="button" className="button button-secondary" disabled={refreshing} onClick={() => refresh(() => router.refresh())}>
        {refreshing ? "Refreshing…" : "Refresh overview"}
      </button>
    </AdminPageHeader>

    <div className="admin-overview-grid" ref={overview}>
      <div className="admin-overview-primary">
        <dl className="admin-metrics" aria-label="Application totals">{cards.map(card => <div className="admin-metric" key={card.label}>
          <dt><span className="admin-metric-icon"><Icon name={card.icon} size={17} /></span>{card.label}</dt>
          <dd className="admin-metric-value" data-unavailable={card.value === undefined || undefined}>{card.value ?? "Unavailable"}</dd>
        </div>)}</dl>

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
      </div>

      <div className="admin-overview-context">
        <section className="admin-surface" aria-labelledby="intake-schedule-title">
          <h2 id="intake-schedule-title">Intake</h2>
          {intake ? <>
            <p className="admin-intake-state" data-accepting={intake.accepting || undefined}>{intakeStatus(intake)}</p>
            <dl className="admin-schedule">
              <div><dt>Opens</dt><dd><time dateTime={intake.opensAt}>{formatDate(intake.opensAt)}</time></dd></div>
              <div><dt>Closes</dt><dd><time dateTime={intake.closesAt}>{formatDate(intake.closesAt)}</time></dd></div>
            </dl>
            <p className="admin-schedule-zone">Philippine time</p>
          </> : <p role="status">Intake unavailable. Refresh overview to retry.</p>}
          <Link href="/recruitment/admin/intake" className="admin-inline-link">Manage intake <Icon name="arrow" size={16} /></Link>
        </section>

        <section className="admin-surface" aria-labelledby="active-staff-title">
          <h2 id="active-staff-title">Active staff</h2>
          <p className="admin-metric-value" data-unavailable={activeStaff === undefined || undefined}>{activeStaff ?? "Unavailable"}</p>
          <Link href="/recruitment/admin/staff" className="admin-inline-link">Manage staff <Icon name="arrow" size={16} /></Link>
        </section>
      </div>
    </div>

    <section className="admin-surface admin-recent" aria-labelledby="recent-applications-title">
      <h2 id="recent-applications-title">Recent applications</h2>
      {!applications ? <p role="status">Applications could not be loaded. Refresh overview to retry.</p> :
        !applications.items.length ? <EmptyState compact title="No submitted applications yet." description="The five most recent submissions will appear here." /> : <table className="admin-recent-table" aria-labelledby="recent-applications-title" role="table">
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
