"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

interface VisionItem {
	id: string
	label: string
	number: string
	quote: string
}

const VISION_ITEMS: VisionItem[] = [
	{
		id: "vision",
		label: "Vision",
		number: "01",
		quote:
			"As a non-academic organization, we envision a long-standing community of passionate learners from universities across the country who embrace innovation and leverage AWS to drive technological advancements.",
	},
	{
		id: "mission",
		label: "Mission",
		number: "02",
		quote:
			"We empower students with AWS skills through inclusive educational initiatives, community service, and networking opportunities to thrive in the digital economy and contribute to industry transformation.",
	},
	{
		id: "values",
		label: "Values",
		number: "03",
		quote:
			"Collaboration, continuous learning, innovation, and inclusivity guide everything we do. We believe that every student deserves access to world-class cloud education.",
	},
]

export default function CoreVision() {
	const sectionRef = useRef<HTMLElement>(null)
	const pinContainerRef = useRef<HTMLDivElement>(null)
	const [activeIndex, setActiveIndex] = useState(0)
	const [isMobile, setIsMobile] = useState(false)

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 1024)
		}
		checkMobile()
		window.addEventListener("resize", checkMobile)
		return () =>
			window.removeEventListener("resize", checkMobile)
	}, [])

	// Desktop: pinned scroll crossfade
	useEffect(() => {
		if (isMobile) return
		if (!pinContainerRef.current) return

		const ctx = gsap.context(() => {
			const totalItems = VISION_ITEMS.length
			const scrollPerItem = window.innerHeight

			ScrollTrigger.create({
				trigger: sectionRef.current,
				start: "top top",
				end: () =>
					`+=${scrollPerItem * (totalItems - 1)}`,
				pin: pinContainerRef.current,
				scrub: 0.5,
				onUpdate: (self) => {
					const progress = self.progress
					const idx = Math.min(
						Math.floor(progress * totalItems),
						totalItems - 1,
					)
					setActiveIndex(idx)
				},
			})
		}, sectionRef)

		return () => ctx.revert()
	}, [isMobile])

	// Mobile: simple scroll-triggered fade for each item
	useEffect(() => {
		if (!isMobile) return

		const ctx = gsap.context(() => {
			const items =
				sectionRef.current?.querySelectorAll(
					".vision-mobile-item",
				) || []

			for (const item of items) {
				gsap.from(item, {
					y: 40,
					opacity: 0,
					duration: 0.8,
					ease: "power3.out",
					scrollTrigger: {
						trigger: item,
						start: "top 85%",
						toggleActions:
							"play none none reverse",
					},
				})
			}
		}, sectionRef)

		return () => ctx.revert()
	}, [isMobile])

	const active = VISION_ITEMS[activeIndex]

	return (
		<section
			id="vision"
			ref={sectionRef}
			data-theme="dark"
			className="section-dark overflow-hidden"
		>
			{/* Desktop: Pinned crossfade */}
			<div
				ref={pinContainerRef}
				className="hidden lg:block"
			>
				<div className="min-h-screen flex items-center">
					<div
						className="container mx-auto max-w-6xl
							px-4 sm:px-6 lg:px-8"
					>
						<div
							className="grid grid-cols-2 gap-20
								items-center"
						>
							{/* Left: Text content */}
							<div>
								<span
									className="text-xs uppercase
										tracking-[0.3em] text-[#ff9900]
										font-medium mb-6 block"
								>
									What Drives Us
								</span>

								{/* Progress indicator */}
								<div
									className="flex items-center gap-3
										mb-10"
								>
									<span
										className="text-sm font-medium
											text-white/40"
									>
										{active.number}
									</span>
									<div
										className="flex-1 h-px
											bg-white/10 max-w-[100px]"
									>
										<div
											className="h-full bg-[#ff9900]
												transition-all duration-500"
											style={{
												width: `${((activeIndex + 1) / VISION_ITEMS.length) * 100}%`,
											}}
										/>
									</div>
									<span
										className="text-sm font-medium
											text-white/40"
									>
										{`0${VISION_ITEMS.length}`}
									</span>
								</div>

								{/* Label */}
								<h3
									className="urban-starblues text-3xl
										sm:text-4xl text-[#ff9900]
										mb-8 transition-all duration-500"
								>
									{active.label}
								</h3>

								{/* Quote */}
								<p
									className="text-xl sm:text-2xl
										lg:text-3xl text-white/80
										leading-relaxed
										transition-all duration-500"
								>
									&ldquo;{active.quote}&rdquo;
								</p>

								{/* Navigation dots */}
								<div className="flex gap-3 mt-10">
									{VISION_ITEMS.map((_, i) => (
										<div
											key={`dot-${VISION_ITEMS[i].id}`}
											className={`h-2 rounded-full
												transition-all duration-300
												${
													activeIndex === i
														? "w-8 bg-[#ff9900]"
														: "w-2 bg-white/20"
												}`}
										/>
									))}
								</div>
							</div>

							{/* Right: Banner image */}
							<div className="relative">
								<div
									className="relative rounded-2xl
										overflow-hidden aspect-[4/3]"
								>
									<Image
										src="/optimized/banner.webp"
										alt="It&apos;s Always Day One Banner"
										fill
										className="object-cover"
									/>
									<div
										className="absolute inset-0
											bg-gradient-to-t
											from-[#232f3e]/60
											to-transparent"
									/>
								</div>
								{/* Decorative elements */}
								<div
									className="absolute -bottom-4 -right-4
										w-24 h-24 border-2
										border-[#ff9900]/20 rounded-2xl
										-z-10"
								/>
								<div
									className="absolute -top-4 -left-4
										w-16 h-16 border border-white/10
										rounded-xl -z-10"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Mobile: Vertical stack */}
			<div className="lg:hidden section-padding px-4 sm:px-6">
				<div className="container mx-auto max-w-6xl">
					<span
						className="text-xs uppercase
							tracking-[0.3em] text-[#ff9900]
							font-medium mb-6 block"
					>
						What Drives Us
					</span>

					<div className="space-y-16">
						{VISION_ITEMS.map((item) => (
							<div
								key={item.id}
								className="vision-mobile-item"
							>
								<div
									className="flex items-center
										gap-3 mb-4"
								>
									<span
										className="text-xs uppercase
											tracking-[0.2em]
											text-[#ff9900]
											font-medium"
									>
										{item.number}
									</span>
									<div
										className="h-px flex-1
											bg-white/10 max-w-[60px]"
									/>
								</div>
								<h3
									className="urban-starblues text-2xl
										sm:text-3xl text-[#ff9900]
										mb-4"
								>
									{item.label}
								</h3>
								<p
									className="text-base sm:text-lg
										text-white/70 leading-relaxed"
								>
									&ldquo;{item.quote}&rdquo;
								</p>
							</div>
						))}
					</div>

					{/* Banner image on mobile */}
					<div
						className="mt-12 rounded-2xl overflow-hidden
							vision-mobile-item"
					>
						<Image
							src="/optimized/banner.webp"
							alt="It&apos;s Always Day One Banner"
							width={800}
							height={400}
							className="w-full h-auto"
						/>
					</div>
				</div>
			</div>
		</section>
	)
}
