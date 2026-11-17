'use client'

import { useEffect, useRef } from 'react'
import { Crown, Medal, Trophy } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@/lib/utils'
import type { LeaderboardMember } from '@/types/skillbuilder.types'

interface MemberLeaderboardProps {
	entries: LeaderboardMember[]
	currentUserId: string
}

function getRankIcon(rank: number) {
	if (rank === 1) return Crown
	if (rank === 2) return Trophy
	if (rank === 3) return Medal
	return null
}

function getRankColor(rank: number) {
	if (rank === 1) return 'text-yellow-400'
	if (rank === 2) return 'text-gray-300'
	if (rank === 3) return 'text-amber-600'
	return 'text-white/30'
}

function getBarGradient(rank: number) {
	if (rank === 1) {
		return 'bg-gradient-to-r from-yellow-500 to-amber-400'
	}
	if (rank === 2) {
		return 'bg-gradient-to-r from-gray-400 to-gray-300'
	}
	if (rank === 3) {
		return 'bg-gradient-to-r from-amber-700 to-amber-500'
	}
	return 'bg-[#ff9900]'
}

export default function MemberLeaderboard({
	entries,
	currentUserId,
}: MemberLeaderboardProps) {
	const sectionRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		gsap.registerPlugin(ScrollTrigger)
	}, [])

	useEffect(() => {
		if (!sectionRef.current) return
		const rows = Array.from(
			sectionRef.current.querySelectorAll(
				'[data-lb-row]',
			),
		)
		if (rows.length === 0) return

		gsap.set(rows, { opacity: 0, x: -20 })
		const triggers = ScrollTrigger.batch(rows, {
			onEnter: (elements) => {
				gsap.to(elements, {
					opacity: 1,
					x: 0,
					duration: 0.4,
					stagger: 0.06,
					ease: 'power2.out',
				})
			},
			start: 'top 90%',
			once: true,
		})

		return () => {
			triggers.forEach((trigger) => trigger.kill())
		}
	}, [entries.length])

	if (entries.length === 0) return null

	const maxCompleted = entries[0]?.modulesCompleted ?? 1

	return (
		<div ref={sectionRef} className='mt-10'>
			<div className='flex items-center gap-3 mb-6'>
				<Trophy className='w-5 h-5 text-[#ff9900]' />
				<h2 className='text-lg sm:text-xl font-bold text-[#232f3e]'>
					Leaderboard
				</h2>
			</div>

			<div
				className={cn(
					'rounded-2xl overflow-hidden',
					'border border-[#232f3e]/8',
					'bg-gradient-to-br from-[#232f3e]',
					'via-[#1a2535] to-[#0d1117]',
					'p-4 sm:p-6',
				)}
			>
				<div className='space-y-3'>
					{entries.map((entry, index) => {
						const rank = index + 1
						const RankIcon = getRankIcon(rank)
						const isCurrentUser =
							entry.userId === currentUserId
						const barWidth =
							maxCompleted > 0
								? Math.max(
										(entry.modulesCompleted /
											maxCompleted) *
											100,
										4,
									)
								: 4

						return (
							<div
								key={entry.userId}
								data-lb-row
								className={cn(
									'flex items-center gap-3',
									'sm:gap-4 rounded-xl',
									'px-3 sm:px-4 py-3',
									'transition-colors',
									isCurrentUser
										? 'bg-[#ff9900]/10 ring-1 ring-[#ff9900]/20'
										: 'bg-white/[0.03] hover:bg-white/[0.05]',
								)}
							>
								{/* Rank */}
								<div className='w-8 shrink-0 flex items-center justify-center'>
									{RankIcon ? (
										<RankIcon
											className={cn(
												'w-5 h-5',
												getRankColor(
													rank,
												),
											)}
										/>
									) : (
										<span
											className={cn(
												'text-sm font-bold',
												'tabular-nums',
												getRankColor(
													rank,
												),
											)}
										>
											{rank}
										</span>
									)}
								</div>

								{/* Name + bar */}
								<div className='flex-1 min-w-0'>
									<div className='flex items-baseline justify-between gap-2 mb-1.5'>
										<p
											className={cn(
												'text-sm font-medium truncate',
												isCurrentUser
													? 'text-[#ff9900]'
													: 'text-white',
											)}
										>
											{entry.fullName ??
												'Member'}
											{isCurrentUser && (
												<span className='text-[10px] text-[#ff9900]/60 ml-1.5 font-normal'>
													(you)
												</span>
											)}
										</p>
										<span className='text-xs text-white/40 tabular-nums shrink-0'>
											{
												entry.modulesCompleted
											}
											/
											{entry.totalModules}{' '}
											modules
										</span>
									</div>
									<div className='h-2 bg-white/[0.08] rounded-full overflow-hidden'>
										<div
											className={cn(
												'h-full rounded-full transition-all duration-500',
												getBarGradient(
													rank,
												),
											)}
											style={{
												width: `${barWidth}%`,
											}}
										/>
									</div>
									<div className='flex justify-end mt-1'>
										<span
											className={cn(
												'text-[11px] font-semibold tabular-nums',
												rank <= 3
													? getRankColor(
															rank,
														)
													: 'text-white/40',
											)}
										>
											{
												entry.completionRate
											}
											%
										</span>
									</div>
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}
