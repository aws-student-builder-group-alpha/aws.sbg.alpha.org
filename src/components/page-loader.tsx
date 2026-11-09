"use client"

import { useState, useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import gsap from "gsap"

export default function PageLoader() {
	const [isLoading, setIsLoading] = useState(true)
	const loaderRef = useRef<HTMLDivElement>(null)
	const barRef = useRef<HTMLDivElement>(null)
	const textRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!loaderRef.current) return
		let seenIntro = false
		try {
			seenIntro = sessionStorage.getItem("alpha-intro-shown") === "1"
			sessionStorage.setItem("alpha-intro-shown", "1")
		} catch { /* A blocked storage API must not prevent the page from opening. */ }
		if (seenIntro || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			gsap.set(loaderRef.current, { autoAlpha: 0, pointerEvents: "none" })
			setIsLoading(false)
			return
		}

		const tl = gsap.timeline({
			onComplete: () => setIsLoading(false),
		})

		tl.fromTo(
			textRef.current,
			{ y: 30, opacity: 0 },
			{
				y: 0,
				opacity: 1,
				duration: 0.3,
				ease: "power3.out",
			},
		)
			.fromTo(
				barRef.current,
				{ scaleX: 0 },
				{
					scaleX: 1,
					duration: 0.5,
					ease: "power2.inOut",
				},
				"-=0.1",
			)
			.to(loaderRef.current, {
				yPercent: -100,
				duration: 0.6,
				ease: "power4.inOut",
			})
		return () => { tl.kill() }
	}, [])

	return (
		<AnimatePresence>
			{isLoading && (
				<motion.div
					ref={loaderRef}
					aria-hidden="true"
					className="fixed inset-0 z-[10000] flex
						flex-col items-center justify-center
						bg-[#232f3e]"
					exit={{ opacity: 0 }}
					transition={{ duration: 0.3 }}
				>
					<div
						ref={textRef}
						className="urban-starblues text-white
							text-3xl sm:text-5xl opacity-0"
					>
						AWS Student Builder Group - Alpha
					</div>
					<div className="mt-6 w-48 h-[2px] bg-white/20
						rounded-full overflow-hidden">
						<div
							ref={barRef}
							className="h-full bg-[#ff9900] origin-left"
							style={{ transform: "scaleX(0)" }}
						/>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
