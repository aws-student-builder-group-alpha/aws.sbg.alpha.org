'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
	enrollMemberAction,
	unenrollMemberAction,
} from '@/actions/enroll-member'

interface EnrollmentModalProps {
	memberId: string
	memberName: string
	allCategories: { id: string; name: string; emoji: string }[]
	initialEnrolledIds: string[]
	onClose: () => void
}

export default function EnrollmentModal({
	memberId,
	memberName,
	allCategories,
	initialEnrolledIds,
	onClose,
}: EnrollmentModalProps) {
	const router = useRouter()
	const [enrolledIds, setEnrolledIds] = useState<Set<string>>(
		new Set(initialEnrolledIds),
	)
	const [isPending, startTransition] = useTransition()
	const [pendingId, setPendingId] = useState<string | null>(
		null,
	)

	useEffect(() => {
		function handleEscape(e: KeyboardEvent) {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', handleEscape)
		return () =>
			document.removeEventListener('keydown', handleEscape)
	}, [onClose])

	function handleToggle(categoryId: string) {
		const isEnrolled = enrolledIds.has(categoryId)
		setPendingId(categoryId)

		startTransition(async () => {
			const result = isEnrolled
				? await unenrollMemberAction(
						memberId,
						categoryId,
					)
				: await enrollMemberAction(
						memberId,
						categoryId,
					)

			if (result.ok) {
				setEnrolledIds((prev) => {
					const next = new Set(prev)
					if (isEnrolled) {
						next.delete(categoryId)
					} else {
						next.add(categoryId)
					}
					return next
				})
			}
			setPendingId(null)
			router.refresh()
		})
	}

	return (
		<div
			className={cn(
				'fixed inset-0 z-50',
				'bg-black/60 backdrop-blur-sm',
				'flex items-center justify-center',
				'px-4',
			)}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose()
			}}
			role='dialog'
			aria-modal='true'
			aria-label='Manage enrollments'
		>
			<div
				className={cn(
					'w-full max-w-md rounded-2xl',
					'border border-white/[0.08]',
					'bg-[#12131a] p-6',
					'max-h-[85vh] flex flex-col',
				)}
			>
				<div className='flex items-center justify-between mb-5 shrink-0'>
					<div>
						<h2 className='text-lg font-bold text-white flex items-center gap-2'>
							<BookOpen className='w-5 h-5 text-[#ff9900]' />
							Manage Enrollments
						</h2>
						<p className='text-xs text-white/35 mt-1'>
							{memberName}
						</p>
					</div>
					<button
						type='button'
						onClick={onClose}
						className='text-white/30 hover:text-white/60'
					>
						<X className='w-5 h-5' />
					</button>
				</div>

				<div className='space-y-2 overflow-y-auto min-h-0'>
					{allCategories.map((cat) => {
						const isEnrolled = enrolledIds.has(cat.id)
						const isLoading =
							isPending && pendingId === cat.id

						return (
							<button
								key={cat.id}
								type='button'
								disabled={isPending}
								onClick={() =>
									handleToggle(cat.id)
								}
								className={cn(
									'w-full flex items-center gap-3',
									'rounded-xl px-4 py-3',
									'text-left text-sm',
									'transition-all',
									'disabled:opacity-50',
									isEnrolled
										? 'bg-[#ff9900]/15 border border-[#ff9900]/30 text-white'
										: 'bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white/70 hover:bg-white/[0.05]',
								)}
							>
								<span className='text-xl shrink-0'>
									{cat.emoji}
								</span>
								<span className='flex-1 font-medium'>
									{cat.name}
								</span>
								<span
									className={cn(
										'text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md',
										isEnrolled
											? 'bg-[#ff9900]/20 text-[#ff9900]'
											: 'bg-white/[0.05] text-white/25',
									)}
								>
									{isLoading
										? '...'
										: isEnrolled
											? 'Enrolled'
											: 'Locked'}
								</span>
							</button>
						)
					})}
				</div>
			</div>
		</div>
	)
}
