import Link from "next/link";
import { getOpportunity, opportunities, opportunityLabel } from "@/recruitment/lib/catalog";
import type { SubmittedApplication } from "@/recruitment/lib/applications";
import type { Draft } from "@/recruitment/lib/drafts";
import { Icon, StatusBadge } from "@/app/(recruitment)/recruitment/components/ui";

export function ApplicationSidebar({ applications, draft, selectedId, locked = false }: {
  applications: SubmittedApplication[]; draft?: Draft | null; selectedId?: string; locked?: boolean;
}) {
  const canApply = new Set(applications.map(item => item.data.opportunityId)).size < opportunities.length;
  return <aside className="applications-sidebar" aria-labelledby="applications-title">
    <div className="applications-sidebar-heading"><div><p>Your workspace</p><h2 id="applications-title">Applications <span>{applications.length}</span></h2></div><Icon name="file" size={22} /></div>
    <nav aria-label="Your applications"><ul className="applications-list">
      {draft && <li><Link href="/recruitment/apply" className="application-switcher application-draft-link" aria-disabled={locked || undefined} tabIndex={locked ? -1 : undefined}>
        <span className="application-switcher-top"><span className="application-state-draft">Draft</span><Icon name="arrow" size={16} /></span>
        <strong>{draft.opportunityId ? opportunityLabel(getOpportunity(draft.opportunityId)) : "Choose your role"}</strong><small>Continue editing</small>
      </Link></li>}
      {applications.map(item => <li key={item.id}><Link href={"/recruitment/application?application=" + item.id} className="application-switcher" aria-current={item.id === selectedId ? "page" : undefined} aria-disabled={locked || undefined} tabIndex={locked ? -1 : undefined}>
        <StatusBadge status={item.status} /><strong>{opportunityLabel(getOpportunity(item.data.opportunityId))}</strong><small>{item.reference}</small>
      </Link></li>)}
    </ul></nav>
    {!applications.length && !draft && <p className="applications-empty">Your saved applications will appear here.</p>}
    {canApply && <Link href={draft ? "/recruitment/apply" : "/recruitment/apply?entry=1"} className="button button-orange application-add" aria-disabled={locked || undefined} tabIndex={locked ? -1 : undefined}><Icon name="arrow" size={17} />{draft ? "Continue draft" : "Apply for another role"}</Link>}
    <p className="applications-sidebar-note">One application per role. Each application has its own status and updates.</p>
  </aside>;
}
