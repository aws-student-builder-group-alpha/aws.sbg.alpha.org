import SceneTransition from "@/app/(landing)/scene-transition"
import JourneyWolf from "@/app/(landing)/journey-wolf"
import LandingMotion from "@/app/(landing)/landing-motion"
import CoreMembers from "@/app/(landing)/team/core-members"
import Footer from "@/app/(landing)/shared/footer"
import ServerNavigation from "@/app/(landing)/shared/server-navigation"
import OpeningSequence from "@/app/(landing)/hero/opening-sequence"
import Recruitment from "@/app/(landing)/recruitment/recruitment"
import { Benefits, CommunityProof, ClosingInvitation, MotionRibbon } from "@/app/(landing)/story"
import "@/app/(landing)/hero/hero.css"
import "@/app/(landing)/landing.css"
import { ArrowUpRight } from "lucide-react"
import { RECRUITMENT_URL } from "@/lib/recruitment"

export default function Home() {
  return (
    <main className="alpha-landing">
      <ServerNavigation />
      <JourneyWolf />
      <a href={RECRUITMENT_URL + "/opportunities"} className="alpha-opening-start alpha-community-invitation"><span>Be a Part of Our Community</span><ArrowUpRight size={22} aria-hidden="true" /></a>
      <OpeningSequence />
      <LandingMotion>
      <MotionRibbon />
      <Benefits />
      <SceneTransition from="#c7adff" to="#fff8ed" />
      <Recruitment />
      <SceneTransition from="#fff8ed" to="#202023" />
      <CommunityProof />
      <SceneTransition from="#202023" to="#2c2336" />
      <CoreMembers />
      <SceneTransition from="#2c2336" to="#211c28" />
      <div className="alpha-finale"><ClosingInvitation /><Footer compact /></div>
      </LandingMotion>
    </main>
  )
}
