'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
	CircleHelp,
	Medal,
	Search,
	Trophy,
} from 'lucide-react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'
import { useAdminTour } from '@/hooks/use-admin-tour'
import { LEADERBOARD_STEPS } from '@/lib/admin-tour'
import type { LeaderboardEntry } from '@/types/admin.types'

interface AdminLeaderboardProps {
	entries: LeaderboardEntry[]
}

export default function AdminLeaderboard({
	entries,
}: AdminLeaderboardProps) {
	const pageRef = useRef<HTMLDivElement>(null)
	const [search, setSearch] = useState('')
	const steps = useMemo(() => LEADERBOARD_STEPS, [])
	const { startTour } = useAdminTour(steps)

	useEffect(() => {
		if (!pageRef.current) return
		const rows = Array.from(
			pageRef.current.querySelectorAll('[data-row]'),
		)
		if (rows.length === 0) return

		gsap.set(rows, { opacity: 0, x: -12 })
		gsap.to(rows, {
			opacity: 1,
			x: 0,
			duration: 0.4,
			stagger: 0.03,
			ease: 'power3.out',
			delay: 0.15,
		})
	}, [])

	const filtered = entries.filter((entry) => {
		if (!search) return true
		const q = search.toLowerCase()
		return (
			entry.email.toLowerCase().includes(q) ||
			(entry.fullName?.toLowerCase().includes(q) ??
				false)
		)
	})

	function getRankDisplay(idx: number) {
		if (idx === 0)
			return (
				<Medal className='w-5 h-5 text-yellow-400' />
			)
		if (idx === 1)
			return (
				<Medal className='w-5 h-5 text-gray-300' />
			)
		if (idx === 2)
			return (
				<Medal className='w-5 h-5 text-amber-600' />
			)
		return (
			<span className='text-sm text-white/25 tabular-nums'>
				{idx + 1}
			</span>
		)
	}

	return (
		<div ref={pageRef}>
			<div className='flex items-center justify-between mb-8'>
				<div>
					<div className='flex items-center gap-3'>
						<h1 className='text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2'>
							<Trophy className='w-5 sm:w-6 h-5 sm:h-6 text-[#ff9900]' />
							Leaderboard
						</h1>
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
					<p className='text-xs sm:text-sm text-white/40 mt-1'>
						{entries.length} members ranked by
						completions
					</p>
				</div>
			</div>

			{/* Search */}
			<div data-tour='lb-search' className='relative mb-6 max-w-sm'>
				<Search
					className={cn(
						'absolute left-3.5',
						'top-1/2 -translate-y-1/2',
						'w-4 h-4 text-white/20',
						'pointer-events-none',
					)}
				/>
				<input
					type='text'
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder='Search by name or email...'
					className={cn(
						'w-full rounded-xl',
						'border border-white/[0.08]',
						'bg-white/[0.03]',
						'pl-10 pr-4 py-2.5',
						'text-sm text-white',
						'placeholder:text-white/20',
						'outline-none',
						'focus:border-[#ff9900]/40',
						'transition-all',
					)}
				/>
			</div>

			{/* Table — desktop */}
			<div
				data-tour='lb-table'
				className={cn(
					'rounded-2xl overflow-hidden',
					'border border-white/[0.06]',
					'bg-white/[0.02]',
					'hidden md:block',
				)}
			>
				{/* Header */}
				<div
					className={cn(
						'grid grid-cols-[3rem_1fr_6rem_6rem_5rem_7rem]',
						'gap-4 px-5 py-3',
						'border-b border-white/[0.06]',
						'text-[10px] uppercase tracking-wider',
						'text-white/25 font-semibold',
					)}
				>
					<span className='text-center'>#</span>
					<span>Member</span>
					<span className='text-right'>Done</span>
					<span className='text-right'>
						In Progress
					</span>
					<span className='text-right'>Rate</span>
					<span className='text-right'>
						Last Active
					</span>
				</div>

				{/* Rows */}
				{filtered.length === 0 ? (
					<p className='text-sm text-white/20 text-center py-12'>
						No members found.
					</p>
				) : (
					filtered.map((entry, idx) => (
						<div
							key={entry.userId}
							data-row
							className={cn(
								'grid grid-cols-[3rem_1fr_6rem_6rem_5rem_7rem]',
								'gap-4 px-5 py-3.5',
								'border-b border-white/[0.03]',
								'hover:bg-white/[0.02]',
								'transition-colors',
								idx < 3 && 'bg-white/[0.01]',
							)}
						>
							<span className='flex items-center justify-center'>
								{getRankDisplay(idx)}
							</span>
							<div className='flex flex-col justify-center min-w-0'>
								<p className='text-sm font-medium text-white truncate'>
									{entry.fullName ?? entry.email}
								</p>
								{entry.fullName && (
									<p className='text-[11px] text-white/25 truncate'>
										{entry.email}
									</p>
								)}
							</div>
							<div className='flex items-center justify-end'>
								<span className='text-sm font-bold text-emerald-400 tabular-nums'>
									{entry.modulesCompleted}
								</span>
							</div>
							<div className='flex items-center justify-end'>
								<span className='text-sm text-[#ff9900] tabular-nums'>
									{entry.modulesInProgress}
								</span>
							</div>
							<div className='flex items-center justify-end'>
								<span className='text-sm text-white/50 tabular-nums'>
									{entry.completionRate}%
								</span>
							</div>
							<div className='flex items-center justify-end'>
								<span className='text-[11px] text-white/25'>
									{entry.lastActiveAt
										? formatRelative(
												entry.lastActiveAt,
											)
										: 'Never'}
								</span>
							</div>
						</div>
					))
				)}
			</div>

			{/* Cards — mobile */}
			<div className='space-y-3 md:hidden'>
				{filtered.length === 0 ? (
					<p className='text-sm text-white/20 text-center py-12'>
						No members found.
					</p>
				) : (
					filtered.map((entry, idx) => (
						<div
							key={entry.userId}
							data-row
							className={cn(
								'rounded-xl p-4',
								'border border-white/[0.06]',
								'bg-white/[0.02]',
								idx < 3 && 'border-white/[0.1]',
							)}
						>
							<div className='flex items-center gap-3 mb-3'>
								<span className='w-7 flex items-center justify-center shrink-0'>
									{getRankDisplay(idx)}
								</span>
								<div className='min-w-0 flex-1'>
									<p className='text-sm font-medium text-white truncate'>
										{entry.fullName ?? entry.email}
									</p>
									{entry.fullName && (
										<p className='text-[11px] text-white/25 truncate'>
											{entry.email}
										</p>
									)}
								</div>
							</div>
							<div className='flex flex-wrap items-center gap-2 sm:gap-4 text-xs pl-8 sm:pl-10'>
								<span className='text-white/30'>
									Done:{' '}
									<span className='text-emerald-400 font-bold'>
										{entry.modulesCompleted}
									</span>
								</span>
								<span className='text-white/30'>
									Active:{' '}
									<span className='text-[#ff9900] font-medium'>
										{entry.modulesInProgress}
									</span>
								</span>
								<span className='text-white/30'>
									<span className='text-white/50'>
										{entry.completionRate}%
									</span>
								</span>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	)
}

function formatRelative(dateStr: string): string {
	const now = Date.now()
	const then = new Date(dateStr).getTime()
	const diffMs = now - then
	const diffMin = Math.floor(diffMs / 60_000)
	const diffHr = Math.floor(diffMs / 3_600_000)
	const diffDays = Math.floor(diffMs / 86_400_000)

	if (diffMin < 1) return 'Just now'
	if (diffMin < 60) return `${diffMin}m ago`
	if (diffHr < 24) return `${diffHr}h ago`
	if (diffDays < 7) return `${diffDays}d ago`
	if (diffDays < 30)
		return `${Math.floor(diffDays / 7)}w ago`
	return new Date(dateStr).toLocaleDateString()
}
