"use client"

import { useRef, useEffect } from "react"
import Image from "next/image"
import { Calendar, MapPin, Clock, ArrowRight } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import EventHighlights from '@/components/event-highlights'
import { getTopUpcomingEvents, formatEventDate } from "@/data/events"

gsap.registerPlugin(ScrollTrigger)

export default function Events() {
	const sectionRef = useRef<HTMLElement>(null)
	const upcoming = getTopUpcomingEvents(3)

	useEffect(() => {
		const ctx = gsap.context(() => {
			const items =
				sectionRef.current?.querySelectorAll(
					".event-item",
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

			// Mobile fallback
			const fallback = setTimeout(() => {
				gsap.set(".event-item", {
					clearProps: "y,opacity",
				})
			}, 3000)

			return () => clearTimeout(fallback)
		}, sectionRef)

		return () => ctx.revert()
	}, [])

	return (
		<section
			id="events"
			ref={sectionRef}
			data-theme="light"
			className="section-padding px-4 sm:px-6 lg:px-8"
		>
			<div className="container mx-auto max-w-6xl">
				<h2 className="sr-only">Community events and highlights</h2>

				{upcoming.length > 0 ? (
					<div className="space-y-0">
						{upcoming.map((event, i) => (
							<div
								key={event.id}
								className="event-item group"
							>
								{/* Divider line */}
								{i === 0 && (
									<div
										className="h-px bg-[#232f3e]/10
											mb-0"
									/>
								)}
								<div
									className="grid grid-cols-1
										lg:grid-cols-12 gap-6 lg:gap-12
										py-10 lg:py-16 items-center"
								>
									{/* Number */}
									<div className="lg:col-span-1">
										<span
											className="text-xs uppercase
												tracking-[0.2em]
												text-[#ff9900]
												font-medium"
										>
											{`0${i + 1}`}
										</span>
									</div>

									{/* Image */}
									<div
										className="lg:col-span-4
											relative rounded-xl
											overflow-hidden h-48
											sm:h-56 lg:h-64"
									>
										<Image
											src={event.image}
											alt={event.title}
											fill
											className="object-cover
												group-hover:scale-105
												transition-transform
												duration-700"
										/>
										<div
											className="absolute inset-0
												bg-gradient-to-t
												from-black/30
												to-transparent"
										/>
										<div
											className="absolute top-3
												left-3"
										>
											<span
												className="inline-block
													bg-[#ff9900]
													text-white text-xs
													font-medium px-3
													py-1 rounded-full"
											>
												{event.type}
											</span>
										</div>
									</div>

									{/* Content */}
									<div className="lg:col-span-5">
										<h3
											className="text-xl sm:text-2xl
												lg:text-3xl font-bold
												text-[#232f3e]
												group-hover:text-[#ff9900]
												transition-colors
												duration-300 mb-4"
										>
											{event.title}
										</h3>
										<div
											className="space-y-2 text-sm
												text-[#232f3e]/50"
										>
											<div
												className="flex items-center
													gap-2"
											>
												<Calendar
													size={15}
													className="text-[#ff9900]
														shrink-0"
												/>
												<span>
													{formatEventDate(
														event.date,
													)}
												</span>
											</div>
											<div
												className="flex items-center
													gap-2"
											>
												<Clock
													size={15}
													className="text-[#ff9900]
														shrink-0"
												/>
												<span>
													{event.time}
												</span>
											</div>
											<div
												className="flex items-center
													gap-2"
											>
												<MapPin
													size={15}
													className="text-[#ff9900]
														shrink-0"
												/>
												<span>
													{event.location}
												</span>
											</div>
										</div>
									</div>

									{/* CTA */}
									<div
										className="lg:col-span-2
											flex lg:justify-end"
									>
										{event.registrationLink && (
											<a
												href={
													event.registrationLink
												}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex
													items-center gap-2
													bg-[#ff9900]
													text-white
													font-semibold
													text-sm px-6 py-3
													rounded-full
													hover:bg-[#ec8800]
													transition-colors"
											>
												Register
												<ArrowRight
													size={14}
												/>
											</a>
										)}
									</div>
								</div>
								<div
									className="h-px bg-[#232f3e]/10"
								/>
							</div>
						))}
					</div>
				) : (
					<EventHighlights />
				)}
				{upcoming.length > 0 && <div className="mt-16"><h3 className="mb-8 text-2xl font-semibold text-[#232f3e]">Past highlights</h3><EventHighlights /></div>}
			</div>
		</section>
	)
}
