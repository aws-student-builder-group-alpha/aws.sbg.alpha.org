'use client'

import { useEffect } from 'react'
import { LogOut, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SignOutModalProps {
	onConfirm: () => void
	onCancel: () => void
	isPending?: boolean
	focusCancel?: boolean
}

export default function SignOutModal({
	onConfirm,
	onCancel,
	isPending,
	focusCancel,
}: SignOutModalProps) {
	useEffect(() => {
		function handleEscape(e: KeyboardEvent) {
			if (e.key === 'Escape') onCancel()
		}
		document.addEventListener('keydown', handleEscape)
		return () =>
			document.removeEventListener(
				'keydown',
				handleEscape,
			)
	}, [onCancel])

	return (
		<div
			className={cn(
				'fixed inset-0 z-[100]',
				'bg-black/60 backdrop-blur-sm',
				'flex items-center justify-center',
				'px-4',
			)}
			onClick={(e) => {
				if (e.target === e.currentTarget) onCancel()
			}}
			role='dialog'
			aria-modal='true'
			aria-label='Confirm sign out'
		>
			<div
				className={cn(
					'w-full max-w-sm rounded-2xl',
					'border border-white/[0.08]',
					'bg-[#12131a] p-6',
					'shadow-2xl',
				)}
			>
				<div className='flex items-start justify-between mb-4'>
					<div
						className={cn(
							'w-10 h-10 rounded-xl',
							'bg-red-500/10',
							'flex items-center justify-center',
						)}
					>
						<LogOut className='w-5 h-5 text-red-400' />
					</div>
					<button
						type='button'
						onClick={onCancel}
						className='text-white/30 hover:text-white/60 transition-colors'
					>
						<X className='w-5 h-5' />
					</button>
				</div>

				<h2 className='text-lg font-bold text-white mb-2'>
					Sign out?
				</h2>
				<p className='text-sm text-white/40 leading-relaxed mb-6'>
					Are you sure you want to sign out?
					You&apos;ll need to sign in again to
					access your account.
				</p>

				<div className='flex items-center gap-3'>
					<button
						type='button'
						onClick={onCancel}
						autoFocus={focusCancel}
						className={cn(
							'flex-1 rounded-xl py-2.5',
							'border border-white/[0.08]',
							'text-sm font-medium',
							'text-white/60',
							'hover:bg-white/[0.04]',
							'transition-all',
						)}
					>
						Cancel
					</button>
					<button
						type='button'
						disabled={isPending}
						onClick={onConfirm}
						className={cn(
							'flex-1 rounded-xl py-2.5',
							'bg-red-500/15 border border-red-500/20',
							'text-sm font-semibold',
							'text-red-400',
							'hover:bg-red-500/25',
							'disabled:opacity-50',
							'transition-all',
						)}
					>
						{isPending ? 'Signing out...' : 'Sign out'}
					</button>
				</div>
			</div>
		</div>
	)
}
