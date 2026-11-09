'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
	CheckCircle2,
	ChevronDown,
	Circle,
	CircleHelp,
	Clock,
	ExternalLink,
	Lock,
	LogOut,
	Undo2,
} from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@/lib/utils'
import { Navigation, Footer } from '@/app/(landing)'
import { startModuleAction } from '@/actions/start-module'
import { submitModuleDocumentationAction } from '@/actions/submit-module-documentation'
import { undoModuleProgressAction } from '@/actions/undo-module-progress'
import { signOutAction } from '@/actions/sign-out'
import SignOutModal from '@/components/sign-out-modal'
import { useAdminTour } from '@/hooks/use-admin-tour'
import { SKILLBUILDER_STEPS } from '@/lib/admin-tour'
import MemberLeaderboard from './member-leaderboard'
import type {
	ModuleStatus,
	SkillbuilderSnapshot,
	SkillModuleDto,
	LeaderboardMember,
} from '@/types/skillbuilder.types'

interface SkillbuilderDashboardProps {
	initialSnapshot: SkillbuilderSnapshot
	userEmail: string
	initialAuth?: {
		authenticated: boolean
		label: string
	}
	leaderboard: LeaderboardMember[]
	currentUserId: string
}

interface ThemeConfig {
	headerGradient: string
	expandedBg: string
	accentText: string
	moduleBorderL: string
}

const TRACK_THEMES: Record<string, ThemeConfig> = {
	cloud: {
		headerGradient: 'from-sky-800 via-sky-600 to-blue-500',
		expandedBg: 'bg-sky-50/60',
		accentText: 'text-sky-700',
		moduleBorderL: 'border-l-sky-400',
	},
	cybersec: {
		headerGradient: 'from-rose-900 via-red-700 to-red-500',
		expandedBg: 'bg-red-50/60',
		accentText: 'text-red-700',
		moduleBorderL: 'border-l-red-400',
	},
	aiml: {
		headerGradient: 'from-violet-900 via-violet-700 to-purple-500',
		expandedBg: 'bg-violet-50/60',
		accentText: 'text-violet-700',
		moduleBorderL: 'border-l-violet-400',
	},
	data: {
		headerGradient: 'from-emerald-800 via-emerald-600 to-teal-500',
		expandedBg: 'bg-emerald-50/60',
		accentText: 'text-emerald-700',
		moduleBorderL: 'border-l-emerald-400',
	},
	swe: {
		headerGradient: 'from-indigo-900 via-indigo-700 to-blue-500',
		expandedBg: 'bg-indigo-50/60',
		accentText: 'text-indigo-700',
		moduleBorderL: 'border-l-indigo-400',
	},
	iot: {
		headerGradient: 'from-amber-800 via-orange-600 to-amber-400',
		expandedBg: 'bg-amber-50/60',
		accentText: 'text-amber-700',
		moduleBorderL: 'border-l-amber-400',
	},
	gamedev: {
		headerGradient: 'from-rose-800 via-pink-700 to-pink-400',
		expandedBg: 'bg-pink-50/60',
		accentText: 'text-pink-700',
		moduleBorderL: 'border-l-pink-400',
	},
	uiux: {
		headerGradient: 'from-yellow-700 via-yellow-500 to-amber-400',
		expandedBg: 'bg-yellow-50/60',
		accentText: 'text-yellow-700',
		moduleBorderL: 'border-l-yellow-400',
	},
	default: {
		headerGradient: 'from-slate-800 via-slate-600 to-slate-500',
		expandedBg: 'bg-slate-50/60',
		accentText: 'text-slate-700',
		moduleBorderL: 'border-l-slate-400',
	},
}

const STATUS_CONFIG: Record<ModuleStatus, { label: string; iconClass: string; textClass: string }> = {
	'todo': {
		label: 'To Do',
		iconClass: 'text-gray-400',
		textClass: 'text-gray-500',
	},
	'in-progress': {
		label: 'In Progress',
		iconClass: 'text-[#ff9900]',
		textClass: 'text-[#ff9900]',
	},
	'done': {
		label: 'Done',
		iconClass: 'text-green-500',
		textClass: 'text-green-600',
	},
}

