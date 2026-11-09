"use client"

import { useEffect, useRef } from "react"
import Lenis from "lenis"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

interface SmoothScrollProps {
	children: React.ReactNode
}

export default function SmoothScroll({
	children,
}: SmoothScrollProps) {
	const lenisRef = useRef<Lenis | null>(null)

	useEffect(() => {
		const prefersReducedMotion =
			window.matchMedia(
				'(prefers-reduced-motion: reduce)',
			).matches

		if (prefersReducedMotion || window.matchMedia('(pointer: coarse)').matches) return

		const lenis = new Lenis({
			duration: 0.75,
			easing: (t: number) =>
				Math.min(1, 1.001 - Math.pow(2, -10 * t)),
			touchMultiplier: 1.5,
		})
		lenisRef.current = lenis

		lenis.on('scroll', ScrollTrigger.update)

		const update = (time: number) => {
			lenis.raf(time * 1000)
		}
		gsap.ticker.add(update)
		gsap.ticker.lagSmoothing(0)

		return () => {
			lenis.off('scroll', ScrollTrigger.update)
			gsap.ticker.remove(update)
			lenis.destroy()
			lenisRef.current = null
		}
	}, [])

	return <>{children}</>
}
