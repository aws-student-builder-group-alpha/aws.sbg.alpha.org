'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import gsap from 'gsap'
import GoogleLogo from '@/components/google-logo'
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

	const displayError = error ?? (!isLoading && searchParams.get('error') ? 'Sign in failed. Please try again.' : null)

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
						redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(searchParams.get('next') || '/skillbuilder/dashboard')}`,
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
					{displayError && (
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
							{displayError}
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
							<GoogleLogo />
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
