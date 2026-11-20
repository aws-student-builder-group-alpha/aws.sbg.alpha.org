"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AdminPageHeader } from "@/app/(recruitment)/recruitment/components/admin-shell";
import { StatusBadge, formatDate } from "@/app/(recruitment)/recruitment/components/ui";
import type { EvaluationList } from "@/recruitment/lib/evaluations";
import type { IntakeState } from "@/recruitment/lib/intake";
import type { StaffMember } from "@/recruitment/lib/staff";

export function AdminOverview({ applications, staff, intake }: { applications: EvaluationList | null; staff: StaffMember[] | null; intake: IntakeState | null }) {
  const router = useRouter();
  const [refreshing, refresh] = useTransition();
  const intakeLabel = !intake ? undefined : intake.state === "closed" ? "Closed" : Date.parse(intake.serverNow) >= Date.parse(intake.closesAt) ? "Deadline passed" : intake.accepting ? "Accepting" : intake.state === "paused" ? "Paused" : "Scheduled";
  const cards = [
    { label: "Total applications", value: applications?.queue?.total, hint: "Across all submitted applications", href: "/recruitment/admin/applications" },
    { label: "Under review", value: applications?.queue?.statusCounts["Under Review"], hint: "Applications in the review stage", href: "/recruitment/admin/applications" },
    { label: "Active staff", value: staff?.filter(member => member.status === "active").length, hint: "Administrators and organization heads", href: "/recruitment/admin/staff" },
    { label: "Intake", value: intakeLabel, hint: "Current submission availability", href: "/recruitment/admin/intake" },
  ];
  const statuses = ["Submitted", "Under Review", "Accepted", "Waitlisted", "Not Selected", "Withdrawn"] as const;
  const total = applications?.queue?.total ?? 0;
  return <main id="main-content" className="admin-page admin-overview"><AdminPageHeader title="Overview" description="A clear view of the people joining your next chapter."><button type="button" className="button button-secondary" disabled={refreshing} onClick={() => refresh(() => router.refresh())}>{refreshing ? "Refreshing…" : "Refresh overview"}</button></AdminPageHeader>
    <section className="admin-cycle-note"><span className="editorial-kicker">RECRUITMENT / NOVEMBER 2026</span><p>Make room for<br /><strong>the next builders.</strong></p><Link href="/recruitment/admin/applications">Open applications <span aria-hidden="true">&rarr;</span></Link></section>
    <div className="admin-metrics">{cards.map(card => <Link className="admin-metric" key={card.label} href={card.href}><span>{card.label}</span><strong>{card.value ?? "Unavailable"}</strong><small>{card.value === undefined ? "Refresh overview to retry" : card.hint}</small></Link>)}</div>
    <section className="admin-surface admin-status-overview" aria-labelledby="status-overview-title">
      <div className="admin-section-heading"><div><span className="editorial-kicker">THE BIG PICTURE</span><h2 id="status-overview-title">Where applications stand</h2></div><span className="editorial-caption">All submitted applications</span></div>
      {!applications?.queue ? <p role="status">Status breakdown is unavailable. Refresh overview to retry.</p> : <>
        {total === 0 ? <p>Status totals will appear after the first submission.</p> : <div className="admin-status-track" aria-hidden="true">{statuses.map((status,index) => <span key={status} className={`admin-status-segment status-color-${index}`} style={{width:`${((applications.queue?.statusCounts[status] ?? 0)/total)*100}%`}} />)}</div>}
        <dl className="admin-status-legend">{statuses.map((status,index) => <div key={status}><dt><span aria-hidden="true" className={`admin-status-dot status-color-${index}`} />{status}</dt><dd>{applications.queue?.statusCounts[status] ?? 0}</dd></div>)}</dl>
      </>}
    </section>
    <div className="admin-overview-grid"><section className="admin-surface"><div className="admin-section-heading"><h2>Latest applications</h2><Link href="/recruitment/admin/applications">View all applications →</Link></div><p className="muted">The five most recent submissions.</p>
      {!applications ? <p role="status">Applications could not be loaded. Refresh overview to retry.</p> : !applications.items.length ? <p>No submitted applications yet.</p> : <ul className="admin-recent-list">{applications.items.slice(0, 5).map(item => <li key={item.id}><div className="admin-recent-person"><span className="editorial-avatar" aria-hidden="true">{item.name.trim().slice(0,1).toUpperCase()}</span><div><strong>{item.name}</strong><small>{item.reference} · {formatDate(item.submittedAt)}</small></div></div><StatusBadge status={item.status} /></li>)}</ul>}
    </section><div className="admin-overview-side"><section className="admin-surface"><h2>Intake schedule</h2>{intake ? <dl className="admin-schedule"><div><dt>Opens · Philippine time</dt><dd>{formatDate(intake.opensAt)}</dd></div><div><dt>Closes · Philippine time</dt><dd>{formatDate(intake.closesAt)}</dd></div></dl> : <p>Schedule unavailable. Refresh overview to retry.</p>}<Link href="/recruitment/admin/intake" className="admin-inline-link">Manage intake →</Link></section><section className="admin-surface"><h2>Keep things moving</h2><div className="admin-quick-links"><Link href="/recruitment/admin/staff">Manage staff access <span>→</span></Link><Link href="/recruitment/admin/members">Invite organization members <span>→</span></Link><Link href="/recruitment/admin/activity">Inspect security activity <span>→</span></Link></div></section></div></div>
  </main>;
}
