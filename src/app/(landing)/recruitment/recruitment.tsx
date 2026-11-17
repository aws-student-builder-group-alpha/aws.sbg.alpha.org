import { ArrowUpRight } from "lucide-react"
import { PixelCloud } from "../hero/pixel-elements"
import { RECRUITMENT_URL } from "@/lib/recruitment"

const TRACKS = [
  { name: "Core Team", track: "CORE_TEAM", description: "Lead a team. Shape the chapter.", eligibility: "Enrolled first-/second-year undergraduates." },
  { name: "Committee", track: "COMMITTEE", description: "Build projects. Make events happen.", eligibility: "All enrolled students." },
]

export default function Recruitment() {
  return <section id="recruitment" className="alpha-roles alpha-scene" data-theme="light" aria-labelledby="recruitment-heading">
    <div className="alpha-roles-heading"><h2 id="recruitment-heading" className="alpha-scene-heading">Build Alpha<br /><em>with us.</em></h2><p>Beginners welcome.</p></div>
    <div className="alpha-role-panels">{TRACKS.map(({ name, track, description, eligibility }, index) => <article className="alpha-role-panel" key={track}><div className="alpha-role-mark" aria-hidden="true"><span>0{index + 1}</span><PixelCloud /></div><h3>{name}</h3><p>{description}</p><p className="alpha-eligibility">{eligibility}</p><a className="alpha-button" href={`${RECRUITMENT_URL}/opportunities?track=${track}`}>Explore {name} roles <ArrowUpRight size={20} aria-hidden="true" /></a></article>)}</div>
  </section>
}