function moduleStatusIcon(status: ModuleStatus) {
	if (status === 'done') return CheckCircle2
	if (status === 'in-progress') return Clock
	return Circle
}

function calculateCategoryStats(modules: SkillModuleDto[]) {
	const done = modules.filter((item) => item.status === 'done').length
	const inProgress = modules.filter((item) => item.status === 'in-progress').length
	const todo = modules.filter((item) => item.status === 'todo').length
	const total = modules.length
	const percent = total > 0 ? Math.round((done / total) * 100) : 0
	return { done, inProgress, todo, total, percent }
}

function TrackTourButton({ categoryId }: { categoryId: string }) {
	const driverRef = useRef<ReturnType<typeof import('driver.js').driver> | null>(null)

	useEffect(() => {
		return () => {
			driverRef.current?.destroy()
		}
	}, [])

	async function handleClick() {
		// Dynamic import to avoid importing driver.js/dist/driver.css twice
		const { driver: createDriver } = await import('driver.js')

		driverRef.current?.destroy()

		const scope = `[data-category-id="${categoryId}"]`
		const steps = [
			{
				element: `${scope} [data-track-description]`,
				popover: {
					title: 'Track Description',
					description:
						'Read about what this track covers and what skills you will learn.',
					side: 'bottom' as const,
					align: 'start' as const,
				},
			},
			{
				element: `${scope} [data-track-stats]`,
				popover: {
					title: 'Your Progress',
					description:
						'See how many modules you have completed, in progress, and still to do in this track.',
					side: 'bottom' as const,
					align: 'start' as const,
				},
			},
			{
				element: `${scope} [data-module-card]:first-child`,
				popover: {
					title: 'Module Card',
					description:
						'Each card is one module. It shows the title, description, and your current status (To Do, In Progress, or Done).',
					side: 'bottom' as const,
					align: 'center' as const,
				},
			},
			{
				element: `${scope} [data-track-nextwork-link]`,
				popover: {
					title: 'Open Module Link',
					description:
						'Click this icon to open the module resource for the track. Follow the instructions there and complete the hands-on activity.',
					side: 'left' as const,
					align: 'center' as const,
				},
			},
			{
				element: `${scope} [data-track-mark-btn]`,
				popover: {
					title: 'Step 1: Mark In Progress',
					description:
						'Click this button to start the module. Your status will change to "In Progress" and a submission form will appear.',
					side: 'top' as const,
					align: 'center' as const,
				},
			},
			{
				element: `${scope} [data-track-submit]`,
				popover: {
					title: 'Step 2: Submit Your Work',
					description:
						'After completing the activity, paste your documentation link here and click "Submit Documentation". An admin will review and verify it.',
					side: 'top' as const,
					align: 'center' as const,
				},
			},
			{
				element: `${scope} [data-track-done]`,
				popover: {
					title: 'Completed!',
					description:
						'Once an admin verifies your submission, the module is marked as Done. Keep going to complete the track!',
					side: 'top' as const,
					align: 'center' as const,
				},
			},
		]

		const visibleSteps = steps.filter((step) => {
			if (!step.element) return true
			return document.querySelector(step.element) !== null
		})

		if (visibleSteps.length === 0) return

		const d = createDriver({
			showProgress: true,
			animate: true,
			allowClose: true,
			overlayColor: 'rgba(0, 0, 0, 0.7)',
			stagePadding: 8,
			stageRadius: 12,
			popoverClass: 'admin-tour-popover',
			nextBtnText: 'Next',
			prevBtnText: 'Back',
			doneBtnText: 'Got it!',
			progressText: '{{current}} of {{total}}',
			steps: visibleSteps,
			onDestroyStarted: () => {
				d.destroy()
			},
		})

		driverRef.current = d
		d.drive()
	}

	return (
		<button
			type='button'
			onClick={handleClick}
			className={cn(
				'inline-flex items-center gap-1.5',
				'shrink-0 rounded-full px-3.5 py-2',
				'text-xs font-semibold',
				'text-[#ff9900] bg-[#ff9900]/10',
				'border border-[#ff9900]/25',
				'hover:bg-[#ff9900]/20',
				'hover:border-[#ff9900]/40',
				'transition-all',
			)}
		>
			<CircleHelp className='w-3.5 h-3.5' />
			Need a guide?
		</button>
	)
}

