'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import gsap from 'gsap'
import { cn } from '@/lib/utils'
import { acceptOathAction } from '@/actions/accept-oath'

interface OathModalProps {
	onAccepted: () => void
}

function QuillIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox='0 0 120 320'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			className={className}
		>
			{/* Feather barbs - left side */}
			<path
				d='M55 10C55 10 20 35 12 60C4 85 8 105 18 115C28 125 38 120 42 110L55 70'
				fill='url(#feather-left)'
				opacity='0.9'
			/>
			<path
				d='M55 30C55 30 25 50 18 70C11 90 14 105 22 112'
				stroke='#6B5220'
				strokeWidth='0.5'
				opacity='0.3'
			/>
			<path
				d='M55 50C55 50 30 65 24 80C18 95 20 105 26 110'
				stroke='#6B5220'
				strokeWidth='0.5'
				opacity='0.3'
			/>
			<path
				d='M55 15C55 15 32 30 22 50'
				stroke='#F5E6C8'
				strokeWidth='0.5'
				opacity='0.3'
			/>

			{/* Feather barbs - right side */}
			<path
				d='M55 10C55 10 90 35 98 60C106 85 102 105 92 115C82 125 72 120 68 110L55 70'
				fill='url(#feather-right)'
				opacity='0.9'
			/>
			<path
				d='M55 30C55 30 85 50 92 70C99 90 96 105 88 112'
				stroke='#6B5220'
				strokeWidth='0.5'
				opacity='0.3'
			/>
			<path
				d='M55 50C55 50 80 65 86 80C92 95 90 105 84 110'
				stroke='#6B5220'
				strokeWidth='0.5'
				opacity='0.3'
			/>
			<path
				d='M55 15C55 15 78 30 88 50'
				stroke='#F5E6C8'
				strokeWidth='0.5'
				opacity='0.3'
			/>

			{/* Central quill shaft */}
			<path
				d='M55 8L54 130L53.5 200L54 260L55 310'
				stroke='url(#shaft-gradient)'
				strokeWidth='3'
				strokeLinecap='round'
			/>
			<path
				d='M56 8L56 130L56.5 200L56 260L55 310'
				stroke='#F5E6C8'
				strokeWidth='0.8'
				opacity='0.4'
			/>

			{/* Quill nib */}
			<path
				d='M54 260L52 295L55 315L58 295L56 260'
				fill='#5C3D0E'
				stroke='#3E2C0A'
				strokeWidth='0.8'
			/>
			<path
				d='M55 280L55 312'
				stroke='#3E2C0A'
				strokeWidth='0.5'
			/>

			{/* Ink drop at tip */}
			<circle
				cx='55'
				cy='316'
				r='2'
				fill='#1a1005'
				opacity='0.6'
			/>

			<defs>
				<linearGradient
					id='feather-left'
					x1='55'
					y1='10'
					x2='12'
					y2='100'
				>
					<stop stopColor='#F5E6C8' />
					<stop offset='0.3' stopColor='#E8D5A3' />
					<stop offset='0.7' stopColor='#C4A55A' />
					<stop offset='1' stopColor='#8B6914' />
				</linearGradient>
				<linearGradient
					id='feather-right'
					x1='55'
					y1='10'
					x2='98'
					y2='100'
				>
					<stop stopColor='#F5E6C8' />
					<stop offset='0.3' stopColor='#DCC68E' />
					<stop offset='0.7' stopColor='#B8943E' />
					<stop offset='1' stopColor='#7A5B10' />
				</linearGradient>
				<linearGradient
					id='shaft-gradient'
					x1='55'
					y1='8'
					x2='55'
					y2='310'
				>
					<stop stopColor='#D4A843' />
					<stop offset='0.6' stopColor='#8B6914' />
					<stop offset='1' stopColor='#5C3D0E' />
				</linearGradient>
			</defs>
		</svg>
	)
}

