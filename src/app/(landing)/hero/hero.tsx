"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useMagnetic } from "@/hooks/use-magnetic"
import MeshGradient from "./mesh-gradient"
import { RECRUITMENT_URL } from "@/lib/recruitment"

gsap.registerPlugin(ScrollTrigger)

export default function Hero() {
	const sectionRef = useRef<HTMLElement>(null)
	const logoRef = useRef<HTMLDivElement>(null)
	const tagRef = useRef<HTMLDivElement>(null)
	const l1Ref = useRef<HTMLDivElement>(null)
	const l3Ref = useRef<HTMLDivElement>(null)
	const descRef = useRef<HTMLParagraphElement>(null)
	const ctaRef = useRef<HTMLDivElement>(null)
	const barRef = useRef<HTMLDivElement>(null)
	const auroraRef = useRef<HTMLDivElement>(null)
	const primaryRef = useRef<HTMLAnchorElement>(null)
	const secondaryRef = useRef<HTMLAnchorElement>(null)

	useMagnetic(primaryRef, 0.3)
	useMagnetic(secondaryRef, 0.2)

	// Entry animation + scroll parallax
	useEffect(() => {
		const ctx = gsap.context(() => {
			const tl = gsap.timeline({ delay: 0.1 })

			gsap.set(auroraRef.current, {
				opacity: 0,
				scale: 0.8,
			})
			gsap.set(logoRef.current, {
				opacity: 0,
				scale: 0.8,
				y: 20,
			})
			gsap.set(tagRef.current, {
				opacity: 0,
				y: 15,
			})
			gsap.set(
				[l1Ref.current, l3Ref.current],
				{ y: "120%", opacity: 0 },
			)
			gsap.set(descRef.current, {
				opacity: 0,
				y: 20,
			})
			gsap.set(ctaRef.current, {
				opacity: 0,
				y: 20,
			})
			gsap.set(barRef.current, { opacity: 0 })

			// Aurora glow
			tl.to(auroraRef.current, {
				opacity: 1,
				scale: 1,
				duration: 2,
				ease: "power2.out",
			})

			// Logo
			tl.to(
				logoRef.current,
				{
					opacity: 1,
					scale: 1,
					y: 0,
					duration: 1,
					ease: "power3.out",
				},
				"-=1.5",
			)

			// Tag
			tl.to(
				tagRef.current,
				{
					opacity: 1,
					y: 0,
					duration: 0.6,
					ease: "power3.out",
				},
				"-=0.8",
			)

			// Lines reveal
			tl.to(
				l1Ref.current,
				{
					y: "0%",
					opacity: 1,
					duration: 1,
					ease: "power4.out",
				},
				"-=0.3",
			)
			tl.to(
				l3Ref.current,
				{
					y: "0%",
					opacity: 1,
					duration: 1.2,
					ease: "expo.out",
				},
				"-=0.6",
			)

			// Description
			tl.to(
				descRef.current,
				{
					opacity: 1,
					y: 0,
					duration: 0.8,
					ease: "power3.out",
				},
				0.25,
			)

			// CTA
			tl.to(
				ctaRef.current,
				{
					opacity: 1,
					y: 0,
					duration: 0.8,
					ease: "power3.out",
				},
				0.35,
			)

			// Bottom bar
			tl.to(
				barRef.current,
				{
					opacity: 1,
					duration: 0.6,
				},
				"-=0.3",
			)

			// Parallax
			ScrollTrigger.create({
				trigger: sectionRef.current,
				start: "top top",
				end: "bottom top",
				scrub: 1.5,
				onUpdate: (self) => {
					const p = self.progress
					if (l1Ref.current) {
						gsap.set(l1Ref.current, {
							y: p * -50,
						})
					}
					if (l3Ref.current) {
						gsap.set(l3Ref.current, {
							y: p * -20,
						})
					}
					if (logoRef.current) {
						gsap.set(logoRef.current, {
							y: p * -40,
						})
					}
					if (auroraRef.current) {
						gsap.set(auroraRef.current, {
							y: p * 60,
						})
					}
				},
			})

			// Mobile fallback
			const fb = setTimeout(() => {
				gsap.set(
					[
						auroraRef.current,
						logoRef.current,
						tagRef.current,
						l1Ref.current,
						l3Ref.current,
						descRef.current,
						ctaRef.current,
						barRef.current,
					],
					{ clearProps: "all" },
				)
			}, 6000)

			return () => clearTimeout(fb)
		}, sectionRef)

		return () => ctx.revert()
	}, [])

	return (
		<section
			ref={sectionRef}
			data-theme="dark"
			className="relative min-h-screen
				flex flex-col overflow-hidden
				bg-[#08090a]"
		>
			{/* Interactive mesh gradient canvas */}
			<div
				ref={auroraRef}
				className="absolute inset-0
					pointer-events-none"
			>
				<MeshGradient />
			</div>

			{/* Content */}
			<div
				className="relative z-10 flex flex-col
					flex-1 items-center text-center
					px-5 sm:px-8 lg:px-16
					pt-28 sm:pt-32 lg:pt-36 pb-6"
				style={{
					textShadow: "0 2px 20px rgba(0,0,0,0.8)",
				}}
			>
				{/* Logo */}
				<div
					ref={logoRef}
					className="relative w-20 h-20
						sm:w-24 sm:h-24 mb-6 sm:mb-8"
				>
					<Image
						src="/optimized/alpha-logo.webp"
						alt="AWS Student Builder Group Logo"
						fill
						className="object-contain
							drop-shadow-[0_0_40px_rgba(255,153,0,0.15)]"
						priority
					/>
				</div>

				{/* Tag */}
				<div
					ref={tagRef}
					className="flex items-center gap-2
						mb-8 sm:mb-10"
				>
					<div
						className="w-1.5 h-1.5
							rounded-full bg-[#ff9900]"
					/>
					<span
						className="text-[10px] sm:text-xs
							uppercase tracking-[0.25em]
							text-white/60
							font-medium"
					>
						AWS Student Builder Group &mdash; Alpha
					</span>
				</div>

				{/* Heading */}
				<h1 className="mb-6 sm:mb-8">
					{/* It's Always */}
					<span className="block overflow-hidden">
						<span
							ref={l1Ref}
							className="block
								hero-fluid-lg
								font-bold
								text-[rgb(247,248,248)]
								leading-[1]
								tracking-[-0.03em]"
						>
							It&apos;s Always
						</span>
					</span>

					{/* Day One */}
					<span
						className="block
							mt-1 sm:mt-2"
					>
						<span
							ref={l3Ref}
							className="block
								urban-starblues
								hero-fluid-xl
								text-[#ff9900]
								leading-[1.2]
								pb-2"
						>
							Day One
						</span>
					</span>
				</h1>

				{/* Description */}
				<p
					ref={descRef}
					className="text-sm sm:text-base
						text-white/80
						leading-relaxed max-w-md
						mt-10 lg:mt-24
						mb-8 sm:mb-10"
				>
					The first AWS cloud community at Rizal
					Technological University. Build projects,
					learn from peers, and accelerate your
					cloud career.
				</p>

				{/* CTA */}
				<div
					ref={ctaRef}
					className="flex flex-col sm:flex-row
						items-center gap-3 sm:gap-4"
				>
					<a
						ref={primaryRef}
						href={RECRUITMENT_URL}
						className="group inline-flex
							items-center gap-2
							bg-white text-[#08090a]
							font-semibold text-sm
							px-6 py-3 rounded-md
							hover:bg-white/90
							transition-all duration-300
							will-change-transform"
					>
						Apply now
						<svg
							width="16"
							height="16"
							viewBox="0 0 20 20"
							fill="none"
							className="transition-transform
								duration-300
								group-hover:translate-x-0.5"
						>
							<path
								d="M4 10h12m0 0l-4-4m4 4l-4 4"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</a>
					<a
						ref={secondaryRef}
						href="#about"
						className="inline-flex
							items-center gap-2
							text-sm text-white/70
							font-medium px-6 py-3
							rounded-md
							border border-white/[0.08]
							hover:border-[#ff9900]/40
							hover:text-[rgb(247,248,248)]
							transition-all duration-300
							will-change-transform"
					>
						Learn More
					</a>
				</div>

				{/* Spacer */}
				<div className="flex-1" />

				{/* Bottom bar */}
				<div
					ref={barRef}
					className="w-full max-w-3xl flex
						items-center justify-between
						pt-5 border-t
						border-white/[0.06]"
				>
					<span
						className="text-[9px] sm:text-[10px]
							uppercase tracking-[0.15em]
							text-white/[0.12]
							hidden sm:block"
					>
						Rizal Technological University
					</span>
					<span
						className="text-[9px] sm:text-[10px]
							uppercase tracking-[0.15em]
							text-white/[0.12]
							mx-auto sm:mx-0"
					>
						Est. 2024
					</span>
					<span
						className="text-[9px] sm:text-[10px]
							uppercase tracking-[0.15em]
							text-white/[0.12]
							hidden sm:block"
					>
						Scroll &darr;
					</span>
				</div>
			</div>
		</section>
	)
}
