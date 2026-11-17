import SceneTransition from "@/app/(main)/(landing)/scene-transition"
import JourneyWolf from "@/app/(main)/(landing)/journey-wolf"
import LandingMotion from "@/app/(main)/(landing)/landing-motion"
import CoreMembers from "@/app/(main)/(landing)/team/core-members"
import Footer from "@/app/(main)/(landing)/shared/footer"
import ServerNavigation from "@/app/(main)/(landing)/shared/server-navigation"
import OpeningSequence from "@/app/(main)/(landing)/hero/opening-sequence"
import Recruitment from "@/app/(main)/(landing)/recruitment/recruitment"
import { Benefits, CommunityProof, ClosingInvitation, MotionRibbon } from "@/app/(main)/(landing)/story"
import "@/app/(main)/(landing)/hero/hero.css"
import "@/app/(main)/(landing)/landing.css"
import CommunityDock from "@/components/community-dock"

export default function Home() {
  return (
    <main className="alpha-landing">
      <ServerNavigation />
      <JourneyWolf />
      <CommunityDock />
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
