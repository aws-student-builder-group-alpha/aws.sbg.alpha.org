"use client";

import { useId, useState, type ReactNode } from "react";
import { applicationStatuses, type ApplicationStatus } from "@/recruitment/lib/applications";
import { getOpportunity, opportunities, opportunityLabel } from "@/recruitment/lib/catalog";
import { changeQueueTrack, defaultQueueFilters, queueIsFiltered, sameQueueFilters } from "@/recruitment/lib/application-queue";
import type { ApplicationQueue, QueueFilters } from "@/recruitment/lib/application-queue";
import { Callout, Icon, Modal } from "./ui";

const queueViews = [
  ["Unassigned", "Submitted", "unassigned", "all"],
  ["Awaiting recommendation", "Under Review", "assigned", "missing"],
  ["Ready for decision", "Under Review", "assigned", "saved"],
] as const;

const statusIcons: Record<ApplicationStatus, string> = {
  Submitted: "file",
  "Under Review": "search",
  Accepted: "check",
  Waitlisted: "clock",
  "Not Selected": "close",
  Withdrawn: "reset",
};

export function ApplicationQueueControls({ filters, applied, busy, frozen, notice, trailingActions, onChange, onSearch, onApply, onClear }: {
  filters: QueueFilters;
  applied: QueueFilters;
  busy: boolean;
  frozen: boolean;
  notice: string;
  trailingActions: ReactNode;
  onChange: (filters: QueueFilters) => void;
  onSearch: () => void;
  onApply: () => boolean;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejected, setRejected] = useState(false);
  const drawerId = useId();
  const opportunity = getOpportunity(applied.opportunityId);
  const appliedLabels = [
    applied.status === "all" ? "" : applied.status,
    applied.track === "all" ? "" : applied.track === "CORE_TEAM" ? "Core Team" : "Committee",
    opportunity ? opportunityLabel(opportunity) : "",
    applied.assignment === "all" ? "" : applied.assignment === "assigned" ? "Assigned" : "Unassigned",
    applied.review === "all" ? "" : applied.review === "saved" ? "Recommendation saved" : "Recommendation missing",
  ].filter(Boolean);
  const unapplied = !sameQueueFilters({ ...filters, search: applied.search }, applied);
  const close = () => { setExpanded(false); setRejected(false); };

  return <>
    <div className="queue-toolbar">
      <form className="queue-search-form" aria-label="Application search" onSubmit={event => { event.preventDefault(); onSearch(); }}>
        <label className="sr-only" htmlFor="evaluation-search">Search applications</label>
        <input type="search" disabled={frozen} id="evaluation-search" value={filters.search} maxLength={100}
          placeholder="Name, email, or reference" onChange={event => onChange({ ...filters, search: event.target.value })} />
        <button type="submit" className="icon-button" aria-label="Search" title="Search" disabled={busy}><Icon name="search" size={18} /></button>
      </form>
      <button type="button" className="button button-secondary queue-filter-toggle" aria-haspopup="dialog" aria-expanded={expanded}
        disabled={frozen} onClick={() => setExpanded(true)}>
        <Icon name="filter" size={17} /> Filters {appliedLabels.length > 0 && <span className="queue-filter-count">{appliedLabels.length}</span>}
      </button>
      {trailingActions}
    </div>
    {queueIsFiltered(applied) && <div className="queue-applied">
      {appliedLabels.length > 0 && <ul aria-label="Applied filters">
        {appliedLabels.map((label, index) => <li key={index}>{label}</li>)}
      </ul>}
      <button type="button" className="text-button" disabled={busy} onClick={onClear}>Clear all</button>
    </div>}
    {expanded && <Modal title="Filter applications" className="queue-filter-drawer" workspaceDrawer onClose={close}>
      <form className="queue-drawer-form" aria-label="Application queue filters" onSubmit={event => {
        event.preventDefault();
        if (onApply()) close();
        else setRejected(true);
      }}>
        <div className="queue-drawer-body">
          <fieldset disabled={busy} className="queue-drawer-fields">
            <legend>Queue views</legend>
            <div className="inline-actions queue-shortcuts">{queueViews.map(([label, status, assignment, review]) => <button
              key={label} type="button" className="button button-secondary"
              aria-pressed={filters.status === status && filters.assignment === assignment && filters.review === review}
              onClick={() => onChange({ ...filters, status, assignment, review })}>{label}</button>)}</div>
          </fieldset>
          <fieldset disabled={busy} className="queue-drawer-fields">
            <legend>Filter by</legend>
            <div className="field"><label htmlFor={drawerId + "-status"}>Application status</label>
              <select id={drawerId + "-status"} value={filters.status} onChange={event => onChange({ ...filters, status: event.target.value as QueueFilters["status"] })}>
                <option value="all">All statuses</option>{applicationStatuses.map(status => <option key={status}>{status}</option>)}
              </select></div>
            <div className="field"><label htmlFor={drawerId + "-track"}>Track</label>
              <select id={drawerId + "-track"} value={filters.track} onChange={event => onChange(changeQueueTrack(filters, event.target.value as QueueFilters["track"]))}>
                <option value="all">All tracks</option><option value="CORE_TEAM">Core Team</option><option value="COMMITTEE">Committee</option>
              </select></div>
            <div className="field"><label htmlFor={drawerId + "-opportunity"}>Opportunity</label>
              <select id={drawerId + "-opportunity"} value={filters.opportunityId} onChange={event => onChange({ ...filters, opportunityId: event.target.value })}>
                <option value="">All opportunities</option>
                {opportunities.filter(item => filters.track === "all" || item.track === filters.track).map(item => <option value={item.id} key={item.id}>{opportunityLabel(item)}</option>)}
              </select></div>
            <div className="field"><label htmlFor={drawerId + "-assignment"}>Evaluator assignment</label>
              <select id={drawerId + "-assignment"} value={filters.assignment} onChange={event => onChange({ ...filters, assignment: event.target.value as QueueFilters["assignment"] })}>
                <option value="all">All assignments</option><option value="assigned">Assigned</option><option value="unassigned">Unassigned</option>
              </select></div>
            <div className="field"><label htmlFor={drawerId + "-review"}>Current recommendation</label>
              <select id={drawerId + "-review"} value={filters.review} onChange={event => onChange({ ...filters, review: event.target.value as QueueFilters["review"] })}>
                <option value="all">All recommendations</option><option value="saved">Saved</option><option value="missing">Not saved</option>
              </select></div>
          </fieldset>
        </div>
        <div className="queue-drawer-footer">
          {rejected && notice ? <Callout tone="warning" role="alert">{notice}</Callout>
            : unapplied && <p role="status">Filter changes have not been applied.</p>}
          <div className="queue-drawer-actions">
            <button type="button" className="text-button" disabled={busy} onClick={() => onChange({ ...defaultQueueFilters, search: filters.search })}>Reset selections</button>
            <button type="submit" className="button button-orange" disabled={busy}>Apply filters</button>
          </div>
        </div>
      </form>
    </Modal>}
  </>;
}

export function ApplicationQueueCounts({ queue, shown }: { queue: ApplicationQueue; shown: number }) {
  return <section className="application-queue-counts" aria-labelledby="queue-counts-heading">
    <header className="queue-counts-heading">
      <h2 id="queue-counts-heading">Status breakdown</h2>
      <p role="status">{shown} shown of {queue.total} matching applications</p>
    </header>
    <dl className="queue-status-counts">
      {applicationStatuses.map(status => <div className="queue-status-cell" key={status} data-status={status}>
        <dt>{status}</dt>
        <dd>
          <span className="queue-status-icon" aria-hidden="true"><Icon name={statusIcons[status]} size={15} /></span>
          <span className="queue-status-value">{queue.statusCounts[status]}</span>
        </dd>
      </div>)}
    </dl>
  </section>;
}
