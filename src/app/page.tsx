import LandingMotion from "@/app/(landing)/landing-motion"
import CoreMembers from "@/app/(landing)/team/core-members"
import Footer from "@/app/(landing)/shared/footer"
import ServerNavigation from "@/app/(landing)/shared/server-navigation"
import OpeningSequence from "@/app/(landing)/hero/opening-sequence"
import Recruitment from "@/app/(landing)/recruitment/recruitment"
import { Benefits, CommunityProof, ClosingInvitation, MotionRibbon } from "@/app/(landing)/story"
import "@/app/(landing)/hero/hero.css"
import "@/app/(landing)/landing.css"

export default function Home() {
  return (
    <main className="alpha-landing">
      <ServerNavigation />
      <OpeningSequence />
      <LandingMotion>
      <MotionRibbon />
      <Benefits />
      <Recruitment />
      <CommunityProof />
      <CoreMembers />
      <div className="alpha-finale"><ClosingInvitation /><Footer compact /></div>
      </LandingMotion>
    </main>
  )
}
