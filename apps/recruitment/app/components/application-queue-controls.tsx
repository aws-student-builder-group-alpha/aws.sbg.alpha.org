"use client";

import { useState, type ReactNode } from "react";
import { applicationStatuses } from "@/lib/applications";
import { opportunities, opportunityLabel } from "@/lib/catalog";
import { changeQueueTrack, sameQueueFilters } from "@/lib/application-queue";
import type { ApplicationQueue, QueueFilters } from "@/lib/application-queue";
import { Icon } from "./ui";

export function ApplicationQueueControls({ filters, applied, busy, frozen = false, collapsible = false, trailingActions, onChange, onApply, onClear, onRefresh }: {
  filters: QueueFilters; applied: QueueFilters; busy: boolean; frozen?: boolean; onChange: (filters: QueueFilters) => void;
  onApply: () => void; onClear: () => void; onRefresh: () => void;
  collapsible?: boolean; trailingActions?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const appliedCount = [applied.status, applied.track, applied.opportunityId, applied.assignment, applied.review].filter(value => value && value !== "all").length;
  const search = <div className="queue-search"><label htmlFor="evaluation-search">Search applications</label><input disabled={frozen} id="evaluation-search" value={filters.search} maxLength={100} placeholder={collapsible ? "Search by name, email, or reference" : "Name, email, or reference"} onChange={event => onChange({ ...filters, search: event.target.value })} /></div>;
  const actions = <div className="inline-actions queue-query-actions"><button className="button button-secondary" type="submit" disabled={busy}>Apply filters</button><button className="text-button" type="button" onClick={onClear} disabled={busy}>Clear filters</button></div>;
  return <form className="application-queue-controls" onSubmit={event => { event.preventDefault(); onApply(); }} aria-label="Application queue filters">
    {collapsible ? <div className="queue-toolbar">{search}<button className="button button-secondary" type="submit" disabled={busy}>Search</button><button type="button" className="button button-secondary queue-filter-toggle" aria-expanded={expanded} aria-controls="queue-additional-filters" disabled={frozen} onClick={() => setExpanded(value => !value)}>Filters {appliedCount > 0 && <span>{appliedCount} applied</span>}<Icon name="chevron" size={14} /></button><button className="text-button" type="button" aria-label="Refresh applications" onClick={onRefresh} disabled={busy}>Refresh</button>{trailingActions}</div> : search}
    <div id={collapsible ? "queue-additional-filters" : undefined} className="queue-filter-grid" data-expanded={collapsible ? expanded : undefined}>
      <div className="field"><label htmlFor="queue-status">Application status</label><select disabled={frozen} id="queue-status" value={filters.status} onChange={event => onChange({ ...filters, status: event.target.value as QueueFilters["status"] })}><option value="all">All statuses</option>{applicationStatuses.map(status => <option key={status}>{status}</option>)}</select></div>
      <div className="field"><label htmlFor="queue-track">Track</label><select disabled={frozen} id="queue-track" value={filters.track} onChange={event => onChange(changeQueueTrack(filters, event.target.value as QueueFilters["track"]))}><option value="all">All tracks</option><option value="CORE_TEAM">Core Team</option><option value="COMMITTEE">Committee</option><option value="MEMBER">Member</option></select></div>
      <div className="field queue-opportunity"><label htmlFor="queue-opportunity">Opportunity</label><select disabled={frozen} id="queue-opportunity" value={filters.opportunityId} onChange={event => onChange({ ...filters, opportunityId: event.target.value })}><option value="">All opportunities</option>{opportunities.filter(item => filters.track === "all" || item.track === filters.track).map(item => <option value={item.id} key={item.id}>{opportunityLabel(item)}</option>)}</select></div>
      <div className="field"><label htmlFor="queue-assignment">Evaluator assignment</label><select disabled={frozen} id="queue-assignment" value={filters.assignment} onChange={event => onChange({ ...filters, assignment: event.target.value as QueueFilters["assignment"] })}><option value="all">All assignments</option><option value="assigned">Assigned</option><option value="unassigned">Unassigned</option></select></div>
      <div className="field"><label htmlFor="queue-review">Current recommendation</label><select disabled={frozen} id="queue-review" value={filters.review} onChange={event => onChange({ ...filters, review: event.target.value as QueueFilters["review"] })}><option value="all">All recommendations</option><option value="saved">Saved</option><option value="missing">Not saved</option></select></div>
      {collapsible && actions}
    </div>
    {!collapsible && <>{actions}<button className="text-button" type="button" onClick={onRefresh} disabled={busy}>Refresh applications</button></>}
    {!sameQueueFilters(filters, applied) && <p className="muted" role="status">Filter changes have not been applied. Results and counts still follow the applied filters.</p>}
  </form>;
}

export function ApplicationQueueCounts({ queue, shown, compact = false }: { queue: ApplicationQueue; shown: number; compact?: boolean }) {
  return <section className="application-queue-counts" aria-labelledby="queue-counts-heading">
    <h2 id="queue-counts-heading">Matching applications</h2>
    <p role="status">{shown} shown of {queue.total} matching applications.{!compact && " Counts include every matching page and follow all applied filters."}</p>
    <details className="queue-count-disclosure"><summary>Status breakdown</summary><dl className="queue-status-counts">{applicationStatuses.map(status => <div key={status}><dt>{status}</dt><dd>{queue.statusCounts[status]}</dd></div>)}</dl></details>
  </section>;
}
