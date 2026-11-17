'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, LogOut, RefreshCw } from 'lucide-react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'
import { signOutAction } from '@/actions/sign-out'
import SignOutModal from '@/components/sign-out-modal'

interface PendingApprovalProps {
	userEmail: string
}

export default function PendingApproval({
	userEmail,
}: PendingApprovalProps) {
	const router = useRouter()
	const containerRef = useRef<HTMLDivElement>(null)
	const [isPending, startTransition] = useTransition()
	const [showSignOutModal, setShowSignOutModal] =
		useState(false)

	useEffect(() => {
		if (!containerRef.current) return
		const targets = Array.from(
			containerRef.current.querySelectorAll(
				'[data-reveal]',
			),
		)
		if (targets.length === 0) return

		gsap.set(targets, { opacity: 0, y: 20 })
		gsap.to(targets, {
			opacity: 1,
			y: 0,
			duration: 0.6,
			stagger: 0.1,
			ease: 'power3.out',
			delay: 0.15,
		})
	}, [])

	function handleSignOut() {
		startTransition(async () => {
			await signOutAction()
			router.replace('/auth/login')
			router.refresh()
		})
	}

	function handleRefresh() {
		router.refresh()
	}

	return (
		<main className='min-h-screen bg-[#08090a] flex items-center justify-center px-5'>
			{/* Background glow */}
			<div
				className={cn(
					'fixed top-1/3 left-1/2',
					'-translate-x-1/2',
					'w-[600px] h-[600px]',
					'rounded-full',
					'bg-[#ff9900]/5 blur-[150px]',
					'pointer-events-none',
				)}
			/>

			<div
				ref={containerRef}
				className='relative z-10 max-w-md w-full text-center'
			>
				{/* Logo */}
				<div
					data-reveal
					className='flex justify-center mb-8'
				>
					<Image
						src='/optimized/alpha-logo.webp'
						alt='AWS Student Builder Group Logo'
						width={56}
						height={56}
						className={cn(
							'object-contain',
							'drop-shadow-[0_0_30px_rgba(255,153,0,0.15)]',
						)}
					/>
				</div>

				{/* Clock icon */}
				<div
					data-reveal
					className='flex justify-center mb-6'
				>
					<div
						className={cn(
							'w-16 h-16 rounded-2xl',
							'bg-[#ff9900]/10',
							'border border-[#ff9900]/20',
							'flex items-center justify-center',
						)}
					>
						<Clock className='w-7 h-7 text-[#ff9900]' />
					</div>
				</div>

				{/* Title */}
				<h1
					data-reveal
					className={cn(
						'text-2xl font-bold text-white',
						'tracking-tight',
					)}
				>
					Pending Approval
				</h1>

				{/* Description */}
				<p
					data-reveal
					className={cn(
						'mt-3 text-sm text-white/40',
						'leading-relaxed max-w-sm mx-auto',
					)}
				>
					Your account is waiting for administrator
					approval. Once approved, an admin will
					enroll you in your assigned learning
					tracks.
				</p>

				{/* Email badge */}
				<div data-reveal className='mt-6'>
					<span
						className={cn(
							'inline-flex items-center gap-2',
							'rounded-full',
							'border border-white/[0.06]',
							'bg-white/[0.03]',
							'px-4 py-2',
							'text-xs text-white/50',
						)}
					>
						Signed in as {userEmail}
					</span>
				</div>

				{/* Actions */}
				<div
					data-reveal
					className={cn(
						'mt-8 flex flex-col',
						'sm:flex-row items-center',
						'justify-center gap-3',
					)}
				>
					<button
						type='button'
						onClick={handleRefresh}
						className={cn(
							'inline-flex items-center gap-2',
							'rounded-xl px-5 py-2.5',
							'bg-[#ff9900] text-white',
							'text-sm font-semibold',
							'hover:bg-[#e68900]',
							'transition-colors',
						)}
					>
						<RefreshCw className='w-4 h-4' />
						Check Again
					</button>
					<button
						type='button'
						onClick={() =>
							setShowSignOutModal(true)
						}
						className={cn(
							'inline-flex items-center gap-2',
							'rounded-xl px-5 py-2.5',
							'border border-white/[0.08]',
							'text-white/40 text-sm font-medium',
							'hover:text-white/60',
							'hover:bg-white/[0.03]',
							'transition-all',
						)}
					>
						<LogOut className='w-4 h-4' />
						Sign out
					</button>
				</div>

				{/* Back link */}
				<div data-reveal className='mt-8'>
					<Link
						href='/'
						className={cn(
							'text-xs text-white/25',
							'hover:text-[#ff9900]',
							'transition-colors',
						)}
					>
						Back to homepage
					</Link>
				</div>
			</div>
		{showSignOutModal && (
				<SignOutModal
					isPending={isPending}
					onConfirm={handleSignOut}
					onCancel={() =>
						setShowSignOutModal(false)
					}
				/>
			)}
		</main>
	)
}
