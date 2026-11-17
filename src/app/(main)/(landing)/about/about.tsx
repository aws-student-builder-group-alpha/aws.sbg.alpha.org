"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

interface Feature {
	number: string
	title: string
	description: string
	align: "left" | "right" | "full"
	dark?: boolean
}

const FEATURES: Feature[] = [
	{
		number: "01",
		title: "Hands-On Learning",
		description:
			"Learn by doing with real AWS services and practical projects that build your portfolio. From EC2 to Lambda, get your hands dirty with the cloud.",
		align: "left",
	},
	{
		number: "02",
		title: "Community Driven",
		description:
			"Connect with fellow learners, share knowledge, and grow together in a supportive environment that values collaboration over competition.",
		align: "right",
	},
	{
		number: "03",
		title: "Career Growth",
		description:
			"Gain industry-relevant skills and AWS certifications to accelerate your tech career. Our members go on to land cloud engineering roles at top companies.",
		align: "full",
		dark: true,
	},
	{
		number: "04",
		title: "Expert Guidance",
		description:
			"Learn from experienced mentors and AWS-certified professionals who guide your journey through the cloud ecosystem.",
		align: "left",
	},
]

function FeatureBlock({ feature }: { feature: Feature }) {
 const position = Number(feature.number) - 1
 const photos = ["scd-2026-team", "scd-2026-audience", "scd-2026-certificates", "scd-2026-team"]
 return <article className="about-feature grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">
  <div className={position % 2 ? "lg:order-2" : ""}>
   <p className="mb-4 text-sm font-semibold tracking-widest text-[#965500]">{feature.number}</p>
   <h3 className="mb-4 text-3xl font-semibold text-[#232f3e]">{feature.title}</h3>
   <p className="max-w-lg text-base leading-relaxed text-[#526174]">{feature.description}</p>
  </div>
  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl"><Image src={"/optimized/gallery/full/" + photos[position] + ".webp"} alt={feature.title + " with the Alpha community"} fill sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" /></div>
 </article>
}

export default function About() {
	const sectionRef = useRef<HTMLElement>(null)

	useEffect(() => {
		const ctx = gsap.context(() => {
			const features =
				sectionRef.current?.querySelectorAll(
					".about-feature",
				) || []

			for (const feature of features) {
				gsap.from(feature, {
					y: 60,
					opacity: 0,
					duration: 0.8,
					ease: "power3.out",
					scrollTrigger: {
						trigger: feature,
						start: "top 85%",
						toggleActions:
							"play none none none",
					},
				})
			}
		}, sectionRef)

		return () => ctx.revert()
	}, [])

	return (
		<section
			id="about"
			ref={sectionRef}
			data-theme="light"
			className="section-padding px-4 sm:px-6 lg:px-8"
		>
			<div className="container mx-auto max-w-6xl">
				{/* Section header — asymmetric */}
				<div
					className="grid grid-cols-1 lg:grid-cols-2
						gap-6 mb-20 lg:mb-32"
				>
					<div>
						<span
							className="text-xs uppercase tracking-[0.3em]
								text-[#ff9900] font-medium mb-4 block"
						>
							About Us
						</span>
						<h2
							className="text-3xl sm:text-4xl lg:text-6xl
								font-bold text-[#232f3e] leading-tight"
						>
							Why join
							<br />
							our group?
						</h2>
					</div>
					<div className="flex items-end">
						<p
							className="text-base sm:text-lg
								text-[#232f3e]/50 leading-relaxed
								max-w-md lg:ml-auto"
						>
							We&apos;re building a community of cloud
							enthusiasts who learn by doing, support
							each other, and push the boundaries of
							what students can achieve.
						</p>
					</div>
				</div>

				{/* Features — staggered layout */}
				<div className="space-y-20 lg:space-y-32">
					{FEATURES.map((feature) => (
						<FeatureBlock
							key={feature.number}
							feature={feature}
						/>
					))}
				</div>
			</div>
		</section>
	)
}
