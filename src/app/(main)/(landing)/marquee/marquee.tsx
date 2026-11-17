"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const PRIMARY_ITEMS = [
	"AWS Student Builder Group - Alpha",
	"Cloud Computing",
	"Day One Mentality",
	"Build & Learn",
	"Innovation",
	"Community",
	"RTU",
	"Certifications",
	"Workshops",
]

const SECONDARY_ITEMS = [
	"Serverless",
	"Cloud Architecture",
	"Student Leaders",
	"EC2",
	"Lambda",
	"Hands-On Labs",
	"S3",
	"DevOps",
	"Networking",
	"AI & Machine Learning",
	"Security",
	"Solutions Architect",
]

function MarqueeRow({
	items: sourceItems,
	direction,
	distance,
	className,
}: {
	items: string[]
	direction: "left" | "right"
	distance: number
	className?: string
}) {
	const rowRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const el = rowRef.current
		if (!el) return

		const shift = direction === "left"
			? -distance
			: distance

		const ctx = gsap.context(() => {
			gsap.to(el, {
				x: shift,
				ease: "none",
				scrollTrigger: {
					trigger: el.closest("section"),
					start: "top bottom",
					end: "bottom top",
					scrub: 0.3,
				},
			})
		})

		return () => ctx.revert()
	}, [direction, distance])

	const items = Array.from(
		{ length: 10 },
		() => sourceItems,
	).flat()

	const offset = direction === "right"
		? `-${distance}px`
		: undefined

	return (
		<div className="overflow-hidden">
			<div
				ref={rowRef}
				className={`flex whitespace-nowrap ${className}`}
				style={offset
					? { marginLeft: offset }
					: undefined
				}
			>
				{items.map((item, i) => (
					<span
						key={`${item}-${i}`}
						className="flex items-center
							gap-6 px-6"
					>
						<span
							className="text-3xl sm:text-4xl
								lg:text-5xl font-black
								uppercase tracking-tight"
						>
							{item}
						</span>
						<span
							className="w-3 h-3 rounded-full
								bg-[#ff9900] shrink-0"
						/>
					</span>
				))}
			</div>
		</div>
	)
}

export default function Marquee() {
	const sectionRef = useRef<HTMLElement>(null)

	useEffect(() => {
		const ctx = gsap.context(() => {
			gsap.from(sectionRef.current, {
				opacity: 0,
				duration: 0.8,
				scrollTrigger: {
					trigger: sectionRef.current,
					start: "top 90%",
				},
			})
		}, sectionRef)

		return () => ctx.revert()
	}, [])

	return (
		<section
			ref={sectionRef}
			data-theme="dark"
			className="section-dark py-10 sm:py-14 lg:py-16
				overflow-hidden select-none"
		>
			<MarqueeRow
				items={PRIMARY_ITEMS}
				direction="left"
				distance={600}
				className="text-white/90 mb-4"
			/>
			<MarqueeRow
				items={SECONDARY_ITEMS}
				direction="right"
				distance={600}
				className="text-white/30"
			/>
		</section>
	)
}