function WaxSeal({ className }: { className?: string }) {
	return (
		<svg
			viewBox='0 0 48 48'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			className={className}
		>
			<circle
				cx='24'
				cy='24'
				r='18'
				fill='url(#seal-gradient)'
			/>
			<circle
				cx='24'
				cy='24'
				r='14'
				stroke='#8B1A1A'
				strokeWidth='1'
				opacity='0.4'
			/>
			<circle
				cx='24'
				cy='24'
				r='10'
				stroke='#FFD700'
				strokeWidth='1.5'
				opacity='0.6'
			/>
			<text
				x='24'
				y='28'
				textAnchor='middle'
				fill='#FFD700'
				fontSize='12'
				fontWeight='bold'
				fontFamily='serif'
				opacity='0.8'
			>
				A
			</text>
			<defs>
				<radialGradient id='seal-gradient'>
					<stop stopColor='#C62828' />
					<stop offset='1' stopColor='#7B1A1A' />
				</radialGradient>
			</defs>
		</svg>
	)
}

function SignatureAnimation({
	onComplete,
}: {
	onComplete: () => void
}) {
	const svgRef = useRef<SVGSVGElement>(null)
	const sealRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const svg = svgRef.current
		const seal = sealRef.current
		if (!svg || !seal) return

		const paths = svg.querySelectorAll('path')
		const tl = gsap.timeline({
			onComplete: () => {
				gsap.to(seal, {
					scale: 1,
					opacity: 1,
					duration: 0.4,
					ease: 'back.out(1.7)',
					onComplete,
				})
			},
		})

		paths.forEach((path) => {
			gsap.set(path, {
				strokeDasharray: length,
				strokeDashoffset: length,
			})
		})

		gsap.set(seal, { scale: 0, opacity: 0 })

		paths.forEach((path, i) => {
			tl.to(
				path,
				{
					strokeDashoffset: 0,
					duration: i === 0 ? 1.2 : 0.6,
					ease: 'power2.inOut',
				},
				i === 0 ? 0 : '>-0.15',
			)
		})

		return () => {
			tl.kill()
		}
	}, [onComplete])

	return (
		<div className='flex flex-col items-center gap-3'>
			<p
				className={cn(
					'text-xs sm:text-sm',
					'text-[#8B6914]/60',
					'uppercase tracking-wider',
				)}
				style={{
					fontFamily:
						'Georgia, "Times New Roman", serif',
				}}
			>
				Signed &amp; Sealed
			</p>

			{/* Signature SVG */}
			<svg
				ref={svgRef}
				viewBox='0 0 280 80'
				fill='none'
				xmlns='http://www.w3.org/2000/svg'
				className='w-56 sm:w-72 h-auto'
			>
				{/* Main signature stroke */}
				<path
					d='M20 55 C30 55 35 20 50 20 C65 20 55 55 70 50 C85 45 80 25 95 25 C110 25 100 50 115 48 C130 46 125 30 140 28 C155 26 150 50 160 45 C170 40 168 30 178 32 C188 34 185 48 195 45 C205 42 200 35 210 38 C215 40 218 48 225 42 C232 36 238 50 245 48'
					stroke='#3E2C0A'
					strokeWidth='2'
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
				{/* Underline flourish */}
				<path
					d='M40 62 C80 65 160 60 240 58 C250 57 255 60 250 63'
					stroke='#3E2C0A'
					strokeWidth='1.5'
					strokeLinecap='round'
				/>
				{/* Dot / period */}
				<path
					d='M255 55 C256 54 258 54 258 56 C258 58 256 58 255 57'
					stroke='#3E2C0A'
					strokeWidth='2'
					strokeLinecap='round'
				/>
			</svg>

			{/* Wax seal stamp animation */}
			<div ref={sealRef}>
				<WaxSeal
					className={cn(
						'w-10 h-10 sm:w-12 sm:h-12',
					)}
				/>
			</div>
		</div>
	)
}

