import Link from 'next/link'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import Footer from '@/app/(landing)/shared/footer'
import ServerNavigation from '@/app/(landing)/shared/server-navigation'
import CommunityGallery from '@/components/community-gallery'
import { getCommunityStories } from '@/data/community-stories'

export default function EventsPage() {
  return <main className="min-h-screen bg-[#faf8f4] text-[#232f3e]">
    <ServerNavigation />
    <header className="px-5 pb-14 pt-36 sm:px-8 lg:px-16 lg:pb-20 lg:pt-44">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="mb-10 inline-flex min-h-11 items-center gap-2 text-sm text-[#526174] hover:text-[#965500]"><ArrowLeft size={16} />Back to Alpha</Link>
        <p className="mb-5 text-xs font-semibold uppercase tracking-[.2em] text-[#965500]">The Alpha community</p>
        <h1 className="max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">Built together.<br /><span className="urban-starblues inline-block pb-3 pt-2 font-normal text-[#965500]">Made to remember.</span></h1>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-6"><p className="max-w-xl text-base leading-relaxed text-[#526174]">The events we help build. The people who go further. Explore Alpha’s chapter events, partnerships, member wins and learning opportunities.</p><a href="https://www.facebook.com/AWSStudentBuilderGroupAlpha" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-[#965500] underline underline-offset-4">Follow Alpha<ArrowUpRight size={16} /><span className="sr-only"> (opens in a new tab)</span></a></div>
      </div>
    </header>
    <section className="px-5 pb-24 sm:px-8 lg:px-16" aria-label="Alpha community gallery"><div className="mx-auto max-w-6xl"><CommunityGallery stories={getCommunityStories()} presentation="showcase" initialView="list" filterable /></div></section>
    <Footer />
  </main>
}
