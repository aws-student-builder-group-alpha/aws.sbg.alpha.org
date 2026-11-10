"use client"

import { useEffect, useRef } from "react"
import Lenis from "lenis"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { usePathname } from "next/navigation"

gsap.registerPlugin(ScrollTrigger)

interface SmoothScrollProps {
	children: React.ReactNode
}

export default function SmoothScroll({
	children,
}: SmoothScrollProps) {
	const lenisRef = useRef<Lenis | null>(null)
	const pathname = usePathname()

	useEffect(() => {
		let hash = window.location.hash
		let interrupted = false
		let frame = 0
		const align = () => {
			if (interrupted || !hash || window.location.hash !== hash) return
			let id: string
			try { id = decodeURIComponent(hash.slice(1)) } catch { return }
			const target = document.getElementById(id)
			if (!target) return
			const pin = ScrollTrigger.getAll().find(trigger => trigger.trigger === target && trigger.pin)
			const header = document.querySelector('nav[aria-label="Main navigation"]')
			const offset = (header?.getBoundingClientRect().height || 0) + 16
			const top = Math.max(0, (pin ? pin.start : window.scrollY + target.getBoundingClientRect().top) - offset)
			if (Math.abs(window.scrollY - top) < 2) return
			if (lenisRef.current) {
				lenisRef.current.resize()
				lenisRef.current.scrollTo(top, { immediate: true, force: true })
			} else window.scrollTo({ top, behavior: "instant" })
		}
		const queue = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(align) }
		const changeHash = () => { hash = window.location.hash; interrupted = false; queue() }
		const interrupt = () => { interrupted = true }
		ScrollTrigger.addEventListener("refresh", queue)
		window.addEventListener("hashchange", changeHash)
		for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) window.addEventListener(event, interrupt, { passive: true })
		queue()
		let active = true
		void document.fonts.ready.then(() => { if (active) queue() })
		return () => {
			active = false
			cancelAnimationFrame(frame)
			ScrollTrigger.removeEventListener("refresh", queue)
			window.removeEventListener("hashchange", changeHash)
			for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) window.removeEventListener(event, interrupt)
		}
	}, [pathname])

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