function ModuleCard({
	module,
	theme,
	onStartModule,
	onSubmitDocumentation,
	onUndoModule,
	linkValue,
	onDocumentationLinkChange,
	message,
	isPending,
	isFirstModule,
}: {
	module: SkillModuleDto
	theme: ThemeConfig
	onStartModule: (moduleId: string) => void
	onSubmitDocumentation: (moduleId: string, url: string) => void
	onUndoModule: (moduleId: string) => void
	linkValue: string
	onDocumentationLinkChange: (moduleId: string, value: string) => void
	message?: string
	isPending: boolean
	isFirstModule?: boolean
}) {
	const status = module.status
	const cfg = STATUS_CONFIG[status]
	const Icon = moduleStatusIcon(status)

	return (
		<article
			data-module-card
			{...(isFirstModule ? { 'data-tour': 'sb-module-card' } : {})}
			className={cn(
				'group relative flex flex-col rounded-2xl border bg-white',
				'border-l-[3px] shadow-sm',
				'hover:shadow-lg hover:-translate-y-0.5',
				'transition-all duration-300',
				theme.moduleBorderL,
			)}
		>
			{/* Header */}
			<div className='p-4 pb-3 flex-1'>
				<div className='flex items-start justify-between gap-3 mb-2'>
					<p className={cn(
						'text-sm font-bold leading-snug',
						status === 'done' && 'line-through text-muted-foreground',
					)}>
						{module.title}
					</p>
					<span className={cn(
						'inline-flex items-center gap-1 shrink-0',
						'rounded-full px-2 py-0.5',
						'text-[10px] font-semibold',
						status === 'todo' && 'bg-gray-100 text-gray-500',
						status === 'in-progress' && 'bg-[#ff9900]/10 text-[#ff9900]',
						status === 'done' && 'bg-green-50 text-green-600',
					)}>
						<Icon className={cn('w-3 h-3', cfg.iconClass)} />
						{cfg.label}
					</span>
				</div>
				<p className='text-xs text-muted-foreground leading-relaxed'>
					{module.description}
				</p>
			</div>

			{/* Actions */}
			<div className='p-4 pt-0 mt-auto space-y-2.5'>
					{/* Module link — always visible, prominent */}
				<a
					href={module.nextworkUrl}
					target='_blank'
					rel='noopener noreferrer'
					{...(isFirstModule ? {
						'data-tour': 'sb-nextwork-link',
						'data-track-nextwork-link': true,
					} : {})}
					className={cn(
						'flex items-center justify-center gap-2',
						'w-full rounded-xl py-2.5',
						'text-xs font-semibold',
						'border border-border/80',
						'text-[#232f3e] bg-white',
						'hover:bg-gray-50 hover:border-[#ff9900]/30',
						'hover:text-[#ff9900]',
						'transition-all duration-200',
					)}
				>
					<ExternalLink className='w-3.5 h-3.5' />
					Open in Nextwork
				</a>

				{status === 'todo' && (
					<button
						type='button'
						disabled={isPending}
						{...(isFirstModule ? {
							'data-tour': 'sb-mark-btn',
							'data-track-mark-btn': true,
						} : {})}
						onClick={() => onStartModule(module.id)}
						className={cn(
							'w-full rounded-xl py-2.5',
							'text-xs font-semibold text-white',
							'bg-[#232f3e] hover:bg-[#1a2535]',
							'disabled:opacity-60',
							'transition-colors duration-200',
						)}
					>
						Mark In Progress
					</button>
				)}

				{status === 'in-progress' && (
					<div
						className='space-y-2'
						{...(isFirstModule
							? {
									'data-tour': 'sb-submit',
									'data-track-submit': true,
								}
							: {})}
					>
						<input
							type='url'
							value={linkValue}
							onChange={(event) =>
								onDocumentationLinkChange(module.id, event.target.value)
							}
							placeholder='Paste your Google Docs or Nextwork documentation link'
							className={cn(
								'w-full rounded-xl border px-3 py-2.5',
								'text-xs outline-none',
								'focus:border-[#ff9900] focus:ring-1',
								'focus:ring-[#ff9900]/20',
								'transition-all',
							)}
						/>
						<button
							type='button'
							disabled={isPending || linkValue.trim().length === 0}
							onClick={() => onSubmitDocumentation(module.id, linkValue)}
							className={cn(
								'w-full rounded-xl py-2.5',
								'text-xs font-semibold text-white',
								'bg-[#ff9900] hover:bg-[#e68900]',
								'disabled:opacity-60',
								'transition-colors duration-200',
							)}
						>
							Submit Documentation
						</button>
						<button
							type='button'
							disabled={isPending}
							onClick={() => onUndoModule(module.id)}
							className={cn(
								'flex items-center justify-center gap-1.5',
								'w-full rounded-xl py-2',
								'text-[11px] font-medium',
								'text-muted-foreground/60',
								'hover:text-red-500 hover:bg-red-50',
								'disabled:opacity-60',
								'transition-all duration-200',
							)}
						>
							<Undo2 className='w-3 h-3' />
							Undo — revert to To Do
						</button>
					</div>
				)}

				{status === 'done' && (
					<div
						className={cn(
							'flex items-center gap-2',
							'rounded-xl px-3 py-2.5',
							'bg-green-50 border border-green-100',
						)}
						{...(isFirstModule ? { 'data-track-done': true } : {})}
					>
						<CheckCircle2 className='w-3.5 h-3.5 text-green-500 shrink-0' />
						<span className='text-xs font-medium text-green-700'>
							Completion verified
						</span>
					</div>
				)}

				{message && (
					<p className='text-xs text-muted-foreground rounded-xl bg-muted/40 px-3 py-2'>
						{message}
					</p>
				)}
			</div>
		</article>
	)
}

