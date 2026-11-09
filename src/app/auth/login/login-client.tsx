'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'
import { getSupabaseBrowserClient } from '@/services/supabase-client.service'

export default function LoginClient() {
	const searchParams = useSearchParams()
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)

	const formRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!formRef.current) return

		const targets = Array.from(
			formRef.current.querySelectorAll('[data-reveal]'),
		)
		if (targets.length === 0) return

		gsap.set(targets, { opacity: 0, y: 20 })
		const tl = gsap.timeline({
			delay: 0.15,
			defaults: { ease: 'power3.out' },
		}).to(targets, {
			opacity: 1,
			y: 0,
			duration: 0.6,
			stagger: 0.08,
		})

		return () => {
			tl.kill()
		}
	}, [])

	useEffect(() => {
		const errParam = searchParams.get('error')
		if (errParam) {
			setError('Sign in failed. Please try again.')
		}
	}, [searchParams])

	async function handleGoogleSignIn() {
		setError(null)
		setIsLoading(true)

		try {
			const supabase = getSupabaseBrowserClient()
			const siteUrl =
				process.env.NEXT_PUBLIC_SITE_URL ??
				window.location.origin

			const { error: oauthError } =
				await supabase.auth.signInWithOAuth({
					provider: 'google',
					options: {
						redirectTo: `${siteUrl}/auth/callback`,
					},
				})

			if (oauthError) {
				setError(oauthError.message)
				setIsLoading(false)
			}
		} catch {
			setError('Something went wrong. Please try again.')
			setIsLoading(false)
		}
	}

	return (
		<main className='relative min-h-screen flex overflow-hidden'>
			{/* ── Left panel: background image ── */}
			<div className='hidden lg:block lg:w-1/2 relative'>
				<Image
					src='/skillbuilder-hero-bg.jpg'
					alt=''
					fill
					priority
					className='object-cover'
					sizes='50vw'
				/>
				<div
					className={cn(
						'absolute inset-0',
						'bg-gradient-to-br',
						'from-[#08090a]/90',
						'via-[#08090a]/60',
						'to-[#08090a]/80',
					)}
				/>
				<div
					className={cn(
						'absolute bottom-1/4 left-1/3',
						'w-[400px] h-[400px]',
						'rounded-full',
						'bg-[#ff9900]/10 blur-[120px]',
						'pointer-events-none',
					)}
				/>
				<div
					className={cn(
						'absolute inset-0 flex flex-col',
						'justify-between p-12',
					)}
				>
					<Link
						href='/'
						className='flex items-center gap-3 w-fit'
					>
						<Image
							src='/optimized/alpha-logo.webp'
							alt='AWS Student Builder Group Logo'
							width={40}
							height={40}
							className={cn(
								'object-contain',
								'drop-shadow-[0_0_20px_rgba(255,153,0,0.2)]',
							)}
						/>
						<div>
							<p className='text-sm font-bold text-white leading-tight'>
								AWS Student Builder Group - Alpha
							</p>
							<p
								className={cn(
									'text-[10px] uppercase',
									'tracking-[0.15em]',
									'text-[#ff9900]',
								)}
							>
								Rizal Technological University
							</p>
						</div>
					</Link>
					<div>
						<h2
							className={cn(
								'text-3xl font-bold text-white',
								'tracking-tight leading-tight',
							)}
						>
							Build your cloud
							<br />
							skills with{' '}
							<span className='text-[#ff9900]'>
								purpose
							</span>
							.
						</h2>
						<p
							className={cn(
								'text-white/40 mt-3',
								'text-sm max-w-sm leading-relaxed',
							)}
						>
							Track your progress through AWS
							SkillBuilder modules across 8
							department tracks.
						</p>
					</div>
				</div>
			</div>

			{/* ── Right panel: login ── */}
			<div
				className={cn(
					'flex-1 flex items-center justify-center',
					'bg-[#08090a] px-6 py-12',
					'lg:px-16',
				)}
			>
				<div
					ref={formRef}
					className='w-full max-w-sm'
				>
					{/* Mobile logo */}
					<div
						data-reveal
						className='lg:hidden flex justify-center mb-10'
					>
						<Link
							href='/'
							className='flex items-center gap-3'
						>
							<Image
								src='/optimized/alpha-logo.webp'
								alt='AWS Student Builder Group Logo'
								width={36}
								height={36}
								className='object-contain'
							/>
							<div>
								<p className='text-sm font-bold text-white leading-tight'>
									AWS Student Builder Group - Alpha
								</p>
								<p
									className={cn(
										'text-[10px] uppercase',
										'tracking-[0.15em]',
										'text-[#ff9900]',
									)}
								>
									Rizal Technological University
								</p>
							</div>
						</Link>
					</div>

					{/* Header */}
					<div data-reveal>
						<h1
							className={cn(
								'text-2xl font-bold text-white',
								'tracking-tight',
							)}
						>
							Welcome back
						</h1>
						<p className='mt-2 text-sm text-white/40'>
							Sign in with your Google account
							to continue.
						</p>
					</div>

					{/* Error */}
					{error && (
						<div
							data-reveal
							className={cn(
								'mt-6 rounded-xl',
								'border border-red-500/20',
								'bg-red-500/10',
								'px-4 py-3',
								'text-sm text-red-400',
							)}
						>
							{error}
						</div>
					)}

					{/* Google sign-in button */}
					<div data-reveal className='mt-8'>
						<button
							type='button'
							disabled={isLoading}
							onClick={handleGoogleSignIn}
							className={cn(
								'w-full inline-flex',
								'items-center justify-center gap-3',
								'rounded-xl py-3.5 px-4',
								'bg-white text-[#232f3e]',
								'text-sm font-semibold',
								'hover:bg-white/90',
								'hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]',
								'disabled:opacity-60',
								'transition-all duration-300',
							)}
						>
							<svg
								viewBox='0 0 24 24'
								width='18'
								height='18'
								aria-hidden='true'
							>
								<path
									d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z'
									fill='#4285F4'
								/>
								<path
									d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
									fill='#34A853'
								/>
								<path
									d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
									fill='#FBBC05'
								/>
								<path
									d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
									fill='#EA4335'
								/>
							</svg>
							{isLoading
								? 'Redirecting...'
								: 'Continue with Google'}
						</button>
					</div>

					<div data-reveal className='mt-5'>
						<p className='text-[11px] text-white/20 text-center leading-relaxed'>
							Only invited members can sign in.
							Contact a club officer if you need
							access.
						</p>
					</div>

					{/* Footer links */}
					<div data-reveal className='mt-10 space-y-3'>
						<Link
							href='/'
							className={cn(
								'inline-flex items-center gap-1.5',
								'text-xs text-white/40',
								'hover:text-[#ff9900]',
								'transition-colors duration-300',
							)}
						>
							<ArrowLeft className='w-3 h-3' />
							Back to homepage
						</Link>
					</div>
				</div>
			</div>
		</main>
	)
}
