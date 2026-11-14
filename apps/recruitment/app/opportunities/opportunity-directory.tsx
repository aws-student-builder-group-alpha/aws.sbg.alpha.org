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
  <div className="roles-grid" id="available-roles">{visible.map(role => <article key={role.id} className="role-card">
   <div className="role-card-top"><span className="role-symbol"><Icon name={role.icon} size={26} /></span><span className="role-track">{trackLabel(role.track)}</span></div>
   <p className="role-department">{role.department}</p><h2>{role.specialization || role.title}</h2><p className="role-description">{role.description}</p>
   <p className="role-places">{availabilityLabel(availability,role.id)}</p>
   <Link className="role-details" href={"/opportunities?" + new URLSearchParams({ ...Object.fromEntries(params), opportunity: role.id })} scroll={false}>View role <Icon name="arrow" size={18} /></Link>
  </article>)}</div>
  {!visible.length && <div className="roles-empty"><h2>No matching roles</h2><p>Try a different department or search term.</p><button className="button button-secondary" type="button" onClick={() => router.replace("/opportunities")}>Show all roles</button></div>}
  <p className="roles-note">Recruitment: 1–30 November 2026, Philippine time. One application per account. Vacancy counts can change; final decisions are made by Alpha.</p>
  <details className="roles-help" id="faq"><summary>How to apply</summary><p>Choose one role, sign in with Google, and consent to recruitment processing. Complete your details, role choice, three short responses, resume link, enrollment proof, and available days. Review before submitting. A portfolio is optional.</p><Link href="/privacy">Read the privacy notice</Link></details>
  {selected && <Modal title={opportunityLabel(selected)} className="role-entry-modal" dismissible={!busy} onClose={close}>
   <div className="role-entry-body"><div className="role-entry-description"><span className="role-track">{trackLabel(selected.track)}</span><h3>Build with Alpha.</h3><p>{selected.description}</p><h4>Who can apply</h4><p>{selected.track === "CORE_TEAM" ? "Currently enrolled first- and second-year undergraduates." : "Currently enrolled students at any year or program level."}</p><p className="role-places">{availabilityLabel(availability, selected.id)}</p><p>Have a view-only HTTPS resume link and current enrollment proof ready. Portfolio is optional. Three responses, up to 150 words each.</p></div>
   <div className="role-entry-action">
    {entry.kind === "applicant" ? entry.submitted ? <><h3>Your application is submitted</h3><Link className="button button-orange" href="/application">View your application</Link></> : entry.hasDraft ? <><h3>Continue your saved application</h3><p>Your draft is preserved. You can review a role change before switching.</p><Link className="button button-orange" href={"/apply?opportunity="+selected.id}>Continue application</Link></> : <AccessGuard accountId={entry.applicant.id} expected="applicant" blockedContent={<p>Your account changed. Reload to verify access.</p>}><StartDraft embedded applicant={entry.applicant} requestedOpportunity={selected.id} onBusyChange={setBusy} onCreated={() => { router.push("/apply"); router.refresh(); }} /></AccessGuard>
     : entry.kind === "member" ? <><h3>Your membership</h3><Link href="/membership" className="button button-orange">Open Membership ID</Link></>
     : entry.kind === "staff" ? <><h3>Staff account</h3><p>Use a separate Google account for applications.</p><Link href="/staff" className="button button-secondary">Staff workspace</Link></>
     : entry.kind === "anonymous" ? <><h3>Your next chapter starts here.</h3><p>Continue with Google. You will review processing consent before a draft is created.</p><form action={signIn}><input type="hidden" name="destination" value="apply" /><input type="hidden" name="opportunity" value={selected.id} /><button className="button button-orange" type="submit">Continue with Google</button></form><Link href="/privacy">Privacy notice</Link></>
     : <><h3>Application access is temporarily unavailable</h3><p>Please reload and try again. Your saved progress is preserved.</p><button className="button button-secondary" type="button" onClick={() => router.refresh()}>Retry access</button></>}
   </div></div>
  </Modal>}
  <noscript><p>Role details and application editing need JavaScript. You can read role descriptions above, the <Link href="/privacy">privacy notice</Link>, or <a href="mailto:awslc.alpha@gmail.com">contact Alpha</a>.</p></noscript>
 </main>;
}
