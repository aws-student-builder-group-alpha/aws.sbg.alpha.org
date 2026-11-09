'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import DepthSurface from '@/components/depth-surface'
import '@/components/community-gallery.css'
import './recruitment.css'
import { ArrowRight, Sparkles, Users } from 'lucide-react'
import { RECRUITMENT_URL } from '@/lib/recruitment'

const TRACKS = [
	{
		name: 'Core Team',
		label: 'Lead with purpose',
		eligibility: '1st and 2nd year undergraduates',
		description:
			'Help shape the chapter. Coordinate a department, support your team, and turn shared ideas into action.',
		icon: Sparkles,
	},
	{
		name: 'Committee',
		label: 'Learn by contributing',
		eligibility: 'All enrolled university year levels',
		description:
			'Find your people in events, creative work, partnerships, or technical projects. Bring your curiosity and grow with a team.',
		icon: Users,
	},
]

gsap.registerPlugin(ScrollTrigger)

export default function Recruitment() {
  const section = useRef<HTMLElement>(null)
  useEffect(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {gsap.fromTo('.recruitment-reveal',{y:40,opacity:0},{y:0,opacity:1,duration:.8,stagger:.12,ease:'power3.out',scrollTrigger:{trigger:section.current,start:'top 85%',toggleActions:'play none none reverse'}})},section)
      return () => context.revert()
    })
    return () => media.revert()
  }, [])
	return (
		<section
			id='recruitment'
            ref={section}
			aria-labelledby='recruitment-heading'
			className='scroll-mt-24 bg-[#fff8ed] px-5 py-20 text-[#172636] sm:px-8 lg:px-16 lg:py-28'
		>
			<div className='mx-auto max-w-6xl'>
				<div className='recruitment-reveal mb-10 grid gap-6 lg:grid-cols-2 lg:items-end'>
					<div>
						<p className='mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#875000]'>
							Your next chapter
						</p>
						<h2
							id='recruitment-heading'
							className='text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl'
						>
							Build what comes next.
						</h2>
					</div>
					<p className='max-w-md text-base leading-relaxed text-[#526174] lg:justify-self-end'>
						There is more than one way to be part of Alpha.
						Explore the opportunities, see who can apply, and
						get ready before starting your application.
					</p>
				</div>
				<div className='grid gap-5 md:grid-cols-2'>
					{TRACKS.map(({ name, label, eligibility, description, icon: Icon }, index) => (
						<article
							key={name}
							className='recruitment-reveal'
						>
							<DepthSurface className='alpha-track-card'>
                            <span className='track-card-index' aria-hidden='true'>{String(index+1).padStart(2,'0')}</span>
                            <div className='mb-8 flex items-center justify-between gap-4'>
								<p className='text-xs font-semibold uppercase tracking-wider text-[#c1cbd8]'>
									{label}
								</p>
								<span className='track-card-crest'><Icon size={28} aria-hidden='true' /></span>
							</div>
							<h3 className='mb-3 text-3xl font-semibold tracking-tight'>{name}</h3>
							<p className='mb-5 text-sm font-medium'>{eligibility}</p>
							<p className='mb-8 flex-1 text-base leading-relaxed text-[#c1cbd8]'>
								{description}
							</p>
							<a
								href={`${RECRUITMENT_URL}/#opportunities`}
								className='inline-flex min-h-11 items-center justify-between gap-3 border-t border-[#657489] pt-5 font-semibold transition-colors hover:text-[#ffc56e] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#875000]'
							>
								Explore {name}
								<ArrowRight size={20} aria-hidden='true' />
							</a>
                            </DepthSurface>
						</article>
					))}
				</div>
				<div className='mt-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center'>
					<p className='text-sm leading-relaxed text-[#526174]'>
						New to this? Beginners are welcome.
						<br />
						Check the portal for current dates and requirements.
					</p>
					<a
						href={RECRUITMENT_URL}
						className='inline-flex min-h-12 items-center gap-4 rounded-md bg-[#ff9900] px-6 py-3 font-semibold text-[#172636] transition-colors hover:bg-[#ffad33] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#875000]'
					>
						Explore recruitment
						<ArrowRight size={18} aria-hidden='true' />
					</a>
				</div>
			</div>
		</section>
	)
}
