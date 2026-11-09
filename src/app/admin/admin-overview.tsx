'use client'

import { useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
	BarChart,
	Bar,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from 'recharts'
import {
	BookOpen,
	ChevronRight,
	CircleHelp,
	TrendingUp,
	Trophy,
	Users,
	Zap,
} from 'lucide-react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'
import { useAdminTour } from '@/hooks/use-admin-tour'
import { OVERVIEW_STEPS } from '@/lib/admin-tour'
import type {
	AdminOverviewStats,
	CategoryCompletionStat,
	LeaderboardEntry,
	WeeklyActivityPoint,
} from '@/types/admin.types'

const CATEGORY_COLORS: Record<string, string> = {
	cloud: '#38bdf8',
	cybersec: '#f43f5e',
	aiml: '#a78bfa',
	data: '#34d399',
	swe: '#818cf8',
	iot: '#fbbf24',
	gamedev: '#f472b6',
	uiux: '#facc15',
	default: '#94a3b8',
}

interface AdminOverviewProps {
	stats: AdminOverviewStats
	categoryStats: CategoryCompletionStat[]
	weeklyActivity: WeeklyActivityPoint[]
	topMembers: LeaderboardEntry[]
}

export default function AdminOverview({
	stats,
	categoryStats,
	weeklyActivity,
	topMembers,
}: AdminOverviewProps) {
	const pageRef = useRef<HTMLDivElement>(null)
	const steps = useMemo(() => OVERVIEW_STEPS, [])
	const { startTour } = useAdminTour(steps)

	useEffect(() => {
		if (!pageRef.current) return
		const cards = Array.from(
			pageRef.current.querySelectorAll('[data-card]'),
		)
		if (cards.length === 0) return

		gsap.set(cards, { opacity: 0, y: 20 })
		gsap.to(cards, {
			opacity: 1,
			y: 0,
			duration: 0.5,
			stagger: 0.06,
			ease: 'power3.out',
			delay: 0.1,
		})
	}, [])

	const statCards = [
		{
			label: 'Total Members',
			value: stats.totalMembers,
			sub: `+${stats.newMembersThisWeek} this week`,
			icon: Users,
			accent: 'text-blue-400',
			bg: 'bg-blue-500/10',
		},
		{
			label: 'Pending Approvals',
			value: stats.pendingApprovals,
			sub: stats.pendingApprovals > 0
				? 'Members waiting for access'
				: 'All members approved',
			icon: Zap,
			accent: stats.pendingApprovals > 0
				? 'text-yellow-400'
				: 'text-emerald-400',
			bg: stats.pendingApprovals > 0
				? 'bg-yellow-500/10'
				: 'bg-emerald-500/10',
		},
		{
			label: 'Modules Completed',
			value: stats.totalCompleted,
			sub: `${stats.totalInProgress} in progress`,
			icon: BookOpen,
			accent: 'text-[#ff9900]',
			bg: 'bg-[#ff9900]/10',
		},
		{
			label: 'Completion Rate',
			value: `${stats.completionRate}%`,
			sub: `${stats.totalModules} modules total`,
			icon: TrendingUp,
			accent: 'text-violet-400',
			bg: 'bg-violet-500/10',
		},
	]

	return (
		<div ref={pageRef}>
			<div className='flex items-center justify-between mb-8'>
				<div>
					<h1 className='text-2xl font-bold text-white tracking-tight'>
						Dashboard
					</h1>
					<p className='text-sm text-white/40 mt-1'>
						Overview of all Skillbuilder activity.
					</p>
				</div>
				<button
					type='button'
					onClick={startTour}
					className={cn(
						'inline-flex items-center gap-1.5',
						'rounded-lg px-3 py-1.5',
						'text-xs font-medium',
						'text-white/30 hover:text-[#ff9900]',
						'hover:bg-[#ff9900]/[0.06]',
						'border border-white/[0.06]',
						'hover:border-[#ff9900]/20',
						'transition-all',
					)}
				>
					<CircleHelp className='w-3.5 h-3.5' />
					Need a guide?
				</button>
			</div>

			{/* Stat cards */}
			<div
				data-tour='stat-cards'
				className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'
			>
				{statCards.map((card) => {
					const Icon = card.icon
					return (
						<div
							key={card.label}
							data-card
							className={cn(
								'rounded-2xl p-5',
								'border border-white/[0.06]',
								'bg-white/[0.02]',
							)}
						>
							<div className='flex items-center justify-between mb-4'>
								<div
									className={cn(
										'w-9 h-9 rounded-xl',
										'flex items-center justify-center',
										card.bg,
									)}
								>
									<Icon
										className={cn(
											'w-4 h-4',
											card.accent,
										)}
									/>
								</div>
							</div>
							<p className='text-2xl font-bold text-white tabular-nums'>
								{card.value}
							</p>
							<p className='text-xs text-white/35 mt-1'>
								{card.label}
							</p>
							<p
								className={cn(
									'text-[11px] mt-2',
									card.accent,
								)}
							>
								{card.sub}
							</p>
						</div>
					)
				})}
			</div>

			{/* Charts row */}
			<div
				data-tour='charts'
				className='grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8'
			>
				{/* Weekly completions line chart */}
				<div
					data-card
					className={cn(
						'rounded-2xl p-5',
						'border border-white/[0.06]',
						'bg-white/[0.02]',
					)}
				>
					<h3 className='text-sm font-semibold text-white mb-1'>
						Weekly Completions
					</h3>
					<p className='text-xs text-white/30 mb-5'>
						Module completions over the last 12 weeks
					</p>
					<div className='h-52'>
						<ResponsiveContainer width='100%' height='100%'>
							<LineChart data={weeklyActivity}>
								<CartesianGrid
									strokeDasharray='3 3'
									stroke='rgba(255,255,255,0.04)'
								/>
								<XAxis
									dataKey='week'
									tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
									axisLine={false}
									tickLine={false}
								/>
								<YAxis
									tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
									axisLine={false}
									tickLine={false}
									allowDecimals={false}
								/>
								<Tooltip
									contentStyle={{
										background: '#1a1b1e',
										border: '1px solid rgba(255,255,255,0.08)',
										borderRadius: '12px',
										fontSize: '12px',
										color: '#fff',
									}}
								/>
								<Line
									type='monotone'
									dataKey='completions'
									stroke='#ff9900'
									strokeWidth={2}
									dot={{ r: 3, fill: '#ff9900' }}
									activeDot={{ r: 5, fill: '#ff9900' }}
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* Category bar chart */}
				<div
					data-card
					className={cn(
						'rounded-2xl p-5',
						'border border-white/[0.06]',
						'bg-white/[0.02]',
					)}
				>
					<h3 className='text-sm font-semibold text-white mb-1'>
						Track Progress
					</h3>
					<p className='text-xs text-white/30 mb-5'>
						Completions per department track
					</p>
					<div className='h-52'>
						<ResponsiveContainer width='100%' height='100%'>
							<BarChart
								data={categoryStats}
								layout='vertical'
							>
								<CartesianGrid
									strokeDasharray='3 3'
									stroke='rgba(255,255,255,0.04)'
									horizontal={false}
								/>
								<XAxis
									type='number'
									tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
									axisLine={false}
									tickLine={false}
									allowDecimals={false}
								/>
								<YAxis
									dataKey='categoryName'
									type='category'
									tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
									axisLine={false}
									tickLine={false}
									width={90}
								/>
								<Tooltip
									contentStyle={{
										background: '#1a1b1e',
										border: '1px solid rgba(255,255,255,0.08)',
										borderRadius: '12px',
										fontSize: '12px',
										color: '#fff',
									}}
								/>
								<Bar
									dataKey='completed'
									name='Completed'
									radius={[0, 6, 6, 0]}
								>
									{categoryStats.map((entry) => (
										<Cell
											key={entry.categoryName}
											fill={
												CATEGORY_COLORS[entry.themeKey] ??
												CATEGORY_COLORS.default
											}
										/>
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>

			{/* Top members mini-leaderboard */}
			<div
				data-card
				data-tour='top-members'
				className={cn(
					'rounded-2xl',
					'border border-white/[0.06]',
					'bg-white/[0.02]',
				)}
			>
				<div className='flex items-center justify-between p-5 pb-0'>
					<div>
						<h3 className='text-sm font-semibold text-white flex items-center gap-2'>
							<Trophy className='w-4 h-4 text-[#ff9900]' />
							Top Members
						</h3>
						<p className='text-xs text-white/30 mt-0.5'>
							Ranked by modules completed
						</p>
					</div>
					<Link
						href='/admin/leaderboard'
						className={cn(
							'inline-flex items-center gap-1',
							'text-xs text-[#ff9900]',
							'hover:text-[#e68900]',
							'transition-colors',
						)}
					>
						View all
						<ChevronRight className='w-3 h-3' />
					</Link>
				</div>
				<div className='p-5'>
					{topMembers.length === 0 ? (
						<p className='text-sm text-white/25 text-center py-8'>
							No member activity yet.
						</p>
					) : (
						<div className='space-y-2'>
							{topMembers.map((member, idx) => {
								const rankColors = [
									'text-yellow-400',
									'text-gray-300',
									'text-amber-600',
								]
								return (
									<div
										key={member.userId}
										className={cn(
											'flex items-center gap-4',
											'rounded-xl px-4 py-3',
											'bg-white/[0.02]',
											'border border-white/[0.04]',
										)}
									>
										<span
											className={cn(
												'text-sm font-bold w-6',
												'text-center tabular-nums',
												rankColors[idx] ?? 'text-white/25',
											)}
										>
											{idx + 1}
										</span>
										<div className='flex-1 min-w-0'>
											<p className='text-sm font-medium text-white truncate'>
												{member.fullName ?? member.email}
											</p>
											{member.fullName && (
												<p className='text-[11px] text-white/25 truncate'>
													{member.email}
												</p>
											)}
										</div>
										<div className='text-right'>
											<p className='text-sm font-bold text-white tabular-nums'>
												{member.modulesCompleted}
											</p>
											<p className='text-[10px] text-white/25'>
												completed
											</p>
										</div>
										<div className='w-16'>
											<div className='h-1.5 bg-white/[0.06] rounded-full overflow-hidden'>
												<div
													className='h-full bg-[#ff9900] rounded-full'
													style={{
														width: `${member.completionRate}%`,
													}}
												/>
											</div>
											<p className='text-[10px] text-white/25 text-right mt-0.5 tabular-nums'>
												{member.completionRate}%
											</p>
										</div>
									</div>
								)
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
