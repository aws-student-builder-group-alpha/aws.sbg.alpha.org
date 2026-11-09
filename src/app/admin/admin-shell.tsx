'use client'

import { useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
	LayoutDashboard,
	FileText,
	LogOut,
	Menu,
	Trophy,
	Users,
	X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOutAction } from '@/actions/sign-out'
import SignOutModal from '@/components/sign-out-modal'

const NAV_ITEMS = [
	{
		href: '/admin',
		label: 'Overview',
		icon: LayoutDashboard,
	},
	{
		href: '/admin/leaderboard',
		label: 'Leaderboard',
		icon: Trophy,
	},
	{
		href: '/admin/members',
		label: 'Members',
		icon: Users,
	},
	{
		href: '/admin/submissions',
		label: 'Submissions',
		icon: FileText,
	},
]

interface AdminShellProps {
	userEmail: string
	children: React.ReactNode
}

/**
 * Renders the fixed admin navigation shell and leaves the main area free for
 * route-specific layouts.
 */
export default function AdminShell({
	userEmail,
	children,
}: AdminShellProps) {
	const pathname = usePathname()
	const [isPending, startTransition] = useTransition()
	const [isMobileOpen, setIsMobileOpen] = useState(false)
	const [showSignOutModal, setShowSignOutModal] =
		useState(false)

	function isActive(href: string) {
		if (href === '/admin') {
			return pathname === '/admin' || pathname === '/admin/'
		}
		return pathname.startsWith(href)
	}

	function handleSignOut() {
		startTransition(async () => {
			await signOutAction()
		})
	}

	const sidebarContent = (
		<>
			{/* Logo */}
			<div className='p-5 border-b border-white/[0.06]'>
				<Link
					href='/'
					className='flex items-center gap-3'
				>
					<Image
						src='/optimized/alpha-logo.webp'
						alt='AWS Student Builder Group Logo'
						width={32}
						height={32}
						className='object-contain'
					/>
					<div>
						<p className='text-sm font-bold text-white leading-tight'>
							AWS Student Builder Group - Alpha
						</p>
						<p
							className={cn(
								'text-[9px] uppercase',
								'tracking-[0.2em]',
								'text-[#ff9900]',
							)}
						>
							Super Admin
						</p>
					</div>
				</Link>
			</div>

			{/* Nav */}
			<nav className='flex-1 p-3 space-y-1'>
				{NAV_ITEMS.map((item) => {
					const Icon = item.icon
					const active = isActive(item.href)
					return (
						<Link
							key={item.href}
							href={item.href}
							onClick={() =>
								setIsMobileOpen(false)
							}
							className={cn(
								'flex items-center gap-3',
								'px-3 py-2.5 rounded-xl',
								'text-sm font-medium',
								'transition-all duration-200',
								active
									? 'bg-[#ff9900]/10 text-[#ff9900]'
									: 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
							)}
						>
							<Icon className='w-4 h-4 shrink-0' />
							{item.label}
						</Link>
					)
				})}
			</nav>

			{/* User + sign out */}
			<div className='p-3 border-t border-white/[0.06]'>
				<p
					className={cn(
						'px-3 text-[11px] text-white/30',
						'truncate mb-2',
					)}
				>
					{userEmail}
				</p>
				<button
					type='button'
					onClick={() => setShowSignOutModal(true)}
					className={cn(
						'flex items-center gap-3',
						'w-full px-3 py-2.5 rounded-xl',
						'text-sm font-medium',
						'text-white/40 hover:text-red-400',
						'hover:bg-red-500/[0.06]',
						'transition-all duration-200',
					)}
				>
					<LogOut className='w-4 h-4 shrink-0' />
					Sign out
				</button>
			</div>
		</>
	)

	return (
		<div className='flex min-h-screen bg-[#08090a]'>
			{/* Desktop sidebar */}
			<aside
				className={cn(
					'fixed left-0 top-0 bottom-0',
					'w-64 border-r border-white/[0.06]',
					'bg-[#0c0d0f] flex-col',
					'z-40',
					'hidden lg:flex',
				)}
			>
				{sidebarContent}
			</aside>

			{/* Mobile top bar */}
			<div
				className={cn(
					'fixed top-0 left-0 right-0',
					'h-14 z-40',
					'bg-[#0c0d0f]/95 backdrop-blur-md',
					'border-b border-white/[0.06]',
					'flex items-center px-4 gap-3',
					'lg:hidden',
				)}
			>
				<button
					type='button'
					onClick={() =>
						setIsMobileOpen(!isMobileOpen)
					}
					className='text-white/60 hover:text-white p-1'
					aria-label='Toggle menu'
				>
					{isMobileOpen ? (
						<X className='w-5 h-5' />
					) : (
						<Menu className='w-5 h-5' />
					)}
				</button>
				<Image
					src='/optimized/alpha-logo.webp'
					alt='AWS Student Builder Group Logo'
					width={24}
					height={24}
					className='object-contain'
				/>
				<span className='text-sm font-bold text-white'>
					AWS Student Builder Group - Alpha
				</span>
				<span
					className={cn(
						'text-[8px] uppercase',
						'tracking-[0.15em]',
						'text-[#ff9900] font-semibold',
					)}
				>
					Admin
				</span>
			</div>

			{/* Mobile sidebar overlay */}
			{isMobileOpen && (
				<div
					className='fixed inset-0 z-40 bg-black/60 lg:hidden'
					onClick={() => setIsMobileOpen(false)}
				/>
			)}

			{/* Mobile sidebar drawer */}
			<aside
				className={cn(
					'fixed left-0 top-0 bottom-0',
					'w-64 border-r border-white/[0.06]',
					'bg-[#0c0d0f] flex flex-col',
					'z-50 lg:hidden',
					'transition-transform duration-300',
					isMobileOpen
						? 'translate-x-0'
						: '-translate-x-full',
				)}
			>
				{sidebarContent}
			</aside>

			{/* Main content */}
			<main
				className={cn(
					'flex-1 min-w-0 p-4 sm:p-6 lg:p-8',
					'lg:ml-64',
					'pt-[4.5rem] lg:pt-8',
				)}
			>
				{children}
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
		</div>
	)
}
