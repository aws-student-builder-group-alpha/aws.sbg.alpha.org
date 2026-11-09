'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
	BookOpen,
	ChevronRight,
	Cloud,
	Code,
	Cpu,
	Gamepad2,
	LayoutDashboard,
	Palette,
	Shield,
	Wifi,
} from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@/lib/utils'
import Navigation from '@/app/(landing)/shared/navigation'
import Footer from '@/app/(landing)/shared/footer'

const TRACKS = [
	{
		icon: Cloud,
		name: 'Cloud Computing',
		description:
			'Core AWS services, architecture, and cloud fundamentals.',
		gradient: 'from-sky-800 to-blue-500',
		iconBg: 'bg-sky-500/20',
	},
	{
		icon: Cpu,
		name: 'AI / Machine Learning',
		description:
			'Machine learning foundations and AWS AI services.',
		gradient: 'from-violet-900 to-purple-500',
		iconBg: 'bg-violet-500/20',
	},
	{
		icon: Shield,
		name: 'Cybersecurity',
		description:
			'Security best practices, IAM, and threat detection.',
		gradient: 'from-rose-900 to-red-500',
		iconBg: 'bg-rose-500/20',
	},
	{
		icon: LayoutDashboard,
		name: 'Data Science',
		description:
			'Data analytics, visualization, and AWS data tools.',
		gradient: 'from-emerald-800 to-teal-500',
		iconBg: 'bg-emerald-500/20',
	},
	{
		icon: Code,
		name: 'Software Engineering',
		description:
			'DevOps, CI/CD, serverless, and app development.',
		gradient: 'from-indigo-900 to-blue-500',
		iconBg: 'bg-indigo-500/20',
	},
	{
		icon: Wifi,
		name: 'IoT',
		description:
			'Internet of Things with AWS IoT Core and Greengrass.',
		gradient: 'from-amber-800 to-amber-400',
		iconBg: 'bg-amber-500/20',
	},
	{
		icon: Gamepad2,
		name: 'Game Development',
		description:
			'Game backends, real-time services, and GameLift.',
		gradient: 'from-rose-800 to-pink-400',
		iconBg: 'bg-pink-500/20',
	},
	{
		icon: Palette,
		name: 'UI / UX Design',
		description:
			'Design thinking, prototyping, and AWS Amplify Studio.',
		gradient: 'from-yellow-700 to-amber-400',
		iconBg: 'bg-yellow-500/20',
	},
]

interface SkillbuilderLandingProps {
	isSignedIn: boolean
}

