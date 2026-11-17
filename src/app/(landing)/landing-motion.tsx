"use client"

import { useEffect, useRef, type ReactNode } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

/** Scroll choreography for Alpha's type, rolling mascot and photo collages. */
export default function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!root.current) return
    gsap.registerPlugin(ScrollTrigger)
    const media = gsap.matchMedia()
    const scenes = root.current.querySelectorAll<HTMLElement>(".alpha-benefit, .alpha-roles, .alpha-proof, .alpha-team, .alpha-closing")
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) (entry.target as HTMLElement).dataset.motionVisible = String(entry.isIntersecting)
    })
    scenes.forEach(scene => observer.observe(scene))

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        scenes.forEach(scene => {
          const heading = scene.querySelector("h2")
          const letters = heading?.querySelectorAll(".alpha-type-letter")
          if (letters?.length) gsap.from(letters, {
            yPercent: 115, rotation: index => index % 2 ? 14 : -14,
            scaleY: .7, opacity: 0, transformOrigin: "50% 100%",
            duration: .85, stagger: { amount: .35, from: "center" }, ease: "back.out(1.25)",
            scrollTrigger: { trigger: heading, start: "top 94%", toggleActions: "play none none reverse" },
          })
          else if (heading) gsap.from(heading, {
            y: 55, rotation: -3, opacity: 0, duration: .9, ease: "power3.out",
            scrollTrigger: { trigger: heading, start: "top 94%", once: true },
          })
        })

        gsap.to("#alpha-ribbon-curve", {
          attr: { d: "M-600 110C-200 210 100 10 500 110S1200 210 1600 110S2300 10 2700 110" }, ease: "none",
          scrollTrigger: { trigger: ".alpha-motion-ribbon", start: "top bottom", end: "bottom top", scrub: .7 },
        })
        gsap.fromTo(".alpha-motion-ribbon textPath", { attr: { startOffset: "-8%" } }, {
          attr: { startOffset: "-22%" }, ease: "none",
          scrollTrigger: { trigger: ".alpha-motion-ribbon", start: "top bottom", end: "bottom top", scrub: .7 },
        })
        gsap.utils.toArray<HTMLElement>(".alpha-benefit").forEach((scene, index) => {
          const art = scene.querySelector(".alpha-benefit-art")
          const wolf = scene.querySelector(".alpha-wolf-sticker")
          const snapshot = scene.querySelector(".alpha-scene-snapshot")
          const mainPhoto = scene.querySelector(".alpha-photo-frame")
          const enter = gsap.timeline({ scrollTrigger: { trigger: scene, start: "top 90%", end: "top 5%", scrub: .65 } })
          enter.fromTo(art, { y: 100, rotation: index % 2 ? 10 : -10, scale: .8 }, { y: 0, rotation: 0, scale: 1, ease: "power2.out" }, 0)
          enter.fromTo(wolf, { xPercent: index % 2 ? 65 : -65, rotation: index % 2 ? 65 : -65, scale: .6 }, { xPercent: 0, rotation: 0, scale: 1, ease: "power2.out" }, .05)
          enter.fromTo(snapshot, { yPercent: 40, rotation: -18 }, { yPercent: 0, rotation: 9, ease: "power2.out" }, .1)
          enter.fromTo(mainPhoto, { rotation: 12 }, { rotation: -3, ease: "none" }, 0)
        })
        gsap.utils.toArray<HTMLElement>(".alpha-role-panel").forEach((panel, index) => {
          gsap.from(panel, {
            xPercent: index ? -8 : 8, y: 100, rotation: index ? 12 : -12,
            transformOrigin: index ? "0% 100%" : "100% 100%", duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: ".alpha-role-panels", start: "top 90%", toggleActions: "play none none reverse" },
          })
        })
        gsap.from(".alpha-proof .alpha-hero-visual", {
          rotation: -7, scale: .85, y: 80, ease: "power2.out",
          scrollTrigger: { trigger: ".alpha-proof", start: "top 85%", end: "top 15%", scrub: .6 },
        })
        gsap.from(".alpha-closing-pack .alpha-pixel-wolf", {
          x: index => index ? 100 : -100, y: 80, rotation: index => index ? 35 : -35,
          scale: .5, duration: 1.1, stagger: .1, ease: "back.out(1.4)",
          scrollTrigger: { trigger: ".alpha-closing", start: "top 85%", toggleActions: "play none none reverse" },
        })
      }, root)
      return () => context.revert()
    })
    media.add("(min-width: 800px) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>(".alpha-benefit").forEach((scene, index) => {
          const words = scene.querySelectorAll("h2 > .alpha-type-word, h2 > em")
          gsap.fromTo(words, { xPercent: word => word ? 7 : -7 }, {
            xPercent: word => word ? -7 : 7, ease: "none",
            scrollTrigger: { trigger: scene, start: "top bottom", end: "bottom top", scrub: .8 },
          })
          gsap.to(scene.querySelector(".alpha-scene-snapshot"), {
            y: index % 2 ? -55 : 55, ease: "none",
            scrollTrigger: { trigger: scene, start: "top center", end: "bottom top", scrub: .7 },
          })
        })
      }, root)
      return () => context.revert()
    })
    return () => {
      observer.disconnect()
      media.revert()
      scenes.forEach(scene => delete scene.dataset.motionVisible)
    }
  }, [])
  return <div ref={root} className="alpha-story-motion">{children}</div>
}
