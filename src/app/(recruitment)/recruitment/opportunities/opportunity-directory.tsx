"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOpportunity, opportunities, opportunityLabel, trackLabel, type Track } from "@/recruitment/lib/catalog";
import type { Applicant } from "@/recruitment/lib/drafts";
import { Icon, Modal } from "@/app/(recruitment)/recruitment/components/ui";
import { StartDraft } from "@/app/(recruitment)/recruitment/apply/start-draft";
import { signIn } from "@/app/(recruitment)/recruitment/auth/actions";
import { useOpportunityAvailability } from "@/app/(recruitment)/recruitment/components/use-opportunity-availability";
import { availabilityLabel, sortByVacancies } from "@/recruitment/lib/opportunity-availability";
import { AccessGuard } from "@/app/(recruitment)/recruitment/components/access-guard";

type Entry = { kind: "applicant"; applicant: Applicant; hasDraft: boolean; submitted: boolean } | { kind: "anonymous" | "unconfigured" | "unavailable" | "staff" | "member" };
export function OpportunityDirectory({ entry }: { entry: Entry }) {
  const router = useRouter();
  const params = useSearchParams();
  const availability = useOpportunityAvailability();
  const [busy, setBusy] = useState(false);
  const track = params.get("track");
  const filter = ["CORE_TEAM", "COMMITTEE"].includes(track || "") ? track as Track : "ALL";
  const query = params.get("q") || "";
  const sort = params.get("sort") === "vacancies" ? "vacancies" : "any";
  const selected = getOpportunity(params.get("opportunity") || "");
  function change(key: string, value: string) {
    if (busy) return;
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push("/recruitment/opportunities" + (next.size ? "?" + next.toString() : ""), { scroll: false });
  }
  const filtered = opportunities.filter(role => (filter === "ALL" || role.track === filter) && (role.title + " " + role.department + " " + (role.specialization || "")).toLowerCase().includes(query.trim().toLowerCase()));
  const visible = sort === "vacancies" ? sortByVacancies(filtered, availability) : filtered;
  const close = () => change("opportunity", "");
  return <main id="main-content" className="roles-page">
    <div className="roles-layout">
      <aside className="roles-sidebar" aria-label="Recruitment information">
        <div className="roles-sidebar-intro">
          <h3>Beginners are welcome.</h3>
          <p>Find a team to learn and build with.</p>
          <div className="roles-period">
            <p><Icon name="calendar" size={16} />Recruitment</p>
            <strong>1–30 November 2026</strong>
            <span>Philippine time</span>
          </div>
        </div>
        <section className="roles-guide" aria-labelledby="roles-guide-heading">
          <h2 id="roles-guide-heading">How to apply</h2>
          <ol className="roles-steps">
            <li><h3>Choose your role</h3><p>Sign in with Google and review recruitment consent.</p></li>
            <li><h3>Complete your details</h3><p>Add your details, three responses, resume link, enrollment proof and available days. A portfolio is optional.</p></li>
            <li><h3>Review and submit</h3><p>Check your answers, then submit.</p></li>
          </ol>
          <p className="roles-note">One application per account. Vacancy counts can change; final decisions are made by Alpha.</p>
          <Link className="roles-privacy" href="/recruitment/privacy"><Icon name="shield" size={16} /><span>Read the privacy notice</span><Icon name="external" size={14} /></Link>
        </section>
      </aside>
      <div className="roles-results">
        <header className="roles-heading">
          <h1>Available Roles</h1>
          {entry.kind === "applicant" && (entry.hasDraft || entry.submitted) && (
            <Link href="/recruitment/application?resume=1" className="button button-secondary">
              Continue Application <Icon name="arrow" />
            </Link>
          )}
        </header>
        <div className="roles-tools">
          <form role="search" onSubmit={event => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("q");
            change("q", typeof value === "string" ? value : "");
          }}>
            <label htmlFor="role-search">Search roles</label>
            <div className="roles-search">
              <input key={query} id="role-search" name="q" type="search" defaultValue={query} maxLength={120} placeholder="Role, department, or specialization" />
              <button className="button button-orange" type="submit">Search</button>
            </div>
          </form>
          <div className="roles-sort">
            <label htmlFor="role-sort">Sort by vacancies</label>
            <select id="role-sort" value={sort} onChange={event => change("sort", event.target.value === "any" ? "" : event.target.value)}>
              <option value="any">Any</option>
              <option value="vacancies">Highest to lowest</option>
            </select>
          </div>
        </div>
        <div className="roles-results-bar">
          <div className="roles-tabs" role="group" aria-label="Filter opportunities">{(["ALL", "CORE_TEAM", "COMMITTEE"] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => change("track", value === "ALL" ? "" : value)}>{value === "ALL" ? "All roles" : trackLabel(value)}</button>)}</div>
          <div className="roles-result-status">
            <p className="roles-count" role="status">{visible.length} {visible.length === 1 ? "opportunity" : "opportunities"}{query && <> matching “{query}”</>}</p>
            {(filter !== "ALL" || query || sort !== "any") && <button className="roles-reset" type="button" onClick={() => router.replace("/recruitment/opportunities")}>Reset</button>}
          </div>
        </div>
        <div className="roles-sections" id="available-roles">{(["CORE_TEAM", "COMMITTEE"] as const).map(track => {
          const roles = visible.filter(role => role.track === track);
          if (!roles.length) return null;
          return <details className="roles-section" key={track} data-track={track} open>
            <summary>
              <h2>{trackLabel(track)}</h2>
              <span className="roles-section-meta"><span>{roles.length} {roles.length === 1 ? "opportunity" : "opportunities"}</span><span>{track === "CORE_TEAM" ? "1st–2nd year undergraduates" : "All year levels"}</span></span>
              <Icon name="chevron" size={18} />
            </summary>
            <div className="roles-grid">{roles.map(role => {
          const showDepartmentTitle = role.title === "Committee Member" && !role.specialization;
          return <article key={role.id} className="role-card-item">
            <Link className="role-card" data-track={role.track} href={"/recruitment/opportunities?" + new URLSearchParams({ ...Object.fromEntries(params), opportunity: role.id })} scroll={false} aria-label={"View role: " + opportunityLabel(role)}>
              <div className="role-card-surface">
                <div className="role-card-top">
                <div className="role-card-heading">{!showDepartmentTitle && <p className="role-department">{role.department}</p>}<h3>{role.specialization || (showDepartmentTitle ? `${role.department} Member` : role.title)}</h3></div>
                <span className="role-symbol"><Icon name={role.icon} size={22} /></span>
                </div>
              </div>
              <div className="role-card-footer"><p className="role-places">{availabilityLabel(availability, role.id)}</p><div className="role-card-action"><span>View role</span><Icon name="arrow" size={16} /></div></div>
            </Link>
          </article>
            })}</div>
          </details>;
        })}</div>
        {!visible.length && <div className="roles-empty"><h2>No matching roles</h2><p>Try a different department or search term.</p><button className="button button-secondary" type="button" onClick={() => router.replace("/recruitment/opportunities")}>Show all roles</button></div>}
      </div >
    </div >
    {
      selected && <Modal title={opportunityLabel(selected)} className={"role-entry-modal role-entry-" + selected.track.toLowerCase()} dismissible={!busy} onClose={close} headerContent={
        <div className="role-entry-identity">
          <div className="role-entry-eyebrow"><span className="role-entry-icon" aria-hidden="true"><Icon name={selected.icon} size={28} /></span><div><span className="role-track">{trackLabel(selected.track)}</span><p className="role-entry-department">{selected.department}</p><p className="role-entry-availability"><Icon name="people" size={16} />{availabilityLabel(availability, selected.id)}</p></div></div>
          <h2>{selected.specialization || selected.title}</h2>

        </div>
      }>
        <div className="role-entry-body">
          <div className="role-entry-description">
            <section className="role-entry-section"><h3>About this role</h3><p>{selected.description}</p></section>
            <section className="role-entry-section"><h3>Who can apply</h3><p>{selected.track === "CORE_TEAM" ? "Currently enrolled first- and second-year undergraduates." : "Currently enrolled students at any year or program level."}</p></section>
            <section className="role-entry-section"><h3>Before you apply</h3><ul className="role-entry-checklist">
              <li><Icon name="file" size={18} /><span>A view-only HTTPS resume link and current enrollment proof.</span></li>
              <li><Icon name="sparkles" size={18} /><span>Three short responses, up to 150 words each.</span></li>
              <li><Icon name="calendar" size={18} /><span>Your available weekdays. A portfolio is optional.</span></li>
            </ul></section>
          </div>
          <aside className="role-entry-action" aria-label="Application access">

            {entry.kind === "applicant" ? entry.submitted ? <><h3>Your application is submitted</h3><p>Follow your status and view your submitted answers.</p><Link className="button button-orange" href="/recruitment/application">View your application<Icon name="arrow" size={18} /></Link></> : entry.hasDraft ? <><h3>Continue your application</h3><p>Your draft is preserved. You can review a role change before switching.</p><Link className="button button-orange" href={"/recruitment/apply?opportunity=" + selected.id}>Continue application<Icon name="arrow" size={18} /></Link></> : <AccessGuard accountId={entry.applicant.id} expected="applicant" blockedContent={<p>Your account changed. Reload to verify access.</p>}><StartDraft key={selected.id} embedded applicant={entry.applicant} requestedOpportunity={selected.id} onBusyChange={setBusy} onCreated={() => { router.push("/recruitment/apply"); router.refresh(); }} /></AccessGuard>
              : entry.kind === "member" ? <><h3>Your Alpha membership</h3><p>Your membership workspace keeps your Alpha ID ready when you need it.</p><Link href="/recruitment/membership" className="button button-orange">Open Membership ID<Icon name="arrow" size={18} /></Link></>
                : entry.kind === "staff" ? <><h3>Staff account</h3><p>Use a separate Google account for applications.</p><Link href="/recruitment/staff" className="button button-secondary">Staff workspace<Icon name="arrow" size={18} /></Link></>
                  : entry.kind === "anonymous" ? <><h3>Apply for this role</h3><p>Sign in with Google, review consent, then start your application.</p><form action={signIn}><input type="hidden" name="destination" value="apply" /><input type="hidden" name="opportunity" value={selected.id} /><button className="button button-orange" type="submit">Continue with Google<Icon name="arrow" size={18} /></button></form><p className="role-entry-reassurance"><Icon name="shield" size={16} />No draft is created before your consent.</p><Link className="role-entry-privacy" href="/recruitment/privacy">Read the privacy notice<Icon name="external" size={14} /></Link></>
                    : <><h3>Application access unavailable</h3><p>Please reload and try again. Your saved progress is preserved.</p><button className="button button-secondary" type="button" onClick={() => router.refresh()}>Retry access<Icon name="arrow" size={18} /></button></>}
            <p className="role-entry-account-note">One application per account.</p>
          </aside>
        </div>
      </Modal>
    }
    <noscript><p>Role details and application editing need JavaScript. You can browse role titles and availability above, the <Link href="/recruitment/privacy">privacy notice</Link>, or <a href="mailto:awslc.alpha@gmail.com">contact Alpha</a>.</p></noscript>
  </main >;
}