export default function SkillbuilderLanding({
	isSignedIn,
}: SkillbuilderLandingProps) {
	const heroRef = useRef<HTMLElement>(null)
	const bgRef = useRef<HTMLDivElement>(null)
	const tracksRef = useRef<HTMLDivElement>(null)
	const ctaSectionRef = useRef<HTMLElement>(null)

	useEffect(() => {
		gsap.registerPlugin(ScrollTrigger)
	}, [])

	// Hero entry animation
	useEffect(() => {
		if (!heroRef.current) return
		const el = heroRef.current
		const targets = [
			el.querySelector('[data-hero-badge]'),
			el.querySelector('[data-hero-title]'),
			el.querySelector('[data-hero-subtitle]'),
			el.querySelector('[data-hero-cta]'),
			...Array.from(
				el.querySelectorAll('[data-hero-feature]'),
			),
		].filter(Boolean)

		if (targets.length === 0) return
		gsap.set(targets, { opacity: 0, y: 30 })

		const LOADER_MS = 2300
		const elapsedMs = performance.now()
		const delayS = Math.max(
			0,
			(LOADER_MS - elapsedMs) / 1000,
		)

		const tl = gsap.timeline({
			delay: delayS,
			defaults: { ease: 'power3.out' },
		}).to(targets, {
			opacity: 1,
			y: 0,
			duration: 0.8,
			stagger: 0.12,
		})

		// Mobile fallback
		const fb = setTimeout(() => {
			gsap.set(targets, { clearProps: 'all' })
		}, 6000)

		return () => {
			tl.kill()
			clearTimeout(fb)
		}
	}, [])

	// Parallax on hero background image
	useEffect(() => {
		if (!bgRef.current || !heroRef.current) return

		const trigger = ScrollTrigger.create({
			trigger: heroRef.current,
			start: 'top top',
			end: 'bottom top',
			scrub: 1.5,
			onUpdate: (self) => {
				if (!bgRef.current) return
				gsap.set(bgRef.current, {
					y: self.progress * 120,
					scale: 1 + self.progress * 0.08,
				})
			},
		})

		return () => {
			trigger.kill()
		}
	}, [])

	// Track cards scroll reveal
	useEffect(() => {
		if (!tracksRef.current) return
		const cards = Array.from(
			tracksRef.current.querySelectorAll(
				'[data-track-card]',
			),
		)
		if (cards.length === 0) return

		gsap.set(cards, { opacity: 0, y: 40, scale: 0.95 })
		const triggers = ScrollTrigger.batch(cards, {
			onEnter: (elements) => {
				gsap.to(elements, {
					opacity: 1,
					y: 0,
					scale: 1,
					duration: 0.6,
					stagger: 0.07,
					ease: 'power3.out',
				})
			},
			start: 'top 90%',
			once: true,
		})

		return () => {
			triggers.forEach((trigger) => trigger.kill())
		}
	}, [])

	// Bottom CTA section reveal
	useEffect(() => {
		if (!ctaSectionRef.current) return

		const el = ctaSectionRef.current
		gsap.set(el, { opacity: 0, y: 40 })

		const trigger = ScrollTrigger.create({
			trigger: el,
			start: 'top 85%',
			once: true,
			onEnter: () => {
				gsap.to(el, {
					opacity: 1,
					y: 0,
					duration: 0.8,
					ease: 'power3.out',
				})
			},
		})

		return () => {
			trigger.kill()
		}
	}, [])

	const loginHref =
		'/auth/login?next='
		+ encodeURIComponent('/skillbuilder/dashboard')

	return (
		<>
			<Navigation />
			<main className='min-h-screen bg-[#08090a]'>
				{/* ── Hero ── */}
				<section
					ref={heroRef}
					data-theme='dark'
					className='relative min-h-[100svh] flex items-center overflow-hidden'
				>
					{/* Background image with overlay */}
					<div
						ref={bgRef}
						className='absolute inset-0 will-change-transform'
					>
						<Image
							src='/skillbuilder-hero-bg.jpg'
							alt=''
							fill
							priority
							className='object-cover object-center'
							sizes='100vw'
						/>
						{/* Dark gradient overlay */}
						<div
							className={cn(
								'absolute inset-0',
								'bg-gradient-to-b',
								'from-[#08090a]/80',
								'via-[#08090a]/50',
								'to-[#08090a]',
							)}
						/>
						{/* Radial vignette */}
						<div
							className='absolute inset-0'
							style={{
								background:
									'radial-gradient('
									+ 'ellipse at 50% 40%,'
									+ ' transparent 30%,'
									+ ' rgba(8,9,10,0.7) 100%'
									+ ')',
							}}
						/>
					</div>

					{/* Floating glow accents */}
					<div
						className={cn(
							'absolute top-1/4 left-1/4',
							'w-[500px] h-[500px]',
							'rounded-full',
							'bg-[#ff9900]/8 blur-[120px]',
							'pointer-events-none',
						)}
					/>
					<div
						className={cn(
							'absolute bottom-1/3 right-1/4',
							'w-[400px] h-[400px]',
							'rounded-full',
							'bg-blue-500/6 blur-[100px]',
							'pointer-events-none',
						)}
					/>

					{/* Content */}
					<div
						className={cn(
							'relative z-10 w-full',
							'pt-32 sm:pt-36 pb-16',
							'px-5 sm:px-8 lg:px-16',
						)}
					>
						<div className='container mx-auto max-w-5xl text-center'>
							{/* Badge */}
							<div data-hero-badge className='mb-6'>
								<span
									className={cn(
										'inline-flex items-center gap-2',
										'rounded-full',
										'border border-[#ff9900]/30',
										'bg-[#ff9900]/10',
										'px-4 py-1.5',
										'text-[10px] sm:text-xs',
										'uppercase tracking-[0.2em]',
										'text-[#ff9900] font-semibold',
									)}
								>
									<span
										className={cn(
											'w-1.5 h-1.5',
											'rounded-full bg-[#ff9900]',
											'animate-pulse',
										)}
									/>
									AWS Student Builder Group - Alpha Program
								</span>
							</div>

							{/* Title */}
							<h1
								data-hero-title
								className={cn(
									'text-5xl sm:text-6xl lg:text-7xl',
									'font-bold text-white',
									'tracking-tight leading-[1.05]',
								)}
								style={{
									textShadow:
										'0 4px 40px rgba(0,0,0,0.5)',
								}}
							>
								Skill
								<span className='text-[#ff9900]'>
									builder
								</span>
							</h1>

							{/* Subtitle */}
							<p
								data-hero-subtitle
								className={cn(
									'mt-6 text-base sm:text-lg',
									'text-white/60 max-w-2xl mx-auto',
									'leading-relaxed',
								)}
							>
								A structured learning roadmap built
								by the{' '}
								<strong
									className={cn(
										'text-white font-semibold',
									)}
								>
									AWS Student Builder Group - Alpha at RTU
								</strong>
								. Organize your cloud journey across
								8 department tracks with hands-on
								modules and progress tracking.
							</p>

							{/* CTA buttons */}
							<div
								data-hero-cta
								className={cn(
									'mt-10',
									'flex flex-col sm:flex-row',
									'items-center justify-center gap-4',
								)}
							>
								<Link
									href={
										isSignedIn
											? '/skillbuilder/dashboard'
											: loginHref
									}
									className={cn(
										'group inline-flex',
										'items-center gap-2',
										'rounded-full',
										'bg-[#ff9900] px-7 py-3.5',
										'text-sm font-semibold text-white',
										'hover:bg-[#e68900]',
										'hover:shadow-[0_0_30px_rgba(255,153,0,0.3)]',
										'transition-all duration-300',
									)}
								>
									{isSignedIn
										? 'Go to Dashboard'
										: 'Sign In to Get Started'}
									<ChevronRight
										className={cn(
											'w-4 h-4',
											'transition-transform',
											'duration-300',
											'group-hover:translate-x-0.5',
										)}
									/>
								</Link>
								<Link
									href='/'
									className={cn(
										'inline-flex items-center gap-2',
										'rounded-full',
										'border border-white/15',
										'backdrop-blur-sm',
										'px-7 py-3.5',
										'text-sm font-semibold text-white/80',
										'hover:border-white/30',
										'hover:text-white',
										'transition-all duration-300',
									)}
								>
									Back to Homepage
								</Link>
							</div>

							{/* Feature cards */}
							<div
								className={cn(
									'mt-20 grid grid-cols-1',
									'sm:grid-cols-3 gap-5',
									'max-w-3xl mx-auto',
								)}
							>
								{[
									{
										icon: BookOpen,
										title: '8 Learning Tracks',
										desc:
											'Cloud, AI/ML, CyberSec,'
											+ ' Data, SWE, IoT,'
											+ ' GameDev, and UI/UX.',
									},
									{
										icon: LayoutDashboard,
										title: 'Progress Tracking',
										desc:
											'Mark modules in progress'
											+ ' and submit documentation'
											+ ' to verify completion.',
									},
									{
										icon: Shield,
										title: 'Verified Completions',
										desc:
											'Submit your Google Docs or Nextwork'
											+ ' documentation links for'
											+ ' automated verification.',
									},
								].map((feature) => {
									const Icon = feature.icon
									return (
										<div
											key={feature.title}
											data-hero-feature
											className={cn(
												'rounded-2xl',
												'border border-white/[0.08]',
												'bg-white/[0.03]',
												'backdrop-blur-md',
												'p-6 text-left',
												'hover:border-[#ff9900]/20',
												'hover:bg-white/[0.06]',
												'transition-all duration-500',
											)}
										>
											<div
												className={cn(
													'w-10 h-10',
													'rounded-xl',
													'bg-[#ff9900]/10',
													'flex items-center',
													'justify-center mb-4',
												)}
											>
												<Icon
													className={cn(
														'w-5 h-5',
														'text-[#ff9900]',
													)}
												/>
											</div>
											<h3
												className={cn(
													'text-sm font-bold',
													'text-white',
												)}
											>
												{feature.title}
											</h3>
											<p
												className={cn(
													'text-xs',
													'text-white/45',
													'mt-1.5',
													'leading-relaxed',
												)}
											>
												{feature.desc}
											</p>
										</div>
									)
								})}
							</div>
						</div>
					</div>

					{/* Bottom fade into tracks section */}
					<div
						className={cn(
							'absolute bottom-0 left-0 right-0',
							'h-32',
							'bg-gradient-to-t',
							'from-[#08090a] to-transparent',
							'pointer-events-none',
						)}
					/>
				</section>

				{/* ── Tracks ── */}
				<section className='py-20 px-5 sm:px-8 lg:px-16'>
					<div className='container mx-auto max-w-5xl'>
						<div className='text-center mb-14'>
							<p
								className={cn(
									'text-xs uppercase',
									'tracking-[0.2em]',
									'text-[#ff9900] font-semibold',
									'mb-3',
								)}
							>
								Learning Paths
							</p>
							<h2
								className={cn(
									'text-3xl sm:text-4xl',
									'font-bold text-white',
									'tracking-tight',
								)}
							>
								Department Tracks
							</h2>
							<p
								className={cn(
									'text-white/45 mt-3',
									'max-w-lg mx-auto',
								)}
							>
								Explore the structured learning paths
								available across all departments.
							</p>
						</div>

						<div
							ref={tracksRef}
							className={cn(
								'grid grid-cols-1',
								'sm:grid-cols-2 lg:grid-cols-4',
								'gap-4',
							)}
						>
							{TRACKS.map((track) => {
								const Icon = track.icon
								return (
									<div
										key={track.name}
										data-track-card
										className={cn(
											'group rounded-2xl',
											'overflow-hidden',
											'border border-white/[0.06]',
											'bg-white/[0.02]',
											'hover:border-white/[0.12]',
											'hover:bg-white/[0.04]',
											'transition-all duration-500',
											'hover:shadow-lg',
											'hover:shadow-white/[0.02]',
										)}
									>
										<div
											className={cn(
												'bg-gradient-to-r',
												'p-5 text-white',
												track.gradient,
											)}
										>
											<div
												className={cn(
													'w-10 h-10',
													'rounded-xl',
													'bg-white/15',
													'backdrop-blur-sm',
													'flex items-center',
													'justify-center',
													'mb-3',
													'group-hover:scale-110',
													'transition-transform',
													'duration-500',
												)}
											>
												<Icon className='w-5 h-5' />
											</div>
											<h3 className='text-sm font-bold'>
												{track.name}
											</h3>
										</div>
										<div className='p-5'>
											<p
												className={cn(
													'text-xs',
													'text-white/40',
													'leading-relaxed',
												)}
											>
												{track.description}
											</p>
										</div>
									</div>
								)
							})}
						</div>
					</div>
				</section>

				{/* ── Bottom CTA ── */}
				<section
					ref={ctaSectionRef}
					className='pb-24 px-5 sm:px-8 lg:px-16'
				>
					<div
						className={cn(
							'container mx-auto max-w-3xl',
							'rounded-3xl',
							'border border-white/[0.06]',
							'bg-gradient-to-br',
							'from-[#ff9900]/10',
							'via-transparent',
							'to-blue-500/5',
							'p-10 sm:p-14 text-center',
						)}
					>
						<h2
							className={cn(
								'text-2xl sm:text-3xl',
								'font-bold text-white',
								'tracking-tight',
							)}
						>
							Ready to start building?
						</h2>
						<p
							className={cn(
								'text-white/45 mt-3',
								'max-w-md mx-auto',
							)}
						>
							Sign in with your invited account
							and begin tracking your progress
							across all department tracks.
						</p>
						<div className='mt-8'>
							<Link
								href={
									isSignedIn
										? '/skillbuilder/dashboard'
										: loginHref
								}
								className={cn(
									'group inline-flex',
									'items-center gap-2',
									'rounded-full',
									'bg-[#ff9900] px-8 py-3.5',
									'text-sm font-semibold text-white',
									'hover:bg-[#e68900]',
									'hover:shadow-[0_0_30px_rgba(255,153,0,0.3)]',
									'transition-all duration-300',
								)}
							>
								{isSignedIn
									? 'Open Dashboard'
									: 'Sign In to Start Learning'}
								<ChevronRight
									className={cn(
										'w-4 h-4',
										'transition-transform',
										'duration-300',
										'group-hover:translate-x-0.5',
									)}
								/>
							</Link>
						</div>
					</div>
				</section>

				<Footer />
			</main>
		</>
	)
}
