import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import PixelWolf from "./hero/pixel-wolf"
import PhotoCarousel from "./hero/photo-carousel"
import { getTopUpcomingEvents, formatEventDate } from "@/data/events"
import { RECRUITMENT_URL } from "@/lib/recruitment"

export function Benefits() {
  return <section id="about" aria-label="Why join Alpha?" className="alpha-benefits">
    <span id="alpha-community" className="alpha-anchor" /><span id="vision" className="alpha-anchor" />
    <article className="alpha-benefit alpha-benefit-learn" data-theme="dark">
      <div className="alpha-benefit-copy"><h2>Learn<br /><em>cloud.</em></h2><p>Workshops. Peer learning.</p></div>
      <div className="alpha-benefit-art"><figure className="alpha-photo-frame"><Image src="/optimized/gallery/full/scd-2026-audience.webp" alt="Builders learning together at Student Community Day" fill sizes="(min-width: 800px) 48vw, 85vw" /></figure><div className="alpha-wolf-sticker alpha-wolf-learn"><PixelWolf pose="wave" /></div></div>
    </article>
    <article className="alpha-benefit alpha-benefit-build" data-theme="light">
      <div className="alpha-benefit-copy"><h2>Build real<br /><em>things.</em></h2><p>Projects. Hackathons. Events.</p></div>
      <div className="alpha-benefit-art"><figure className="alpha-photo-frame"><Image src="/optimized/gallery/full/scd-2026-certificates.webp" alt="Community builders celebrating their certificates" fill sizes="(min-width: 800px) 48vw, 85vw" /></figure><div className="alpha-wolf-sticker alpha-wolf-build"><PixelWolf pose="wink" /></div></div>
    </article>
    <article className="alpha-benefit alpha-benefit-people" data-theme="light">
      <div className="alpha-benefit-copy"><h2>Find your<br /><em>people.</em></h2><p>Grow together.</p></div>
      <div className="alpha-benefit-art"><figure className="alpha-photo-frame"><Image src="/optimized/gallery/full/scd-2026-team.webp" alt="The Student Community Day team together on stage" fill sizes="(min-width: 800px) 48vw, 85vw" /></figure><div className="alpha-wolf-sticker alpha-wolf-people"><PixelWolf pose="hello" /><PixelWolf pose="wink" /></div></div>
    </article>
  </section>
}

export function RecruitmentActions() {
  return <div className="alpha-actions">{[
    ["CORE_TEAM", "Core Team"], ["COMMITTEE", "Committee"],
  ].map(([track, name]) => <a className="alpha-button" key={track} href={`${RECRUITMENT_URL}/opportunities?track=${track}`}>Explore {name} roles <ArrowUpRight size={20} aria-hidden="true" /></a>)}</div>
}

export function CommunityProof() {
  const upcoming = getTopUpcomingEvents(2)
  return <section id="events" className="alpha-proof alpha-scene" data-theme="dark" aria-labelledby="community-heading">
    <div className="alpha-proof-top"><div><h2 id="community-heading" className="alpha-scene-heading">This could be<br />your <em>Day One.</em></h2></div><PixelWolf className="alpha-proof-wolf" /></div>
    <PhotoCarousel />
    <div className="alpha-proof-bottom"><figure className="alpha-quote"><blockquote>“I love the collaborative learning environment. The workshops are well-structured and the mentors are very approachable.”</blockquote><figcaption>David Aldreen Marquez <span>Information Technology, Rizal Technological University</span></figcaption></figure><Link className="alpha-text-link" href="/events">View all events <ArrowUpRight size={20} aria-hidden="true" /></Link></div>
    {upcoming.length > 0 && <div className="alpha-upcoming" aria-label="Upcoming events">{upcoming.map(event => <article key={event.id}><time dateTime={event.date}>{formatEventDate(event.date)}</time><h3>{event.title}</h3><a className="alpha-text-link" href={event.registrationLink || event.sourceUrl || "/events"}>View event <ArrowUpRight size={18} aria-hidden="true" /></a></article>)}</div>}
  </section>
}

export function ClosingInvitation() {
  return <section id="contact" className="alpha-closing alpha-scene" data-theme="dark" aria-labelledby="closing-heading"><PixelWolf className="alpha-closing-wolf" /><h2 id="closing-heading" className="alpha-scene-heading">Your next chapter<br /><em>starts here.</em></h2><RecruitmentActions /><a className="alpha-text-link" href="https://www.facebook.com/AWSStudentBuilderGroupAlpha">Say hello <ArrowUpRight size={18} aria-hidden="true" /></a></section>
}
