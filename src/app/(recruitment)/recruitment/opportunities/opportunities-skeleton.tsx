import { SkeletonBlock } from "../components/workspace-skeleton";

export function OpportunitiesSkeleton() {
  return (
    <main id="main-content" className="roles-page">
      <p className="sr-only" role="status">Loading opportunities…</p>
      <div className="roles-layout roles-loading" aria-busy="true">
        <div className="roles-results">
          <h1 className="sr-only">Opportunities</h1>
          <div className="roles-tools" aria-hidden="true">
            <SkeletonBlock className="roles-placeholder-control" />
            <SkeletonBlock className="roles-placeholder-control" />
          </div>
          <div className="roles-results-bar" aria-hidden="true"><SkeletonBlock className="roles-placeholder-tabs" /></div>
          <SkeletonBlock className="roles-placeholder-track" />
          <div className="roles-grid" aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="roles-placeholder-card" key={index}>
                <SkeletonBlock className="roles-placeholder-card-surface" />
                <SkeletonBlock className="skeleton-line skeleton-medium" />
              </div>
            ))}
          </div>
        </div>
        <div className="roles-sidebar" aria-hidden="true">
          <div className="roles-sidebar-intro roles-placeholder-stack">
            <SkeletonBlock className="roles-placeholder-title" />
            <SkeletonBlock className="skeleton-line skeleton-medium" />
            <SkeletonBlock className="roles-placeholder-period" />
          </div>
          <div className="roles-guide roles-placeholder-stack">
            <SkeletonBlock className="roles-placeholder-title" />
            {Array.from({ length: 3 }, (_, index) => <SkeletonBlock className="skeleton-field" key={index} />)}
          </div>
        </div>
      </div>
    </main>
  );
}
