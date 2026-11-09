import {
  Hero,
  Marquee,
  About,
  CoreVision,
  Events,
  CoreMembers,
  Testimonials,
  Contact,
  Footer,
} from "@/app/(landing)"
import ServerNavigation from "@/app/(landing)/shared/server-navigation"
import Recruitment from "@/app/(landing)/recruitment/recruitment"

export default function Home() {
  return (
    <main className="min-h-screen">
      <ServerNavigation />
      <Hero />
      <Marquee />
      <Recruitment />
      <About />
      <CoreVision />
      <Events />
      <CoreMembers />
      <Contact />
      <Testimonials />
      <Footer />
    </main>
  )
}
