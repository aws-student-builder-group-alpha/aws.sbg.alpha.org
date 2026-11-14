"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOpportunity, opportunities, opportunityLabel, trackLabel, type Track } from "@/lib/catalog";
import type { Applicant } from "@/lib/drafts";
import { Icon, Modal } from "@/app/components/ui";
import { StartDraft } from "@/app/apply/start-draft";
import { signIn } from "@/app/auth/actions";
import { useOpportunityAvailability } from "@/app/components/use-opportunity-availability";
import { availabilityLabel } from "@/lib/opportunity-availability";
import { AccessGuard } from "@/app/components/access-guard";

type Entry = { kind: "applicant"; applicant: Applicant; hasDraft: boolean; submitted: boolean } | { kind: "anonymous" | "unconfigured" | "unavailable" | "staff" | "member" };
export function OpportunityDirectory({ entry }: { entry: Entry }) {
 const router = useRouter();
 const params = useSearchParams();
 const availability = useOpportunityAvailability();
 const [busy, setBusy] = useState(false);
 const track = params.get("track");
 const filter = ["CORE_TEAM","COMMITTEE","MEMBER"].includes(track || "") ? track as Track : "ALL";
 const query = params.get("q") || "";
 const selected = getOpportunity(params.get("opportunity") || "");
 function change(key: string, value: string) {
  if (busy) return;
  const next = new URLSearchParams(params.toString());
  if (value) next.set(key,value); else next.delete(key);
  router.push("/opportunities" + (next.size ? "?" + next.toString() : ""), { scroll: false });
 }
 const visible = opportunities.filter(role => (filter === "ALL" || role.track === filter) && (role.title + " " + role.department + " " + (role.specialization || "")).toLowerCase().includes(query.trim().toLowerCase()));
 const close = () => change("opportunity","");
 return <main id="main-content" className="roles-page">
  <header className="roles-heading"><div><p className="roles-kicker">Your place at Alpha</p><h1>Available Roles</h1><p>Beginners are welcome. Find a team to build with, or join our learning community.</p></div>{entry.kind === "applicant" && !entry.hasDraft && !entry.submitted ? <a href="#available-roles" className="button button-secondary">Choose a role to apply <Icon name="arrow" /></a> : <Link href={entry.kind === "member" ? "/membership" : entry.kind === "staff" ? "/staff" : "/application?resume=1"} className="button button-secondary">{entry.kind === "member" ? "Membership ID" : entry.kind === "staff" ? "Staff workspace" : entry.kind === "applicant" && entry.submitted ? "View your application" : "Continue application"} <Icon name="arrow" /></Link>}</header>
  <div className="roles-tools"><form role="search" onSubmit={event => { event.preventDefault(); const value = new FormData(event.currentTarget).get("q"); change("q", typeof value === "string" ? value : ""); }}><label htmlFor="role-search">Search roles</label><div className="roles-search"><input key={query} id="role-search" name="q" type="search" defaultValue={query} maxLength={120} placeholder="Role, department, or specialization" /><button className="button button-orange" type="submit">Search</button></div></form>
   <div className="roles-tabs" role="group" aria-label="Filter opportunities">{(["ALL","CORE_TEAM","COMMITTEE","MEMBER"] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => change("track",value === "ALL" ? "" : value)}>{value === "ALL" ? "All roles" : trackLabel(value)}</button>)}</div>
  </div>
  <p className="roles-count" role="status">{visible.length} {visible.length === 1 ? "opportunity" : "opportunities"}{query && <> matching “{query}”</>}</p>
  <div className="roles-grid" id="available-roles">{visible.map(role => <article key={role.id} className="role-card-item">
   <Link className="role-card" data-track={role.track} href={"/opportunities?" + new URLSearchParams({ ...Object.fromEntries(params), opportunity: role.id })} scroll={false} aria-label={"View role: " + opportunityLabel(role)}>
    <div className="role-card-top"><span className="role-track">{trackLabel(role.track)}</span><span className="role-symbol"><Icon name={role.icon} size={28} /></span></div>
    <div className="role-card-heading"><p className="role-department">{role.department}</p><h2>{role.specialization || role.title}</h2></div>
    <div className="role-card-footer"><p className="role-places">{availabilityLabel(availability,role.id)}</p><div className="role-card-action"><span>View role</span><span className="role-open-arrow" aria-hidden="true"><Icon name="arrow" size={21} /></span></div></div>
   </Link>
  </article>)}</div>
  {!visible.length && <div className="roles-empty"><h2>No matching roles</h2><p>Try a different department or search term.</p><button className="button button-secondary" type="button" onClick={() => router.replace("/opportunities")}>Show all roles</button></div>}
  <p className="roles-note">Recruitment: 1–30 November 2026, Philippine time. One application per account. Vacancy counts can change; final decisions are made by Alpha.</p>
  <details className="roles-help" id="faq"><summary>How to apply</summary><p>Choose one role, sign in with Google, and consent to recruitment processing. Complete your details, role choice, three short responses, resume link, enrollment proof, and available days. Review before submitting. A portfolio is optional.</p><Link href="/privacy">Read the privacy notice</Link></details>
  {selected && <Modal title={opportunityLabel(selected)} className={"role-entry-modal role-entry-" + selected.track.toLowerCase()} dismissible={!busy} onClose={close} headerContent={
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

     {entry.kind === "applicant" ? entry.submitted ? <><h3>Your application is submitted</h3><p>Follow your status and view your submitted answers.</p><Link className="button button-orange" href="/application">View your application<Icon name="arrow" size={18} /></Link></> : entry.hasDraft ? <><h3>Continue your application</h3><p>Your draft is preserved. You can review a role change before switching.</p><Link className="button button-orange" href={"/apply?opportunity="+selected.id}>Continue application<Icon name="arrow" size={18} /></Link></> : <AccessGuard accountId={entry.applicant.id} expected="applicant" blockedContent={<p>Your account changed. Reload to verify access.</p>}><StartDraft key={selected.id} embedded applicant={entry.applicant} requestedOpportunity={selected.id} onBusyChange={setBusy} onCreated={() => { router.push("/apply"); router.refresh(); }} /></AccessGuard>
      : entry.kind === "member" ? <><h3>Your Alpha membership</h3><p>Your membership workspace keeps your Alpha ID ready when you need it.</p><Link href="/membership" className="button button-orange">Open Membership ID<Icon name="arrow" size={18} /></Link></>
      : entry.kind === "staff" ? <><h3>Staff account</h3><p>Use a separate Google account for applications.</p><Link href="/staff" className="button button-secondary">Staff workspace<Icon name="arrow" size={18} /></Link></>
      : entry.kind === "anonymous" ? <><h3>Apply for this role</h3><p>Sign in with Google, review consent, then start your application.</p><form action={signIn}><input type="hidden" name="destination" value="apply" /><input type="hidden" name="opportunity" value={selected.id} /><button className="button button-orange" type="submit">Continue with Google<Icon name="arrow" size={18} /></button></form><p className="role-entry-reassurance"><Icon name="shield" size={16} />No draft is created before your consent.</p><Link className="role-entry-privacy" href="/privacy">Read the privacy notice<Icon name="external" size={14} /></Link></>
      : <><h3>Application access unavailable</h3><p>Please reload and try again. Your saved progress is preserved.</p><button className="button button-secondary" type="button" onClick={() => router.refresh()}>Retry access<Icon name="arrow" size={18} /></button></>}
     <p className="role-entry-account-note">One application per account.</p>
    </aside>
   </div>
  </Modal>}
  <noscript><p>Role details and application editing need JavaScript. You can browse role titles and availability above, the <Link href="/privacy">privacy notice</Link>, or <a href="mailto:awslc.alpha@gmail.com">contact Alpha</a>.</p></noscript>
 </main>;
}
