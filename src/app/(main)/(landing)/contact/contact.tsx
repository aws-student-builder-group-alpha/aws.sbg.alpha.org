"use client"

import { useEffect, useRef } from "react"
import { ArrowUpRight } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useMagnetic } from "@/hooks/use-magnetic"

gsap.registerPlugin(ScrollTrigger)

export default function Contact() {
	const sectionRef = useRef<HTMLElement>(null)
	const linkRef = useRef<HTMLAnchorElement>(null)

	useMagnetic(linkRef, 0.15)

	useEffect(() => {
		const ctx = gsap.context(() => {
			gsap.from(".contact-heading", {
				y: 60,
				opacity: 0,
				duration: 1,
				ease: "power3.out",
				scrollTrigger: {
					trigger: sectionRef.current,
					start: "top 75%",
				},
			})

			gsap.from(".contact-sub", {
				y: 30,
				opacity: 0,
				duration: 0.8,
				delay: 0.3,
				ease: "power3.out",
				scrollTrigger: {
					trigger: sectionRef.current,
					start: "top 75%",
				},
			})
		}, sectionRef)

		return () => ctx.revert()
	}, [])

	return (
		<section
			id="contact"
			ref={sectionRef}
			data-theme="dark"
			className="section-dark relative -mt-px px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
		>
			<div className="text-center max-w-4xl mx-auto">
				<a
					ref={linkRef}
					href="https://www.facebook.com/AWSStudentBuilderGroupAlpha"
					className="contact-heading group
						inline-block will-change-transform"
				>
					<h2
						className="text-3xl sm:text-5xl
							font-bold text-white
							leading-[1.1]
							group-hover:text-[#ff9900]
							transition-colors duration-500"
					>
						Let&apos;s Connect
						<ArrowUpRight
							aria-hidden="true"
							className="inline-block ml-2 size-6 sm:size-8
								opacity-40
								group-hover:opacity-100
								group-hover:translate-x-1
								group-hover:-translate-y-1
								transition-all duration-500"
						/>
					</h2>
				</a>
				<p
					className="contact-sub mt-3 text-sm text-white/70"
				>
					AWS Student Builder Group – Alpha on Facebook
				</p>
			</div>
		</section>
	)
}
