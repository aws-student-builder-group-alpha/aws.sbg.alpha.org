import type { ReactNode } from "react";

/** Static markup works in route fallbacks and client-side read states alike. */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span className={`workspace-skeleton-block ${className}`} aria-hidden="true" />;
}

function LoadingRegion({ label, children }: { label: string; children: ReactNode }) {
  return <div className="workspace-loading">
    <span className="sr-only" role="status">{label}</span>
    <div aria-busy="true" aria-hidden="true">{children}</div>
  </div>;
}

export function ListSkeleton({ label = "Loading records…", rows = 3 }: { label?: string; rows?: number }) {
  return <LoadingRegion label={label}><SkeletonRows rows={rows} /></LoadingRegion>;
}

export function DetailSkeleton() {
  return <section className="panel workspace-skeleton-detail"><LoadingRegion label="Loading application…">
    <SkeletonBlock className="skeleton-title" /><SkeletonBlock className="skeleton-line skeleton-medium" />
    <div className="workspace-skeleton-fields">{Array.from({ length: 4 }, (_, index) => <SkeletonBlock className="skeleton-field" key={index} />)}</div>
    <SkeletonBlock className="skeleton-paragraph" />
  </LoadingRegion></section>;
}

export type AdminSkeletonView = "overview" | "applications" | "intake" | "staff" | "members" | "activity";
const pageNames: Record<AdminSkeletonView, string> = { overview: "Overview", applications: "Applications", intake: "Intake", staff: "Staff accounts", members: "Organization members", activity: "Security activity" };

export function AdminPageSkeleton({ view = "overview" }: { view?: AdminSkeletonView }) {
  return <main id="main-content" className="admin-page workspace-skeleton-page" data-skeleton-view={view}>
    <h1 className="sr-only">{pageNames[view]}</h1>
    <LoadingRegion label={`Loading ${pageNames[view].toLowerCase()}…`}>
      <div className="workspace-skeleton-heading"><SkeletonBlock className="skeleton-title" /><SkeletonBlock className="skeleton-line skeleton-medium" /></div>
      {view === "overview" ? <>
        <div className="admin-overview-grid">
          <div className="admin-overview-primary">
            <div className="admin-metrics">{Array.from({ length: 3 }, (_, index) => <div className="admin-metric" key={index}>
              <SkeletonBlock className="skeleton-line skeleton-medium" /><SkeletonBlock className="skeleton-title" />
            </div>)}</div>
            <div className="admin-surface admin-status-overview"><SkeletonBlock className="skeleton-title" /><SkeletonRows rows={2} /></div>
          </div>
          <div className="admin-overview-context">
            <div className="admin-surface"><SkeletonBlock className="skeleton-title" /><SkeletonRows rows={2} /></div>
            <div className="admin-surface"><SkeletonBlock className="skeleton-title" /><SkeletonBlock className="skeleton-line skeleton-medium" /></div>
          </div>
        </div>
        <div className="admin-surface admin-recent"><SkeletonBlock className="skeleton-title" /><SkeletonRows rows={5} /></div>
      </> : view === "intake" ? <div className="admin-skeleton-stack">
        <div className="intake-workspace-columns">
          <div className="admin-surface">
            <SkeletonBlock className="skeleton-title" />
            <SkeletonBlock className="skeleton-paragraph" />
            <SkeletonBlock className="skeleton-line skeleton-short" />
            <div className="intake-schedule">
              <SkeletonBlock className="skeleton-field" />
              <SkeletonBlock className="skeleton-field" />
            </div>
          </div>
          <div className="admin-surface">
            <SkeletonBlock className="skeleton-title" />
            <SkeletonBlock className="skeleton-field" />
            <SkeletonBlock className="skeleton-paragraph" />
            <SkeletonBlock className="skeleton-field skeleton-medium" />
          </div>
        </div>
        <div className="admin-surface intake-skeleton-history"><SkeletonBlock className="skeleton-line skeleton-medium" /></div>
      </div> : view === "members" ? <div className="member-workspace">
        <div className="admin-surface">
          <SkeletonBlock className="skeleton-title" />
          <SkeletonBlock className="skeleton-paragraph" />
          <SkeletonBlock className="skeleton-paragraph" />
        </div>
        <div className="admin-surface">
          <SkeletonBlock className="skeleton-title" />
          <SkeletonBlock className="skeleton-line skeleton-medium" />
          <SkeletonBlock className="skeleton-paragraph" />
        </div>
      </div> : <div className="admin-skeleton-stack">
        {view === "applications" && <div className="admin-surface">
          <SkeletonBlock className="skeleton-field" />
          <SkeletonBlock className="skeleton-title" />
          <SkeletonBlock className="skeleton-line skeleton-medium" />
        </div>}
        <div className="admin-surface">
          <SkeletonBlock className="skeleton-field skeleton-medium" />
          <SkeletonRows rows={5} />
        </div>
      </div>}
    </LoadingRegion>
  </main>;
}

function SkeletonRows({ rows }: { rows: number }) {
  return <div className="workspace-skeleton-list">{Array.from({ length: rows }, (_, index) => <div className="workspace-skeleton-row" key={index}><SkeletonBlock className="skeleton-line skeleton-medium" /><SkeletonBlock className="skeleton-line" /><SkeletonBlock className="skeleton-line skeleton-short" /></div>)}</div>;
}

export function StaffPageSkeleton() {
  return <main id="main-content" className="container portal workspace-redesign workspace-auth staff-auth-page">
    <section className="panel workspace-auth-content staff-auth-card"><h1 className="sr-only">Staff sign-in</h1><LoadingRegion label="Checking staff access…">
      <SkeletonBlock className="skeleton-line skeleton-short" /><SkeletonBlock className="skeleton-title" />
      <SkeletonBlock className="skeleton-paragraph" /><SkeletonBlock className="skeleton-field" /><SkeletonBlock className="skeleton-line skeleton-medium" />
    </LoadingRegion></section>
  </main>;
}

export function ReviewerPageSkeleton() {
  return <main id="main-content" className="container portal staff-portal workspace-redesign workspace-skeleton-page workspace-reviewer" data-skeleton-view="reviewer">
    <h1 className="sr-only">Evaluator workspace</h1><LoadingRegion label="Checking evaluator access…">
      <div className="workspace-skeleton-reviewer"><div className="workspace-skeleton-toolbar"><SkeletonBlock className="skeleton-field" /><SkeletonBlock className="skeleton-line skeleton-medium" /></div>
        <SkeletonRows rows={5} />
      </div>
    </LoadingRegion>
  </main>;
}