export default function OathModal({
	onAccepted,
}: OathModalProps) {
	const router = useRouter()
	const [signing, setSigning] = useState(false)
	const [isPending, startTransition] = useTransition()

	function handleAccept() {
		startTransition(async () => {
			const result = await acceptOathAction()
			if (result.ok) {
				setSigning(true)
			}
		})
	}

	function handleSignatureComplete() {
		setTimeout(() => {
			onAccepted()
		}, 600)
	}

	function handleDecline() {
		router.push('/')
	}

	return (
		<div
			className={cn(
				'fixed inset-0 z-[200]',
				'bg-black/80 backdrop-blur-md',
				'flex items-start sm:items-center',
				'justify-center',
				'overflow-y-auto',
				'px-3 sm:px-4 py-4 sm:py-8',
			)}
			role='dialog'
			aria-modal='true'
			aria-label='Skillbuilder oath agreement'
		>
			<div
				className={cn(
					'relative w-full max-w-xl',
					'my-auto',
				)}
			>
				{/* Quill decoration on the right */}
				<QuillIcon
					className={cn(
						'hidden sm:block',
						'absolute -right-20 -top-12',
						'w-28 h-[420px]',
						'rotate-[15deg]',
						'opacity-90 pointer-events-none',
						'drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]',
					)}
				/>

				{/* Parchment */}
				<div
					className={cn(
						'relative w-full rounded-sm',
						'bg-gradient-to-b',
						'from-[#f4e4c1] via-[#e8d5a3]',
						'to-[#d4c08a]',
						'shadow-[0_20px_60px_rgba(0,0,0,0.5),',
						'inset_0_1px_0_rgba(255,255,255,0.3)]',
						'overflow-hidden',
					)}
					style={{
						boxShadow: [
							'0 20px 60px rgba(0,0,0,0.5)',
							'inset 0 1px 0 rgba(255,255,255,0.3)',
							'inset 0 -2px 8px rgba(139,105,20,0.15)',
						].join(', '),
					}}
				>
					{/* Aged paper texture overlay */}
					<div
						className={cn(
							'absolute inset-0',
							'pointer-events-none opacity-[0.08]',
						)}
						style={{
							backgroundImage: [
								'radial-gradient(ellipse at 20% 50%,',
								'rgba(120,80,20,0.4) 0%,',
								'transparent 50%),',
								'radial-gradient(ellipse at 80% 20%,',
								'rgba(120,80,20,0.3) 0%,',
								'transparent 40%),',
								'radial-gradient(ellipse at 60% 80%,',
								'rgba(120,80,20,0.3) 0%,',
								'transparent 45%)',
							].join(' '),
						}}
					/>

					{/* Burnt/darkened edges */}
					<div
						className={cn(
							'absolute inset-0',
							'pointer-events-none',
						)}
						style={{
							boxShadow: [
								'inset 0 0 40px rgba(120,80,20,0.2)',
								'inset 0 0 80px rgba(120,80,20,0.1)',
							].join(', '),
						}}
					/>

					{/* Top decorative border */}
					<div
						className={cn(
							'h-1 w-full',
							'bg-gradient-to-r',
							'from-transparent',
							'via-[#8B6914]/40',
							'to-transparent',
						)}
					/>

					<div className='relative px-5 py-6 sm:px-10 sm:py-8'>
						{/* Header */}
						<div className='text-center mb-4 sm:mb-6'>
							<p
								className={cn(
									'text-[10px] sm:text-xs',
									'uppercase',
									'tracking-[0.2em] sm:tracking-[0.3em]',
									'text-[#8B6914]/60',
									'font-medium mb-1 sm:mb-2',
								)}
								style={{
									fontFamily:
										'Georgia, "Times New Roman", serif',
								}}
							>
								AWS Student Builder Group &mdash; Alpha
							</p>
							<h2
								className={cn(
									'text-xl sm:text-3xl',
									'font-bold text-[#3E2C0A]',
								)}
								style={{
									fontFamily:
										'Georgia, "Times New Roman", serif',
								}}
							>
								Member&apos;s Oath
							</h2>
							<div
								className={cn(
									'mx-auto mt-3 w-32 h-px',
									'bg-gradient-to-r',
									'from-transparent',
									'via-[#8B6914]/50',
									'to-transparent',
								)}
							/>
						</div>

						{/* Invitation text */}
						<p
							className={cn(
								'text-[13px] sm:text-[15px]',
								'leading-[1.7] sm:leading-[1.8]',
								'text-[#5C3D0E]/80',
								'text-center mb-4 sm:mb-6',
							)}
							style={{
								fontFamily:
									'Georgia, "Times New Roman", serif',
							}}
						>
							Learn through Skillbuilder Modules!
							Document your work and share it with the
							world &mdash; whether it&apos;s on
							LinkedIn, your portfolio, or any platform
							you choose.
						</p>

						{/* Divider */}
						<div
							className={cn(
								'mx-auto mb-4 sm:mb-6 w-32 sm:w-48 h-px',
								'bg-gradient-to-r',
								'from-transparent',
								'via-[#8B6914]/30',
								'to-transparent',
							)}
						/>

						{/* Oath text */}
						<div
							className={cn(
								'relative rounded-sm',
								'p-4 sm:p-5 mb-4 sm:mb-6',
								'bg-[#8B6914]/[0.06]',
								'border border-[#8B6914]/15',
							)}
						>
							<p
								className={cn(
									'text-xs sm:text-sm',
									'font-semibold',
									'text-[#8B6914] mb-2 sm:mb-3',
									'uppercase tracking-wider',
								)}
								style={{
									fontFamily:
										'Georgia, "Times New Roman", serif',
								}}
							>
								Oath &amp; Agreement
							</p>
							<p
								className={cn(
									'text-[13px] sm:text-[15px]',
									'leading-[1.7] sm:leading-[1.9]',
									'text-[#3E2C0A]/75',
								)}
								style={{
									fontFamily:
										'Georgia, "Times New Roman", serif',
								}}
							>
								I promise and take oath to abide by
								the rules of AWS Student Builder Group &mdash;
								Alpha. I understand that sharing
								credentials, resources, or access with
								non-members or anyone outside the
								organization is strictly prohibited.
								Violation of this agreement will result
								in immediate suspension and revocation
								of all AWS resource access.
							</p>
						</div>

						{signing ? (
							<SignatureAnimation
								onComplete={
									handleSignatureComplete
								}
							/>
						) : (
							<>
								{/* Question */}
									<p
										className={cn(
											'text-xs sm:text-sm',
											'text-[#5C3D0E]/50',
											'text-center mb-4 sm:mb-5',
										)}
										style={{
											fontFamily:
												'Georgia, "Times New Roman", serif',
											fontStyle: 'italic',
										}}
									>
										Do you accept the oath and
										agree to follow the rules of
										AWS Student Builder Group &mdash;
										Alpha?
									</p>

								{/* Buttons */}
								<div
									className={cn(
										'flex items-center',
										'gap-2 sm:gap-3',
									)}
								>
									<button
										type='button'
										onClick={handleDecline}
										className={cn(
											'flex-1 rounded-sm',
											'py-2.5 sm:py-3',
											'border',
											'border-[#8B6914]/20',
											'bg-[#8B6914]/[0.05]',
											'text-sm font-medium',
											'text-[#5C3D0E]/60',
											'hover:bg-[#8B6914]/10',
											'transition-all',
											'cursor-pointer',
										)}
										style={{
											fontFamily:
												'Georgia, "Times New Roman", serif',
										}}
									>
										No, I decline
									</button>
									<button
										type='button'
										disabled={isPending}
										onClick={handleAccept}
										className={cn(
											'flex-1 rounded-sm',
											'py-2.5 sm:py-3',
											'bg-[#3E2C0A]',
											'border border-[#5C3D0E]',
											'text-sm font-semibold',
											'text-[#f4e4c1]',
											'hover:bg-[#5C3D0E]',
											'disabled:opacity-50',
											'transition-all',
											'cursor-pointer',
										)}
										style={{
											fontFamily:
												'Georgia, "Times New Roman", serif',
										}}
									>
										{isPending
											? 'Sealing...'
											: 'Yes, I accept'}
									</button>
								</div>

								{/* Wax seal */}
								<div
									className={cn(
										'flex justify-center',
										'mt-4 sm:mt-6',
									)}
								>
									<WaxSeal
										className={cn(
											'w-10 h-10',
											'sm:w-12 sm:h-12',
											'opacity-70',
										)}
									/>
								</div>
							</>
						)}
					</div>

					{/* Bottom decorative border */}
					<div
						className={cn(
							'h-1 w-full',
							'bg-gradient-to-r',
							'from-transparent',
							'via-[#8B6914]/40',
							'to-transparent',
						)}
					/>
				</div>
			</div>
		</div>
	)
}
