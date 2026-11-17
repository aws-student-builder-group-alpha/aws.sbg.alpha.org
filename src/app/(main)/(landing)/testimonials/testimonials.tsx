"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { AnimatePresence, motion } from "framer-motion"

gsap.registerPlugin(ScrollTrigger)

interface Testimonial {
	quote: string
	author: string
	role: string
	company: string
}

const TESTIMONIALS: Testimonial[] = [
	{
		quote:
			"Joining the club was the best decision! I've learned so much about cloud computing and the community has been incredibly supportive throughout my journey.",
		author: "Emmanuel Fabella",
		role: "Information Technology",
		company: "Rizal Technological University",
	},
	{
		quote:
			"Joining the club was a great decision! The hands-on projects and supportive community have been amazing. The community are incredibly knowledgeable and always willing to help us grow.",
		author: "Jogiofernesto Ardales",
		role: "Information Technology",
		company: "Rizal Technological University",
	},
	{
		quote:
			"I love the collaborative learning environment. The workshops are well-structured and the mentors are very approachable.",
		author: "David Aldreen Marquez",
		role: "Information Technology",
		company: "Rizal Technological University",
	},
]

export default function Testimonials() {
	const sectionRef = useRef<HTMLElement>(null)
	const [current, setCurrent] = useState(0)
	const [direction, setDirection] = useState(1)
	const intervalRef = useRef<ReturnType<typeof setInterval>>(null)

	const goTo = useCallback(
		(index: number) => {
			setDirection(index > current ? 1 : -1)
			setCurrent(index)
		},
		[current],
	)

	const next = useCallback(() => {
		setDirection(1)
		setCurrent((prev) =>
			prev === TESTIMONIALS.length - 1 ? 0 : prev + 1,
		)
	}, [])

	// Auto-advance
	useEffect(() => {
		intervalRef.current = setInterval(next, 6000)
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current)
			}
		}
	}, [next])

	// Pause on hover
	const pauseAutoAdvance = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current)
		}
	}, [])

	const resumeAutoAdvance = useCallback(() => {
		intervalRef.current = setInterval(next, 6000)
	}, [next])

	useEffect(() => {
		const ctx = gsap.context(() => {
			gsap.from(".testimonials-content", {
				y: 40,
				opacity: 0,
				duration: 0.8,
				ease: "power3.out",
				scrollTrigger: {
					trigger: sectionRef.current,
					start: "top 75%",
				},
			})
		}, sectionRef)

		return () => ctx.revert()
	}, [])

	const testimonial = TESTIMONIALS[current]

	const slideVariants = {
		enter: (d: number) => ({
			x: d > 0 ? 80 : -80,
			opacity: 0,
		}),
		center: { x: 0, opacity: 1 },
		exit: (d: number) => ({
			x: d > 0 ? -80 : 80,
			opacity: 0,
		}),
	}

	return (
		<section
			id="testimonials"
			ref={sectionRef}
			data-theme="light"
			className="overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
			onMouseEnter={pauseAutoAdvance}
			onMouseLeave={resumeAutoAdvance}
		>
			<div
				className="testimonials-content container
					mx-auto max-w-3xl text-center"
			>
				<span
					className="text-xs uppercase tracking-[0.3em]
						text-[#ff9900] font-medium mb-2 block"
				>
					Testimonials
				</span>
				<h2
					className="mb-5 text-2xl font-bold text-[#232f3e] sm:mb-7 sm:text-4xl"
				>
					Member Stories
				</h2>

				{/* Quote carousel */}
				<div className="relative grid min-h-48 place-items-center sm:min-h-40">
					{/* Decorative quote mark */}
					<div
						className="absolute top-0 left-1/2
							-translate-x-1/2 -translate-y-4
							urban-starblues text-[6rem]
							sm:text-[8rem] text-[#ff9900]/8
							select-none leading-none
							pointer-events-none"
					>
						&ldquo;
					</div>

					<AnimatePresence mode="wait" custom={direction}>
						<motion.div
							key={current}
							custom={direction}
							variants={slideVariants}
							initial="enter"
							animate="center"
							exit="exit"
							transition={{
								duration: 0.5,
								ease: [0.25, 1, 0.5, 1],
							}}
							className="relative flex flex-col items-center justify-center"
						>
							{/* Large quote */}
							<p
								className="text-base sm:text-xl lg:text-2xl
									text-[#232f3e]
									leading-relaxed mb-4
									font-light italic"
							>
								&ldquo;{testimonial.quote}&rdquo;
							</p>

							{/* Orange line */}
							<div
								className="w-8 h-0.5 bg-[#ff9900]
									mb-3"
							/>

							{/* Author */}
							<div>
								<p
									className="font-bold text-[#232f3e]
									text-base"
								>
									{testimonial.author}
								</p>
								<p
									className="text-sm text-[#232f3e]/50"
								>
									{testimonial.role}
									{" \u2014 "}
									<span className="text-[#ff9900]">
										{testimonial.company}
									</span>
								</p>
							</div>
						</motion.div>
					</AnimatePresence>
				</div>

				{/* Navigation — dots only */}
				<div
					className="flex items-center justify-center
						gap-3 mt-4"
				>
					{TESTIMONIALS.map((_, i) => (
						<button
							key={`testimonial-dot-${TESTIMONIALS[i].author}`}
							onClick={() => goTo(i)}
							className={`h-2 rounded-full
								transition-all duration-300
								${
									current === i
										? "w-8 bg-[#ff9900]"
										: "w-3 bg-[#232f3e]/15 hover:bg-[#232f3e]/30"
								}`}
							aria-label={`Go to testimonial ${i + 1}`}
						/>
					))}
				</div>
			</div>
		</section>
	)
}
