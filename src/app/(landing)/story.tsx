import { Fragment } from "react"
import SceneTransition from "./scene-transition"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import KineticType from "./kinetic-type"
import PixelWolf from "./hero/pixel-wolf"
import PhotoCarousel from "./hero/photo-carousel"
import { getTopUpcomingEvents, formatEventDate } from "@/data/events"
import { RECRUITMENT_URL } from "@/lib/recruitment"
import CloudLab from "./cloud-lab"

export function MotionRibbon() {
  return <div className="alpha-motion-ribbon" aria-hidden="true"><svg viewBox="0 0 1600 220" fill="none"><defs><path id="alpha-ribbon-curve" d="M-600 110C-200 10 100 210 500 110S1200 10 1600 110S2300 210 2700 110" /></defs><use href="#alpha-ribbon-curve" stroke="#ffb13e" strokeWidth="116" /><text fill="#211c28"><textPath href="#alpha-ribbon-curve" startOffset="-8%">LEARN + BUILD + BELONG + LEARN + BUILD + BELONG + LEARN + BUILD + BELONG + </textPath></text></svg></div>
}

export function Benefits() {
  const scenes = [
    { style: "learn", first: "Learn", last: "cloud.", copy: "Workshops. Peer learning.", image: "scd-2026-audience", alt: "Builders learning together at Student Community Day", extra: "scd-2026-certificates", pose: "wave" as const },
    { style: "build", first: "Build real", last: "things.", copy: "Projects. Hackathons. Events.", image: "scd-2026-certificates", alt: "Community builders celebrating their certificates", extra: "scd-2026-team", pose: "wink" as const },
    { style: "people", first: "Find your", last: "people.", copy: "Grow together.", image: "scd-2026-team", alt: "The Student Community Day team together on stage", extra: "scd-2026-audience", pose: "hello" as const },
  ]
  return <section id="about" aria-label="Why join Alpha?" className="alpha-benefits">
    <span id="alpha-community" className="alpha-anchor" /><span id="vision" className="alpha-anchor" />
    {scenes.map((scene, index) => <Fragment key={scene.style}>{index > 0 && <SceneTransition from={index === 1 ? "#111015" : "#fff0cc"} to={index === 1 ? "#fff0cc" : "#c7adff"} />}<article className={`alpha-benefit alpha-benefit-${scene.style}`} data-theme={index === 0 ? "dark" : "light"}>
      <div className="alpha-benefit-copy"><h2 aria-label={`${scene.first} ${scene.last}`}><KineticType text={scene.first} /><em><KineticType text={scene.last} /></em></h2><p>{scene.copy}</p></div>
      <div className="alpha-benefit-art">
        {scene.style === "learn" ? <CloudLab /> : <figure className="alpha-photo-frame"><Image src={`/optimized/gallery/full/${scene.image}.webp`} alt={scene.alt} fill sizes="(min-width: 800px) 42vw, 80vw" /></figure>}
        <div className={`alpha-wolf-sticker alpha-wolf-${scene.style}`} data-wolf-stop={scene.style}><PixelWolf pose={scene.pose} /></div>
        {scene.style !== "learn" && <><figure className="alpha-scene-snapshot" aria-hidden="true"><Image src={`/optimized/gallery/full/${scene.extra}.webp`} alt="" fill sizes="(min-width: 800px) 18vw, 28vw" /></figure><span className="alpha-scene-stamp" aria-hidden="true">0{index + 1} / ALPHA</span></>}
      </div>
    </article></Fragment>)}
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
    <div className="alpha-proof-top"><div><h2 id="community-heading" className="alpha-scene-heading" aria-label="This could be your Day One."><KineticType text="This could" />{" "}<KineticType text="be" /><br />your <em><KineticType text="Day One." /></em></h2></div><span className="alpha-proof-wolf" data-wolf-stop="community"><PixelWolf /></span></div>
    <PhotoCarousel />
    <div className="alpha-proof-bottom"><figure className="alpha-quote"><blockquote>“I love the collaborative learning environment. The workshops are well-structured and the mentors are very approachable.”</blockquote><figcaption>David Aldreen Marquez <span>Information Technology, Rizal Technological University</span></figcaption></figure><Link className="alpha-text-link" href="/events">View all events <ArrowUpRight size={20} aria-hidden="true" /></Link></div>
    {upcoming.length > 0 && <div className="alpha-upcoming" aria-label="Upcoming events">{upcoming.map(event => <article key={event.id}><time dateTime={event.date}>{formatEventDate(event.date)}</time><h3>{event.title}</h3><a className="alpha-text-link" href={event.registrationLink || event.sourceUrl || "/events"}>View event <ArrowUpRight size={18} aria-hidden="true" /></a></article>)}</div>}
  </section>
}

export function ClosingInvitation() {
  return <section id="contact" className="alpha-closing alpha-scene" data-theme="dark" aria-labelledby="closing-heading"><div className="alpha-closing-pack" aria-hidden="true"><span className="alpha-closing-wolf" data-wolf-stop="closing"><PixelWolf pose="wave" /></span><PixelWolf className="alpha-closing-friend" pose="wink" /></div><h2 id="closing-heading" className="alpha-scene-heading" aria-label="Your next chapter starts here."><KineticType text="Your next" />{" "}<KineticType text="chapter" /><br /><em><KineticType text="starts here." /></em></h2><RecruitmentActions /><a className="alpha-text-link" href="https://www.facebook.com/AWSStudentBuilderGroupAlpha">Say hello <ArrowUpRight size={18} aria-hidden="true" /></a></section>
}