export default function SkillbuilderDashboard({
	initialSnapshot,
	userEmail,
	initialAuth,
	leaderboard,
	currentUserId,
}: SkillbuilderDashboardProps) {
	const router = useRouter()
	const [openCategoryId, setOpenCategoryId] = useState<string | null>(null)
	const [docLinksByModule, setDocLinksByModule] = useState<Record<string, string>>({})
	const [messagesByModule, setMessagesByModule] = useState<Record<string, string>>({})
	const [isPending, startTransition] = useTransition()
	const [showSignOutModal, setShowSignOutModal] =
		useState(false)
	const heroRef = useRef<HTMLElement>(null)
	const tracksRef = useRef<HTMLDivElement>(null)
	const tourSteps = useMemo(() => SKILLBUILDER_STEPS, [])
	const { startTour } = useAdminTour(tourSteps)

	const totals = initialSnapshot.totals
	const overallPct = totals.modules > 0 ? Math.round((totals.done / totals.modules) * 100) : 0

	const categories = useMemo(
		() => [...initialSnapshot.categories].sort((a, b) => a.displayOrder - b.displayOrder),
		[initialSnapshot.categories],
	)

	useEffect(() => {
		gsap.registerPlugin(ScrollTrigger)
	}, [])

	useEffect(() => {
		if (!heroRef.current) return
		const el = heroRef.current
		const heroTargets = [
			el.querySelector('[data-hero-badge]'),
			el.querySelector('[data-hero-title]'),
			el.querySelector('[data-hero-subtitle]'),
			el.querySelector('[data-hero-progress]'),
			...Array.from(el.querySelectorAll('[data-hero-copy]')),
		].filter(Boolean)

		if (heroTargets.length === 0) return
		gsap.set(heroTargets, { opacity: 0, y: 20 })

		// Align intro animation with the PageLoader timeline on first page load.
		// On client-side navigations, performance.now() is already past this point,
		// so delay resolves to 0 and animation starts immediately.
		const LOADER_MS = 2300
		const elapsedMs = performance.now()
		const delayS = Math.max(0, (LOADER_MS - elapsedMs) / 1000)

		const tl = gsap.timeline({
			delay: delayS,
			defaults: { ease: 'power2.out' },
		}).to(heroTargets, {
			opacity: 1,
			y: 0,
			duration: 0.55,
			stagger: 0.1,
		})

		return () => {
			tl.kill()
		}
	}, [])

	useEffect(() => {
		if (!tracksRef.current) return
		const cards = Array.from(
			tracksRef.current.querySelectorAll('[data-category-card]'),
		)
		if (cards.length === 0) return

		gsap.set(cards, { opacity: 0, y: 32 })
		const triggers = ScrollTrigger.batch(cards, {
			onEnter: (elements) => {
				gsap.to(elements, {
					opacity: 1,
					y: 0,
					duration: 0.5,
					stagger: 0.08,
					ease: 'power2.out',
				})
			},
			start: 'top 88%',
			once: true,
		})

		return () => {
			triggers.forEach((trigger) => trigger.kill())
		}
	}, [categories.length])

	useEffect(() => {
		if (!openCategoryId || !tracksRef.current) return

		// Wait for expanded panel render before selecting module cards.
		const frame = window.requestAnimationFrame(() => {
			if (!tracksRef.current) return
			const selector = `[data-category-id="${openCategoryId}"] [data-module-card]`
			const moduleCards = Array.from(
				tracksRef.current.querySelectorAll(selector),
			)
			if (moduleCards.length === 0) return

			gsap.fromTo(
				moduleCards,
				{ opacity: 0, y: 20 },
				{
					opacity: 1,
					y: 0,
					duration: 0.4,
					stagger: 0.05,
					ease: 'power2.out',
					delay: 0.08,
				},
			)
		})

		return () => {
			window.cancelAnimationFrame(frame)
		}
	}, [openCategoryId])

	function handleDocumentationLinkChange(moduleId: string, value: string) {
		setDocLinksByModule((prev) => ({
			...prev,
			[moduleId]: value,
		}))
	}

	function handleStartModule(moduleId: string) {
		startTransition(async () => {
			const result = await startModuleAction(moduleId)
			setMessagesByModule((prev) => ({
				...prev,
				[moduleId]: result.message,
			}))
			router.refresh()
		})
	}

	function handleUndoModule(moduleId: string) {
		startTransition(async () => {
			await undoModuleProgressAction(moduleId)
			setMessagesByModule((prev) => ({
				...prev,
				[moduleId]: '',
			}))
			router.refresh()
		})
	}

	function handleSubmitDocumentation(moduleId: string, url: string) {
		startTransition(async () => {
			const result = await submitModuleDocumentationAction(moduleId, url)
			setMessagesByModule((prev) => ({
				...prev,
				[moduleId]: result.message,
			}))
			if (result.ok) {
				setDocLinksByModule((prev) => ({
					...prev,
					[moduleId]: '',
				}))
			}
			router.refresh()
		})
	}

	function handleSignOut() {
		startTransition(async () => {
			await signOutAction()
		})
	}

	return (
		<>
			<Navigation initialAuth={initialAuth} />
			<main className='min-h-screen bg-[#f0f4f8]'>
				<section
					ref={heroRef}
					data-theme='dark'
					className='min-h-0 lg:min-h-[100svh] pt-24 sm:pt-28 pb-14 px-4 sm:px-6 lg:px-8 flex items-center bg-gradient-to-br from-[#232f3e] via-[#1a2535] to-[#0d1117]'
				>
					<div className='container mx-auto max-w-6xl text-white'>
						<div className='grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start'>
							<div>
								<p
									data-hero-badge
									className='inline-flex text-xs uppercase tracking-widest text-[#ff9900] font-semibold'
								>
									AWS Student Builder Group - Alpha Program
								</p>
								<div className='flex items-center gap-3 mt-2'>
									<h1
										data-hero-title
										className='text-4xl sm:text-5xl font-bold'
									>
										Skillbuilder
									</h1>
									<button
										type='button'
										onClick={startTour}
										className={cn(
											'inline-flex items-center gap-1.5',
											'rounded-lg px-3 py-1.5 mt-2',
											'text-xs font-medium',
											'text-white/30 hover:text-[#ff9900]',
											'hover:bg-white/[0.06]',
											'border border-white/[0.1]',
											'hover:border-[#ff9900]/30',
											'transition-all',
										)}
									>
										<CircleHelp className='w-3.5 h-3.5' />
										Need a guide?
									</button>
								</div>
								<p
									data-hero-subtitle
									className='text-white/65 mt-3 text-sm'
								>
									Signed in as {userEmail}
								</p>
								<div
									data-hero-progress
									data-tour='sb-progress'
									className='mt-8 rounded-2xl border border-white/10 bg-white/5 p-6'
								>
									<div className='flex items-end justify-between mb-3'>
										<span className='text-white/60 text-xs uppercase tracking-wider'>
											Overall Progress
										</span>
										<span className='text-3xl font-bold tabular-nums'>{overallPct}%</span>
									</div>
									<div className='h-2.5 bg-white/10 rounded-full overflow-hidden mb-5'>
										<div
											className='h-full rounded-full bg-[#ff9900]'
											style={{ width: `${overallPct}%` }}
										/>
									</div>
									<div className='grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-xs'>
										<div>
											<div className='text-xl font-bold'>{totals.categories}</div>
											<div className='text-white/55'>Categories</div>
										</div>
										<div>
											<div className='text-xl font-bold'>{totals.modules}</div>
											<div className='text-white/55'>Modules</div>
										</div>
										<div>
											<div className='text-xl font-bold text-[#ff9900]'>{totals.inProgress}</div>
											<div className='text-white/55'>In Progress</div>
										</div>
										<div>
											<div className='text-xl font-bold text-green-400'>{totals.done}</div>
											<div className='text-white/55'>Completed</div>
										</div>
									</div>
								</div>
							</div>
							<div className='lg:pl-8 lg:border-l lg:border-white/10'>
								<div className='flex justify-end mb-4 hidden lg:flex'>
									<button
										type='button'
										onClick={() =>
											setShowSignOutModal(true)
										}
										className='inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10'
									>
										<LogOut className='w-4 h-4' />
										Sign out
									</button>
								</div>
								<h2
									data-hero-copy
									className='text-lg sm:text-xl font-bold text-white mb-5 leading-snug'
								>
									What is AWS Student Builder Group - Alpha Skillbuilder?
								</h2>
								<p
									data-hero-copy
									className='text-white/65 text-sm sm:text-base leading-relaxed mb-5'
								>
									AWS Student Builder Group - Alpha Skillbuilder is a structured learning roadmap built by the{' '}
									<strong className='text-white font-semibold'>
										AWS Student Builder Group - Alpha at Rizal Technological University
									</strong>
									. It organizes Cloud, AI/ML, CyberSecurity, Data Science, and more
									into practical module tracks so you always know what to learn next.
								</p>
								<p
									data-hero-copy
									className='text-white/65 text-sm sm:text-base leading-relaxed mb-5'
								>
									Each track contains hands-on modules and resources. Click a track
									card below, mark modules as in progress, and submit your documentation
									link to verify completion.
								</p>
								<p
									data-hero-copy
									className='text-white/40 text-sm leading-relaxed'
								>
									Progress tracking and submissions are now tied to your account and
									saved securely with Supabase.
								</p>
							</div>
						</div>
					</div>
				</section>

				<section className='py-10 px-4 sm:px-6 lg:px-8'>
					<div className='container mx-auto max-w-6xl space-y-5'>

						<div ref={tracksRef} data-tour='sb-tracks' className='space-y-4'>
							{categories.map((category, catIdx) => {
								const theme = TRACK_THEMES[category.themeKey] ?? TRACK_THEMES.default
								const isLocked = !category.isEnrolled
								const isOpen = !isLocked && openCategoryId === category.id
								const stats = calculateCategoryStats(category.modules)

								return (
									<div
										key={category.id}
										data-category-card
										data-category-id={category.id}
										className={cn(
											'rounded-2xl overflow-hidden border border-white/10 shadow-sm transition-shadow',
											isOpen && 'shadow-xl',
											isLocked && 'opacity-60',
										)}
									>
										<div
											{...(catIdx === 0 ? { 'data-tour': 'sb-track-header' } : {})}
											className={cn(
												'w-full text-left px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r text-white',
												'flex items-center gap-3 sm:gap-5 transition-all',
												theme.headerGradient,
												isLocked
													? 'grayscale-[40%] cursor-not-allowed'
													: 'cursor-pointer hover:brightness-110',
											)}
											onClick={
												isLocked
													? undefined
													: () =>
															setOpenCategoryId((prev) =>
																prev === category.id ? null : category.id,
															)
											}
											role={isLocked ? undefined : 'button'}
											tabIndex={isLocked ? undefined : 0}
											onKeyDown={
												isLocked
													? undefined
													: (e) => {
															if (e.key === 'Enter' || e.key === ' ') {
																e.preventDefault()
																setOpenCategoryId((prev) =>
																	prev === category.id ? null : category.id,
																)
															}
														}
											}
										>
											<span className='text-2xl sm:text-4xl shrink-0'>{category.emoji}</span>
											<div className='flex-1 min-w-0'>
												<h2 className='text-base sm:text-lg font-bold flex items-center gap-2'>
													{category.name}
													{isLocked && (
														<Lock className='w-4 h-4 text-white/60' />
													)}
												</h2>
												<p className='text-sm text-white/80 mt-0.5 hidden sm:block'>
													{isLocked
														? 'Locked — ask your admin for access.'
														: category.shortDescription}
												</p>
												{!isLocked && (
													<div className='mt-3 flex items-center gap-3 max-w-xs'>
														<div className='flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden'>
															<div
																className='h-full bg-white/90 rounded-full'
																style={{ width: `${stats.percent}%` }}
															/>
														</div>
														<span className='text-xs text-white/80 tabular-nums'>
															{stats.done}/{stats.total}
														</span>
													</div>
												)}
											</div>
											<div className='text-right'>
												{isLocked ? (
													<Lock className='w-6 h-6 text-white/40 ml-auto' />
												) : (
													<>
														<div className='text-2xl font-bold tabular-nums'>{stats.percent}%</div>
														<ChevronDown
															className={cn(
																'w-5 h-5 text-white/80 mt-2 ml-auto transition-transform duration-300',
																isOpen && 'rotate-180',
															)}
														/>
													</>
												)}
											</div>
										</div>

										{!isLocked && (
											<div
												className={cn(
													'grid transition-all duration-500 ease-in-out',
													isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
												)}
											>
												<div className={cn('overflow-hidden', theme.expandedBg)}>
													<div className='px-4 sm:px-6 py-5 sm:py-7'>
													<div className='flex items-start justify-between gap-3 mb-6'>
														<p
															data-track-description
															className='text-sm text-muted-foreground leading-relaxed italic flex-1'
														>
															{category.longDescription}
														</p>
														<TrackTourButton categoryId={category.id} />
													</div>
													<div data-track-stats className='flex flex-wrap gap-4 mb-7 text-sm'>
														<div className='flex items-center gap-1.5'>
															<CheckCircle2 className='w-4 h-4 text-green-500' />
															<span className={cn('font-semibold', theme.accentText)}>
																{stats.done}
															</span>
															<span className='text-muted-foreground'>completed</span>
														</div>
														<div className='flex items-center gap-1.5'>
															<Clock className='w-4 h-4 text-[#ff9900]' />
															<span className='font-semibold text-[#ff9900]'>{stats.inProgress}</span>
															<span className='text-muted-foreground'>in progress</span>
														</div>
														<div className='flex items-center gap-1.5'>
															<Circle className='w-4 h-4 text-gray-400' />
															<span className='font-semibold text-gray-500'>{stats.todo}</span>
															<span className='text-muted-foreground'>to do</span>
														</div>
													</div>

													<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
														{category.modules.map((module, modIdx) => (
															<ModuleCard
																key={module.id}
																module={module}
																theme={theme}
																onStartModule={handleStartModule}
																onSubmitDocumentation={handleSubmitDocumentation}
																onUndoModule={handleUndoModule}
																linkValue={docLinksByModule[module.id] ?? ''}
																onDocumentationLinkChange={handleDocumentationLinkChange}
																message={messagesByModule[module.id]}
																isPending={isPending}
																isFirstModule={modIdx === 0}
															/>
														))}
													</div>
												</div>
												</div>
											</div>
										)}
									</div>
								)
							})}
						</div>
					</div>

					{leaderboard.length > 0 && (
						<div data-tour='sb-leaderboard'>
							<MemberLeaderboard
								entries={leaderboard}
								currentUserId={currentUserId}
							/>
						</div>
					)}
				</section>
				<Footer />
			</main>

			{showSignOutModal && (
				<SignOutModal
					isPending={isPending}
					onConfirm={handleSignOut}
					onCancel={() =>
						setShowSignOutModal(false)
					}
				/>
			)}

		</>
	)
}
